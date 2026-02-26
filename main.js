import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

// Create a scene as the container for everything we render.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111827);

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
controls.maxDistance = 14;
// Prevent orbiting below the horizon, which would place camera under the floor.
controls.maxPolarAngle = Math.PI / 2;

// Cannon world handles gravity and collisions (physics source of truth).
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
});

// Balanced light setup: ambient softens shadows, directional gives shape.
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 8, 3);
scene.add(sun);

// Floor plane rotated flat so the cube appears to rest on it.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x374151 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Matching static physics plane.
const floorBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// One starter cube for the room.
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
cube.position.y = 4;
scene.add(cube);

// Matching dynamic physics body; same size as Three box (half-extents = 0.5).
const cubeBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
    position: new CANNON.Vec3(0, 4, 0),
});
world.addBody(cubeBody);
const dynamicBodies = [cubeBody];
const gravityText = document.getElementById("gravityText");
const gravityIndicator = document.getElementById("gravityIndicator");

function updateGravityHud() {
    if (!gravityText || !gravityIndicator) return;
    gravityText.textContent = `Gravity: ${gravityOn ? "ON" : "OFF"}`;
    gravityIndicator.classList.toggle("status-light-on", gravityOn);
    gravityIndicator.classList.toggle("status-light-off", !gravityOn);
}

// Toggle gravity with Space: normal fall <-> zero gravity drift.
let gravityOn = true;
updateGravityHud();
window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    event.preventDefault();

    gravityOn = !gravityOn;
    world.gravity.set(0, gravityOn ? -9.8 : 0, 0);
    updateGravityHud();

    // On zero-g, add a small random impulse so objects gently drift.
    if (!gravityOn) {
        for (const body of dynamicBodies) {
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
let lastFrameTime = performance.now();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
    // Step physics first, then copy body transforms into visual meshes.
    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    world.step(1 / 60, deltaTime, 3);
    cube.position.copy(cubeBody.position);
    cube.quaternion.copy(cubeBody.quaternion);

    // Prevent panning the focus point below the floor plane (y = 0).
    controls.target.y = Math.max(0.1, controls.target.y);
    // Required when damping is enabled so camera movement eases over time.
    controls.update();

    renderer.render(scene, camera);
});
