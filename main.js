import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

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
controls.maxDistance = 10;
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

function updateGravityHud() {
    if (!gravityText || !gravityIndicator) return;
    gravityText.textContent = `Gravity: ${isGravityOn ? "ON" : "OFF"}`;
    gravityIndicator.classList.toggle("status-light-on", isGravityOn);
    gravityIndicator.classList.toggle("status-light-off", !isGravityOn);
}

renderer.domElement.addEventListener("pointerdown", (event) => {
    updatePointerScreen(event);
    raycaster.setFromCamera(pointerScreen, camera);
    const hit = raycaster.intersectObject(cube, false)[0];
    if (!hit) return;

    isDraggingCube = true;
    controls.enabled = false;
    cubePhysicsBody.type = CANNON.Body.KINEMATIC;
    cubePhysicsBody.velocity.set(0, 0, 0);
    cubePhysicsBody.angularVelocity.set(0, 0, 0);
    cubePhysicsBody.wakeUp();

    camera.getWorldDirection(cameraForward);
    dragPlane.setFromNormalAndCoplanarPoint(cameraForward, hit.point);
    recentDragPoints.length = 0;
    recordDragPoint(hit.point);
});

renderer.domElement.addEventListener("pointermove", (event) => updatePointerScreen(event));

window.addEventListener("pointerup", () => {
    if (!isDraggingCube) return;
    isDraggingCube = false;
    controls.enabled = true;
    cubePhysicsBody.type = CANNON.Body.DYNAMIC;
    cubePhysicsBody.wakeUp();
    const throwVelocity = calculateThrowVelocity();
    cubePhysicsBody.velocity.set(throwVelocity.x * 0.6, throwVelocity.y * 0.6, throwVelocity.z * 0.6);
});

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
    if (isDraggingCube) {
        raycaster.setFromCamera(pointerScreen, camera);
        if (raycaster.ray.intersectPlane(dragPlane, dragHitPoint)) {
            const clampedY = Math.max(0.5, dragHitPoint.y);
            cubePhysicsBody.position.set(dragHitPoint.x, clampedY, dragHitPoint.z);
            cubePhysicsBody.velocity.set(0, 0, 0);
            cubePhysicsBody.angularVelocity.set(0, 0, 0);
            recordDragPoint(new THREE.Vector3(dragHitPoint.x, clampedY, dragHitPoint.z));
        }
    }

    // Step physics first, then copy body transforms into visual meshes.
    const now = performance.now();
    const frameSeconds = (now - lastFrameTimestamp) / 1000;
    lastFrameTimestamp = now;
    physicsWorld.step(1 / 60, frameSeconds, 3);
    cube.position.copy(cubePhysicsBody.position);
    cube.quaternion.copy(cubePhysicsBody.quaternion);

    // Prevent panning the focus point below the floor plane (y = 0).
    controls.target.y = Math.max(0.1, controls.target.y);
    // Required when damping is enabled so camera movement eases over time.
    controls.update();

    renderer.render(scene, camera);
});
