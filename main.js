import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon-es";
import deskModelUrl from "./models/office_table_desk.glb?url";
import chairModelUrl from "./models/office_chair.glb?url";
import monitorModelUrl from "./models/monitor.glb?url";
import mugModelUrl from "./models/mug.glb?url";
import keyboardModelUrl from "./models/keyboard.glb?url";
import pcModelUrl from "./models/old_pc_tower.glb?url";
import mouseModelUrl from "./models/mouse.glb?url";
import carpetTextureUrl from "./textures/dusty_carpet.jpg?url";
import wallpaperTextureUrl from "./textures/wallpaper.png?url";
import ceilingAUrl from "./textures/ceiling.jpg?url";
import ceilingBUrl from "./textures/realceiling.jpg?url";

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
physicsWorld.allowSleep = true;
physicsWorld.defaultContactMaterial.friction = 0.6;
physicsWorld.defaultContactMaterial.restitution = 0.05;
const roomSize = 12;
const roomHeight = 8;
const roomHalfSize = roomSize / 2;
const textureLoader = new THREE.TextureLoader();
const floorTexture = textureLoader.load(carpetTextureUrl);
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(4, 4);

const wallTexture = textureLoader.load(wallpaperTextureUrl);
wallTexture.wrapS = THREE.RepeatWrapping;
wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(6, 2.5);

// Warm office/backrooms-style lighting.
scene.add(new THREE.AmbientLight(0xfff0b3, 0.75));
const sun = new THREE.DirectionalLight(0xffe6a8, 0.8);
sun.position.set(5, 8, 3);
scene.add(sun);

// Floor plane rotated flat so the cube appears to rest on it.
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: floorTexture,
        roughness: 0.9,
        metalness: 0.05,
    })
);
floor.rotation.x = -Math.PI / 2;
// Slight offset avoids z-fighting with the room shell bottom face.
floor.position.y = -0.01;
scene.add(floor);
// Simple blank white room shell (rendered from inside faces).
const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: wallTexture,
    roughness: 0.95,
    metalness: 0.02,
    side: THREE.BackSide,
});
const activeCeiling = "A"; // change to "B" to test the other one
const ceilingTexture = textureLoader.load(activeCeiling === "A" ? ceilingAUrl : ceilingBUrl);
ceilingTexture.wrapS = THREE.RepeatWrapping;
ceilingTexture.wrapT = THREE.RepeatWrapping;
ceilingTexture.repeat.set(3, 3);

const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: ceilingTexture,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.BackSide,
  });

const hiddenBottomMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
});
const room = new THREE.Mesh(
    new THREE.BoxGeometry(roomSize, roomHeight, roomSize),
    [
        wallMaterial, // +X
        wallMaterial, // -X
        ceilingMaterial, // +Y
        hiddenBottomMaterial, // -Y
        wallMaterial, // +Z
        wallMaterial, // -Z
    ]
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

const movablePhysicsBodies = [];
const gltfLoader = new GLTFLoader();
const modelPhysicsPairs = [];
const draggableTargets = [];
let activeDragItem = null;
const dragWallPadding = 0.05;
let hoveredDraggableRoot = null;
let activeDraggedRoot = null;
let outlinedRoot = null;
let outlineHelper = null;

// Keep office setup near the center of the room.
const officeAnchor = new THREE.Vector3(0, 0, 0);

// Add more office items here. positionOffset is relative to officeAnchor.
const officeItems = [
    {
        modelUrl: deskModelUrl,
        positionOffset: new THREE.Vector3(0, 0, 0),
        scale: 2.05,
        rotationY: 0,
        mass: 8,
    },
    {
        modelUrl: chairModelUrl,
        positionOffset: new THREE.Vector3(0, 0, 2.15),
        scale: 2.35,
        rotationY: Math.PI,
        mass: 5,
    },
    {
        modelUrl: monitorModelUrl,
        positionOffset: new THREE.Vector3(0.0, 2.75, 0.72),
        scale: 0.02,
        rotationY: Math.PI,
        mass: 1.8,
    },
    {
        modelUrl: mugModelUrl,
        positionOffset: new THREE.Vector3(1.2, 2.6, 1.05),
        scale: 1.05,
        rotationY: 0,
        mass: 1,
    },
    {
        modelUrl: keyboardModelUrl,
        positionOffset: new THREE.Vector3(0.0, 2.55, 1.45),
        scale: 0.58,
        rotationY: Math.PI,
        mass: 1.1,
    },
    {
        modelUrl: pcModelUrl,
        positionOffset: new THREE.Vector3(-1.2, 0.25, 0.2),
        scale: 0.95,
        rotationY: Math.PI / 2,
        mass: 3.8,
    },
    {
        modelUrl: mouseModelUrl,
        positionOffset: new THREE.Vector3(0.95, 2.58, 1.4),
        scale: 0.1,
        rotationY: Math.PI,
        mass: 0.7,
    },
];

// loads a .glb and gives it a simple box physics body.
function loadModelWithBoxPhysics(itemConfig) {
    const {
        modelUrl,
        positionOffset = new THREE.Vector3(),
        scale = 1,
        rotationY = 0,
        mass = 0,
    } = itemConfig;

    gltfLoader.load(
        modelUrl,
        (gltf) => {
            const model = gltf.scene;
            model.position.copy(officeAnchor).add(positionOffset);
            model.scale.setScalar(scale);
            model.rotation.y = rotationY;
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
            if (mass > 0) {
                // Damping keeps heavy props from jittering/launching on first contacts.
                modelPhysicsBody.linearDamping = 0.35;
                modelPhysicsBody.angularDamping = 0.6;
                modelPhysicsBody.allowSleep = true;
                modelPhysicsBody.sleepSpeedLimit = 0.15;
                modelPhysicsBody.sleepTimeLimit = 0.6;
            }
            physicsWorld.addBody(modelPhysicsBody);

            // Anchor every model for consistent outline + dragging behavior.
            const modelAnchor = new THREE.Group();
            modelAnchor.position.copy(center);
            model.position.sub(center);
            modelAnchor.add(model);
            scene.add(modelAnchor);
            scene.remove(model);

            modelAnchor.userData.dragItem = {
                body: modelPhysicsBody,
                releaseType: mass > 0 ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC,
                canThrow: mass > 0,
                dragBounds: createDragBounds(
                    Math.max(size.x * 0.5, 0.05),
                    Math.max(size.y * 0.5, 0.05),
                    Math.max(size.z * 0.5, 0.05)
                ),
            };
            draggableTargets.push(modelAnchor);
            modelPhysicsPairs.push({ model: modelAnchor, body: modelPhysicsBody });

            if (mass > 0) {
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
let isDraggingItem = false;

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
    if (!isDraggingItem) {
        refreshOutlineTarget();
    }
}

function updateHoveredObject() {
    if (isDraggingItem) return;
    raycaster.setFromCamera(pointerScreen, camera);
    const hit = raycaster.intersectObjects(draggableTargets, true)[0];
    const newHoveredRoot = hit ? findDraggableRoot(hit.object) : null;
    if (newHoveredRoot === hoveredDraggableRoot) return;
    hoveredDraggableRoot = newHoveredRoot;
    refreshOutlineTarget();
}

window.addEventListener("pointermove", (event) => {
    if (isDraggingItem) return;
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

    isDraggingItem = true;
    activeDraggedRoot = findDraggableRoot(hit.object);
    activeDragItem = hitDragItem;
    refreshOutlineTarget();
    controls.enabled = false;
    activeDragItem.body.type = CANNON.Body.KINEMATIC;
    activeDragItem.body.updateMassProperties();
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
    if (!isDraggingItem) return;
    isDraggingItem = false;
    controls.enabled = true;
    activeDragItem.body.type = activeDragItem.releaseType;
    activeDragItem.body.updateMassProperties();
    activeDragItem.body.wakeUp();
    if (activeDragItem.canThrow) {
        const throwVelocity = calculateThrowVelocity();
        activeDragItem.body.velocity.set(throwVelocity.x * 0.6, throwVelocity.y * 0.6, throwVelocity.z * 0.6);
    } else {
        activeDragItem.body.velocity.set(0, 0, 0);
        activeDragItem.body.angularVelocity.set(0, 0, 0);
    }
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
    if (isDraggingItem && activeDragItem) {
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
