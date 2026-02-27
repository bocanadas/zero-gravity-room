import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon-es";
import officeDeskModelUrl from "./models/office_table_desk.glb?url";

// Create a scene as the container for everything we render.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

// Set up camera so we can see floor + cube with some depth.
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(4, 4, 6);
camera.lookAt(0, 1, 0);

// Renderer draws the scene into a canvas attached to the page.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls lets you inspect the room from different angles while building.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
// Keep interaction inside a comfortable range.
controls.minDistance = 2;
controls.maxDistance = 12;
// Prevent orbiting below the horizon, which would place camera under the floor.
controls.maxPolarAngle = Math.PI / 2;

// Cannon world handles gravity and collisions (physics source of truth).
const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
});
const roomSize = 12;
const roomHeight = 8;
const roomHalfSize = roomSize / 2;

// Balanced light setup: ambient softens shadows, directional gives shape.
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 8, 3);
scene.add(sun);

// Floor plane rotated flat so the cube appears to rest on it.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), new THREE.MeshStandardMaterial({ color: 0xffffff }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
// Simple blank white room shell (rendered from inside faces).
const room = new THREE.Mesh(
    new THREE.BoxGeometry(roomSize, roomHeight, roomSize),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, side: THREE.BackSide })
);
room.position.y = roomHeight / 2;
scene.add(room);

// Matching static physics plane.
const floorBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
physicsWorld.addBody(floorBody);

// Static walls + ceiling so objects cannot leave the room.
const rightWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
rightWallBody.position.set(roomHalfSize, 0, 0);
rightWallBody.quaternion.setFromEuler(0, -Math.PI / 2, 0);
physicsWorld.addBody(rightWallBody);

const leftWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
leftWallBody.position.set(-roomHalfSize, 0, 0);
leftWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
physicsWorld.addBody(leftWallBody);

const backWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
backWallBody.position.set(0, 0, -roomHalfSize);
physicsWorld.addBody(backWallBody);

const frontWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
frontWallBody.position.set(0, 0, roomHalfSize);
frontWallBody.quaternion.setFromEuler(0, Math.PI, 0);
physicsWorld.addBody(frontWallBody);

const ceilingBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
ceilingBody.position.set(0, roomHeight, 0);
ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
physicsWorld.addBody(ceilingBody);

// One starter cube for the room.
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
cube.position.y = 4;
scene.add(cube);

// Matching dynamic physics body; same size as Three box (half-extents = 0.5).
const cubePhysicsBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
    position: new CANNON.Vec3(0, 4, 0),
});
physicsWorld.addBody(cubePhysicsBody);
const movablePhysicsBodies = [cubePhysicsBody];
const gltfLoader = new GLTFLoader();
const modelPhysicsPairs = [];
const draggableTargets = [cube];
let activeDragItem = null;
const dragWallPadding = 0.05;
let hoveredDraggableRoot = null;
let activeDraggedRoot = null;
let outlinedRoot = null;
let outlineHelper = null;

// Add more office items here. Each object in this array becomes one loaded model.
const officeItems = [
    {
        modelUrl: officeDeskModelUrl,
        position: new THREE.Vector3(0, 0, -2.5),
        scale: 1,
        mass: 1, // 0 = static furniture, >0 = movable physics object.
    },
];

// loads a .glb and gives it a simple box physics body.
function loadModelWithBoxPhysics(itemConfig) {
    const {
        modelUrl,
        position = new THREE.Vector3(),
        scale = 1,
        mass = 0,
    } = itemConfig;

    gltfLoader.load(
        modelUrl,
        (gltf) => {
            const model = gltf.scene;
            model.position.copy(position);
            model.scale.setScalar(scale);
            scene.add(model);

            // Build a box around the model to use as a simple physics collider.
            const bounds = new THREE.Box3().setFromObject(model);
            if (bounds.min.y < 0) {
                const liftAmount = -bounds.min.y;
                model.position.y += liftAmount;
                bounds.translate(new THREE.Vector3(0, liftAmount, 0));
            }

            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            bounds.getSize(size);
            bounds.getCenter(center);

            const halfExtents = new CANNON.Vec3(
                Math.max(size.x * 0.5, 0.05),
                Math.max(size.y * 0.5, 0.05),
                Math.max(size.z * 0.5, 0.05)
            );
            const modelPhysicsBody = new CANNON.Body({
                mass,
                shape: new CANNON.Box(halfExtents),
                position: new CANNON.Vec3(center.x, center.y, center.z),
            });
            physicsWorld.addBody(modelPhysicsBody);

            // Dynamic model bodies need render sync each frame.
            if (mass > 0) {
                const modelAnchor = new THREE.Group();
                modelAnchor.position.copy(center);
                model.position.sub(center);
                modelAnchor.add(model);
                scene.add(modelAnchor);
                scene.remove(model);

                modelAnchor.userData.dragItem = {
                    body: modelPhysicsBody,
                    dragBounds: createDragBounds(
                        Math.max(size.x * 0.5, 0.05),
                        Math.max(size.y * 0.5, 0.05),
                        Math.max(size.z * 0.5, 0.05)
                    ),
                };
                draggableTargets.push(modelAnchor);
                modelPhysicsPairs.push({ model: modelAnchor, body: modelPhysicsBody });
                movablePhysicsBodies.push(modelPhysicsBody);
            }
        },
        undefined,
        (error) => console.error("Failed to load .glb model:", error)
    );
}
for (const item of officeItems) {
    loadModelWithBoxPhysics(item);
}

// Raycasting state: convert mouse position into a 3D ray for picking objects.
const raycaster = new THREE.Raycaster();
const pointerScreen = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragHitPoint = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
let isDraggingCube = false;

// Keep a short movement history so mouse release can create a throw velocity.
const recentDragPoints = [];
const maxRecentDragPoints = 6;

const gravityText = document.getElementById("gravityText");
const gravityIndicator = document.getElementById("gravityIndicator");

function createDragBounds(halfX, halfY, halfZ) {
    return {
        minX: -roomHalfSize + halfX + dragWallPadding,
        maxX: roomHalfSize - halfX - dragWallPadding,
        minY: halfY,
        maxY: roomHeight - halfY - dragWallPadding,
        minZ: -roomHalfSize + halfZ + dragWallPadding,
        maxZ: roomHalfSize - halfZ - dragWallPadding,
    };
}

function clampToRange(value, minValue, maxValue) {
    if (minValue > maxValue) return (minValue + maxValue) * 0.5;
    return THREE.MathUtils.clamp(value, minValue, maxValue);
}

function updatePointerScreen(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    // Convert mouse pixels to the -1..1 range that raycaster.setFromCamera expects.
    pointerScreen.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerScreen.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function recordDragPoint(point) {
    recentDragPoints.push({ point: point.clone(), time: performance.now() });
    if (recentDragPoints.length > maxRecentDragPoints) recentDragPoints.shift();
}

function calculateThrowVelocity() {
    if (recentDragPoints.length < 2) return new CANNON.Vec3(0, 0, 0);
    const first = recentDragPoints[0];
    const last = recentDragPoints[recentDragPoints.length - 1];
    const elapsedSeconds = (last.time - first.time) / 1000;
    if (elapsedSeconds <= 0) return new CANNON.Vec3(0, 0, 0);
    const velocity = last.point.clone().sub(first.point).multiplyScalar(1 / elapsedSeconds);
    return new CANNON.Vec3(velocity.x, velocity.y, velocity.z);
}

cube.userData.dragItem = {
    body: cubePhysicsBody,
    dragBounds: createDragBounds(0.5, 0.5, 0.5),
};

function getDragItemFromHitObject(object) {
    let current = object;
    while (current) {
        if (current.userData?.dragItem) return current.userData.dragItem;
        current = current.parent;
    }
    return null;
}

function findDraggableRoot(object) {
    let current = object;
    while (current) {
        if (draggableTargets.includes(current)) return current;
        current = current.parent;
    }
    return null;
}

function setOutlineRoot(draggableRoot) {
    if (draggableRoot === outlinedRoot) return;
    outlinedRoot = draggableRoot;

    if (outlineHelper) {
        scene.remove(outlineHelper);
        outlineHelper = null;
    }
    if (!outlinedRoot) return;

    outlineHelper = new THREE.BoxHelper(outlinedRoot, 0x60a5fa);
    scene.add(outlineHelper);
}

function updateOutlinePerFrame() {
    if (outlineHelper) {
        outlineHelper.update();
    }
}

function refreshOutlineTarget() {
    const targetRoot = activeDraggedRoot || hoveredDraggableRoot;
    setOutlineRoot(targetRoot);
}

function clearHoverState() {
    hoveredDraggableRoot = null;
    if (!isDraggingCube) {
        refreshOutlineTarget();
    }
}

function updateHoveredObject() {
    if (isDraggingCube) return;
    raycaster.setFromCamera(pointerScreen, camera);
    const hit = raycaster.intersectObjects(draggableTargets, true)[0];
    const newHoveredRoot = hit ? findDraggableRoot(hit.object) : null;
    if (newHoveredRoot === hoveredDraggableRoot) return;
    hoveredDraggableRoot = newHoveredRoot;
    refreshOutlineTarget();
}

window.addEventListener("pointermove", (event) => {
    if (isDraggingCube) return;
    const hoveredElement = document.elementFromPoint(event.clientX, event.clientY);
    if (hoveredElement !== renderer.domElement) {
        clearHoverState();
    }
});

function updateGravityHud() {
    if (!gravityText || !gravityIndicator) return;
    gravityText.textContent = `Gravity: ${isGravityOn ? "ON" : "OFF"}`;
    gravityIndicator.classList.toggle("status-light-on", isGravityOn);
    gravityIndicator.classList.toggle("status-light-off", !isGravityOn);
}

renderer.domElement.addEventListener("pointerdown", (event) => {
    updatePointerScreen(event);
    raycaster.setFromCamera(pointerScreen, camera);
    const hit = raycaster.intersectObjects(draggableTargets, true)[0];
    if (!hit) return;
    const hitDragItem = getDragItemFromHitObject(hit.object);
    if (!hitDragItem) return;

    isDraggingCube = true;
    activeDraggedRoot = findDraggableRoot(hit.object);
    activeDragItem = hitDragItem;
    refreshOutlineTarget();
    controls.enabled = false;
    activeDragItem.body.type = CANNON.Body.KINEMATIC;
    activeDragItem.body.velocity.set(0, 0, 0);
    activeDragItem.body.angularVelocity.set(0, 0, 0);
    activeDragItem.body.wakeUp();

    camera.getWorldDirection(cameraForward);
    dragPlane.setFromNormalAndCoplanarPoint(cameraForward, hit.point);
    recentDragPoints.length = 0;
    recordDragPoint(hit.point);
});

renderer.domElement.addEventListener("pointermove", (event) => {
    updatePointerScreen(event);
    updateHoveredObject();
});

window.addEventListener("pointerup", () => {
    if (!isDraggingCube) return;
    isDraggingCube = false;
    controls.enabled = true;
    activeDragItem.body.type = CANNON.Body.DYNAMIC;
    activeDragItem.body.wakeUp();
    const throwVelocity = calculateThrowVelocity();
    activeDragItem.body.velocity.set(throwVelocity.x * 0.6, throwVelocity.y * 0.6, throwVelocity.z * 0.6);
    activeDragItem = null;
    activeDraggedRoot = null;
    updateHoveredObject();
    refreshOutlineTarget();
});

renderer.domElement.addEventListener("pointerleave", clearHoverState);
window.addEventListener("blur", clearHoverState);

// Toggle gravity with Space: normal fall <-> zero gravity drift.
let isGravityOn = true;
updateGravityHud();
window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    event.preventDefault();

    isGravityOn = !isGravityOn;
    physicsWorld.gravity.set(0, isGravityOn ? -9.8 : 0, 0);
    updateGravityHud();

    // On zero-g, add a small random impulse so objects gently drift.
    if (!isGravityOn) {
        for (const body of movablePhysicsBodies) {
            const impulse = new CANNON.Vec3(
                (Math.random() - 0.5) * 0.6,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.6
            );
            body.applyImpulse(impulse, body.position);
        }
    }
});

// Use browser time for frame delta (avoids deprecated THREE.Clock API).
let lastFrameTimestamp = performance.now();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
    // While dragging, move the kinematic body to the mouse ray intersection.
    if (isDraggingCube && activeDragItem) {
        raycaster.setFromCamera(pointerScreen, camera);
        if (raycaster.ray.intersectPlane(dragPlane, dragHitPoint)) {
            const { dragBounds } = activeDragItem;
            const clampedX = clampToRange(dragHitPoint.x, dragBounds.minX, dragBounds.maxX);
            const clampedY = clampToRange(dragHitPoint.y, dragBounds.minY, dragBounds.maxY);
            const clampedZ = clampToRange(dragHitPoint.z, dragBounds.minZ, dragBounds.maxZ);
            activeDragItem.body.position.set(clampedX, clampedY, clampedZ);
            activeDragItem.body.velocity.set(0, 0, 0);
            activeDragItem.body.angularVelocity.set(0, 0, 0);
            recordDragPoint(new THREE.Vector3(clampedX, clampedY, clampedZ));
        }
    }

    // Step physics first, then copy body transforms into visual meshes.
    const now = performance.now();
    const frameSeconds = (now - lastFrameTimestamp) / 1000;
    lastFrameTimestamp = now;
    physicsWorld.step(1 / 60, frameSeconds, 3);
    cube.position.copy(cubePhysicsBody.position);
    cube.quaternion.copy(cubePhysicsBody.quaternion);
    for (const pair of modelPhysicsPairs) {
        pair.model.position.copy(pair.body.position);
        pair.model.quaternion.copy(pair.body.quaternion);
    }
    updateOutlinePerFrame();

    // Prevent panning the focus point below the floor plane (y = 0).
    controls.target.y = Math.max(0.1, controls.target.y);
    // Required when damping is enabled so camera movement eases over time.
    controls.update();

    renderer.render(scene, camera);
});
