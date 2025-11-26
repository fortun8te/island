// ============================================
// ISLAND SIMULATION - Main Entry Point
// ============================================

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import GUI from 'lil-gui';

import { CONFIG, VERSION, seededRandom, resetSeed } from './config.js';
import { getTerrainHeight, getRandomIslandPosition, snapToTerrain } from './utils/terrain.js';
import { 
    logTest, updateStats, runSanityChecks, checkGrounded, 
    checkAgentState, runSpeedTest, clearTestLog 
} from './utils/sanityChecks.js';

// Survival systems
import { 
    RESOURCES,
    createInventory,
    addToInventory,
    removeFromInventory,
    getInventoryCount,
    hasInventoryRoom,
    canCraft,
    consumeCraftingResources,
    addTool,
    equipTool,
    useTool
} from './systems/resources.js';
import { 
    createAgentNeeds,
    updateNeeds,
    consumeFood as applyFoodToNeeds
} from './systems/needs.js';
import {
    createAgentSkills,
    getGatheringSpeed,
    getGatheringYield,
    awardXP
} from './systems/skills.js';
import {
    TribeCoordinator,
    improvedPlanTask,
    improvedIdleBehavior
} from './systems/ai.js';
import {
    AnimationSystem,
    ANIM_STATES
} from './systems/animations.js';
import {
    CarryingSystem
} from './systems/carrying.js';
import {
    FishingSystem,
    FISHING_TASKS,
    FISHING_CONFIG
} from './systems/fishing.js';

// ============================================
// GLOBAL STATE
// ============================================
let scene, camera, renderer, clock;
let water, sky, sun, ambientLight, hemiLight, fillLight;
let island;
let hut; // central storage / shelter
let allTrees = [];
let allRocks = [];
let allBushes = [];
let tribeMembers = [];
let fishList = [];
let tribeCoordinator; // AI coordination system
let fishingSystem; // Fishing mechanics system

// Camera state
let cameraYaw = 0, cameraPitch = 0;
let isPointerLocked = false;
let orbitCameraAngle = 0;
let controls = { forward: false, backward: false, left: false, right: false, up: false, down: false, shift: false };

// Simulation state
let simulationAccumulator = 0;
let totalSimSteps = 0;
let totalDeaths = 0;
let lastFPSUpdate = 0;
let frameCount = 0;
let currentFPS = 60;
let stepsPerSecond = 0;
let stepCountThisSecond = 0;

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    updateLoadingProgress(10);
    logTest(`Initializing scene... (v${VERSION})`, 'info');
    
    // Update page title with version
    if (typeof document !== 'undefined') {
        document.title = `🏝️ Island Simulation v${VERSION}`;
    }
    
    // Reset random seed for determinism
    resetSeed(CONFIG.seed);
    
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf0d8c8, 0.0015); // Warm sunrise fog
    
    // Clock
    clock = new THREE.Clock();
    
    // Camera - start with orbit view
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(200, 100, 200);
    
    updateLoadingProgress(20);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: CONFIG.visualQuality === 'high',
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.visualQuality === 'high' ? 2 : 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6; // Darker for sunrise
    renderer.shadowMap.enabled = CONFIG.visualQuality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    updateLoadingProgress(30);
    
    // Build scene
    createLighting();
    updateLoadingProgress(40);
    
    createSky();
    createWater();
    updateLoadingProgress(50);
    
    createIsland();
    updateLoadingProgress(60);
    
    createPalmTrees();
    createJungleTrees();
    updateLoadingProgress(70);
    
    createRocks();
    createBushes();
    updateLoadingProgress(80);
    
    createHut();
    
    createFish();
    createTribeMembers();

    // Initialize AI coordination system
    tribeCoordinator = new TribeCoordinator();

    // Initialize fishing system
    fishingSystem = new FishingSystem();

    updateLoadingProgress(90);

    // Setup controls and GUI
    setupControls();
    setupGUI();
    
    // Events
    window.addEventListener('resize', onResize);
    
    updateLoadingProgress(95);
    
    // Initial time of day - MORNING
    CONFIG.timeOfDay = 0.23;
    updateTimeOfDay();
    
    // Run initial sanity checks
    logTest('Running initial sanity checks...', 'info');
    setTimeout(() => {
        runSanityChecks(scene, tribeMembers, allTrees);
    }, 500);
    
    updateLoadingProgress(100);
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
        logTest('Simulation started at sunrise', 'success');
    }, 600);
    
    // Start animation loop
    animate();
}

function updateLoadingProgress(percent) {
    const el = document.getElementById('loading-progress');
    if (el) el.style.width = `${percent}%`;
}

// ============================================
// LIGHTING
// ============================================
function createLighting() {
    // Ambient
    ambientLight = new THREE.AmbientLight(0xffe8d0, 0.3);
    scene.add(ambientLight);
    
    // Hemisphere (sky/ground gradient)
    hemiLight = new THREE.HemisphereLight(0xffaa77, 0x445522, 0.5);
    scene.add(hemiLight);
    
    // Sun (directional)
    sun = new THREE.DirectionalLight(0xffaa55, 1.5);
    sun.position.set(100, 50, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = CONFIG.visualQuality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.height = CONFIG.visualQuality === 'high' ? 2048 : 1024;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    
    // Fill light
    fillLight = new THREE.DirectionalLight(0x88aacc, 0.2);
    fillLight.position.set(-80, 60, -80);
    scene.add(fillLight);
}

function updateTimeOfDay() {
    const t = CONFIG.timeOfDay; // 0 = sunrise, 0.5 = midday, 1 = sunset
    
    // Sun orbit
    const sunAngle = (t - 0.25) * Math.PI * 2;
    const sunElevation = Math.sin(t * Math.PI) * 0.85 + 0.15;
    const sunDist = 200;
    
    sun.position.set(
        Math.cos(sunAngle) * sunDist,
        sunElevation * 180 + 20,
        Math.sin(sunAngle) * sunDist
    );
    
    // Color & intensity based on time
    let sunColor, sunIntensity, ambientColor, ambientIntensity, exposure, fogColor;
    
    if (t < 0.15 || t > 0.85) {
        // Sunrise/Sunset - warm orange/pink
        sunColor = 0xff7733;
        sunIntensity = 1.2;
        ambientColor = 0xffccaa;
        ambientIntensity = 0.35;
        exposure = 0.55;
        fogColor = 0xf0c8a8;
        scene.fog.density = 0.002;
    } else if (t < 0.3 || t > 0.7) {
        // Morning/Evening - warm yellow
        sunColor = 0xffcc66;
        sunIntensity = 1.8;
        ambientColor = 0xfff0d0;
        ambientIntensity = 0.4;
        exposure = 0.65;
        fogColor = 0xe8dcc8;
        scene.fog.density = 0.0015;
    } else {
        // Midday - bright white
        sunColor = 0xffffff;
        sunIntensity = 2.2;
        ambientColor = 0xfff8f0;
        ambientIntensity = 0.5;
        exposure = 0.8;
        fogColor = 0xd8e4f0;
        scene.fog.density = 0.001;
    }
    
    sun.color.setHex(sunColor);
    sun.intensity = sunIntensity;
    ambientLight.color.setHex(ambientColor);
    ambientLight.intensity = ambientIntensity;
    renderer.toneMappingExposure = exposure;
    scene.fog.color.setHex(fogColor);
    
    // Update sky
    if (sky) {
        const phi = THREE.MathUtils.degToRad(90 - sunElevation * 70);
        const theta = sunAngle;
        const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
        sky.material.uniforms['sunPosition'].value.copy(sunPos);
        
        // Adjust sky parameters for time
        sky.material.uniforms['rayleigh'].value = t < 0.2 || t > 0.8 ? 3 : 1.5;
    }
    
    // Update water sun direction
    if (water) {
        water.material.uniforms['sunDirection'].value.copy(sun.position).normalize();
    }
}

// ============================================
// SKY
// ============================================
function createSky() {
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);
    
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = 10;
    uniforms['rayleigh'].value = 3; // Higher for sunrise colors
    uniforms['mieCoefficient'].value = 0.005;
    uniforms['mieDirectionalG'].value = 0.8;
}

// ============================================
// WATER
// ============================================
function createWater() {
    const waterGeometry = new THREE.PlaneGeometry(8000, 8000);
    
    water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg',
            (texture) => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
        ),
        sunDirection: new THREE.Vector3(0.5, 0.5, 0.5),
        sunColor: 0xffcc88,
        waterColor: 0x007080,
        distortionScale: 2,
        fog: true,
        alpha: 0.9
    });
    
    water.rotation.x = -Math.PI / 2;
    water.position.y = CONFIG.waterLevel;
    scene.add(water);
    
    // Ocean floor
    const floorGeometry = new THREE.PlaneGeometry(4000, 4000);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0a3040, roughness: 1 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -15;
    scene.add(floor);
    
    // Shallow water ring (reef-like)
    const shallowGeometry = new THREE.RingGeometry(CONFIG.islandRadius * 0.95, CONFIG.islandRadius * 1.4, 64);
    const shallowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x40b0a0, 
        transparent: true, 
        opacity: 0.3,
        roughness: 0.8
    });
    const shallow = new THREE.Mesh(shallowGeometry, shallowMaterial);
    shallow.rotation.x = -Math.PI / 2;
    shallow.position.y = -0.5;
    scene.add(shallow);
}

// ============================================
// ISLAND TERRAIN
// ============================================
function createIsland() {
    const resolution = 100;
    const size = CONFIG.islandRadius * 2.5;
    const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
    
    const positions = geometry.attributes.position.array;
    const colors = [];
    
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 1];
        const height = getTerrainHeight(x, z);
        positions[i + 2] = height;
        
        // Vertex colors based on height
        let color;
        if (height < 1) {
            // Wet sand
            color = new THREE.Color(0xc9a875);
        } else if (height < 2.5) {
            // Dry beach
            const v = seededRandom() * 0.04;
            color = new THREE.Color(0.92 + v, 0.84 + v, 0.62 + v);
        } else if (height < 4) {
            // Grass transition
            const v = seededRandom() * 0.06;
            color = new THREE.Color(0.45 + v, 0.65 + v, 0.28);
        } else {
            // Dense vegetation
            const v = seededRandom() * 0.08;
            color = new THREE.Color(0.18 + v, 0.5 + v, 0.12);
        }
        
        colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0,
        flatShading: false
    });
    
    island = new THREE.Mesh(geometry, material);
    island.rotation.x = -Math.PI / 2;
    island.receiveShadow = true;
    scene.add(island);
}

// ============================================
// HUT / CENTRAL STORAGE
// ============================================
function createHut() {
    const hutGroup = new THREE.Group();
    const y = getTerrainHeight(0, 0);

    // Floor
    const floorGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.3, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = y + 0.15;
    floor.receiveShadow = true;
    hutGroup.add(floor);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.2, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5b3b1a, roughness: 0.9 });
    const radius = 2.1;
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(
            Math.cos(angle) * radius,
            y + 1.25,
            Math.sin(angle) * radius
        );
        pillar.castShadow = true;
        hutGroup.add(pillar);
    }

    // Roof
    const roofGeo = new THREE.ConeGeometry(3, 1.8, 8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = y + 2.5;
    roof.castShadow = true;
    hutGroup.add(roof);

    // Storage crates
    const crateGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x9b7b4a, roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(-1.6 + i * 1.6, y + 0.45, -1.3);
        crate.rotation.y = 0.3 * (i - 1);
        crate.castShadow = true;
        crate.receiveShadow = true;
        hutGroup.add(crate);
    }

    hutGroup.position.set(0, 0, 0);
    hutGroup.userData.isHut = true;
    hutGroup.userData.radius = 4;

    scene.add(hutGroup);

    hut = {
        mesh: hutGroup,
        position: new THREE.Vector3(0, y, 0),
        // Shared stockpile
        storage: {
            coconut: 0,
            wood: 0,
            stone: 0,
            fishing_spear: 0
        }
    };
}

// ============================================
// PALM TREES
// ============================================
function createPalmTrees() {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 });
    
    // Scale resources with agent count
    const palmTreeCount = Math.floor(CONFIG.palmTreesPerAgent * CONFIG.tribeMembers);
    for (let i = 0; i < palmTreeCount; i++) {
        const pos = getRandomIslandPosition(CONFIG.islandRadius * 0.5, CONFIG.islandRadius * 0.85, 2);
        const palm = createPalmTree(trunkMaterial, leafMaterial);
        
        palm.position.set(pos.x, pos.y - 0.5, pos.z); // Sink slightly into ground
        palm.rotation.y = seededRandom() * Math.PI * 2;
        palm.userData.isTree = true;
        palm.userData.treeType = 'palm';
        palm.userData.id = `palm_${i}`;
        palm.userData.coconuts = 1 + Math.floor(seededRandom() * 3);
        
        scene.add(palm);
        allTrees.push({ mesh: palm, age: 1 });
        
        // Add coconuts
        addCoconutsToTree(palm);
    }
    
    logTest(`Created ${palmTreeCount} palm trees (${CONFIG.palmTreesPerAgent} per agent)`, 'info');
}

function createPalmTree(trunkMaterial, leafMaterial) {
    const tree = new THREE.Group();
    
    const trunkHeight = 5 + seededRandom() * 4;
    const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.22, trunkHeight, 8);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    
    // Leaf crown
    const crownGeometry = new THREE.SphereGeometry(2, 10, 8);
    const crown = new THREE.Mesh(crownGeometry, leafMaterial);
    crown.position.y = trunkHeight + 0.5;
    crown.scale.y = 0.5;
    crown.castShadow = true;
    tree.add(crown);
    
    // Extra leaf clusters
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const leafCluster = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8, 6),
            leafMaterial
        );
        leafCluster.position.set(
            Math.cos(angle) * 1.5,
            trunkHeight + 0.2,
            Math.sin(angle) * 1.5
        );
        leafCluster.scale.y = 0.4;
        tree.add(leafCluster);
    }
    
    return tree;
}

function addCoconutsToTree(tree) {
    const coconutMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    const coconutGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    
    const count = tree.userData.coconuts || 0;
    for (let i = 0; i < count; i++) {
        const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
        const angle = (i / Math.max(count, 1)) * Math.PI * 2;
        coconut.position.set(
            Math.cos(angle) * 0.6,
            4.5 + seededRandom() * 2,
            Math.sin(angle) * 0.6
        );
        coconut.userData.isCoconut = true;
        coconut.castShadow = true;
        tree.add(coconut);
    }
}

// ============================================
// JUNGLE TREES
// ============================================
function createJungleTrees() {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    const canopyColors = [0x1a6b1a, 0x228b22, 0x2d7b2d, 0x1e8b1e];
    
    const jungleTreeCount = Math.floor(CONFIG.jungleTreesPerAgent * CONFIG.tribeMembers);
    for (let i = 0; i < jungleTreeCount; i++) {
        const pos = getRandomIslandPosition(5, CONFIG.islandRadius * 0.7, 3);
        const jungle = createJungleTree(trunkMaterial, canopyColors);
        
        jungle.position.set(pos.x, pos.y - 0.6, pos.z);
        jungle.rotation.y = seededRandom() * Math.PI * 2;
        jungle.userData.isTree = true;
        jungle.userData.treeType = 'jungle';
        jungle.userData.id = `jungle_${i}`;
        
        scene.add(jungle);
        allTrees.push({ mesh: jungle, age: 1 });
    }
    
    logTest(`Created ${jungleTreeCount} jungle trees (${CONFIG.jungleTreesPerAgent} per agent)`, 'info');
}

function createJungleTree(trunkMaterial, canopyColors) {
    const tree = new THREE.Group();
    
    const trunkHeight = 6 + seededRandom() * 6;
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.35, trunkHeight, 6);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);
    
    // Canopy clusters
    const clusters = 2 + Math.floor(seededRandom() * 2);
    for (let i = 0; i < clusters; i++) {
        const size = 2.5 + seededRandom() * 2;
        const canopyGeometry = new THREE.SphereGeometry(size, 8, 6);
        const canopyMaterial = new THREE.MeshStandardMaterial({
            color: canopyColors[Math.floor(seededRandom() * canopyColors.length)],
            roughness: 0.8
        });
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.position.set(
            (seededRandom() - 0.5) * 2,
            trunkHeight + size * 0.3 + i * 1.5,
            (seededRandom() - 0.5) * 2
        );
        canopy.scale.y = 0.6;
        canopy.castShadow = true;
        tree.add(canopy);
    }
    
    return tree;
}

// ============================================
// ROCKS
// ============================================
function createRocks() {
    const rockCount = Math.floor(CONFIG.rocksPerAgent * CONFIG.tribeMembers);
    for (let i = 0; i < rockCount; i++) {
        const pos = getRandomIslandPosition(CONFIG.islandRadius * 0.6, CONFIG.islandRadius * 0.9, 1.5);
        const rock = createRock();
        
        const scale = 0.4 + seededRandom() * 0.6;
        rock.position.set(pos.x, pos.y - scale * 0.35, pos.z);
        rock.scale.setScalar(scale);
        rock.rotation.y = seededRandom() * Math.PI;
        rock.userData.isRock = true;
        
        scene.add(rock);
        allRocks.push(rock);
    }
    
    logTest(`Created ${rockCount} rocks (${CONFIG.rocksPerAgent} per agent)`, 'info');
}

function createRock() {
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const positions = geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += (seededRandom() - 0.5) * 0.3;
        positions[i + 1] += (seededRandom() - 0.5) * 0.2;
        positions[i + 2] += (seededRandom() - 0.5) * 0.3;
    }
    geometry.computeVertexNormals();
    
    const gray = 0.5 + seededRandom() * 0.2;
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(gray, gray * 0.95, gray * 0.9),
        roughness: 0.85,
        flatShading: true
    });
    
    const rock = new THREE.Mesh(geometry, material);
    rock.scale.y = 0.5 + seededRandom() * 0.3;
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
}

// ============================================
// BUSHES
// ============================================
function createBushes() {
    const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x3d6a3d, roughness: 0.9 });
    const bushGeometry = new THREE.SphereGeometry(0.6, 8, 6);
    
    const bushCount = Math.floor(CONFIG.bushesPerAgent * CONFIG.tribeMembers);
    for (let i = 0; i < bushCount; i++) {
        const pos = getRandomIslandPosition(15, CONFIG.islandRadius * 0.7, 4);
        
        const bush = new THREE.Mesh(bushGeometry, bushMaterial);
        bush.position.set(pos.x, pos.y + 0.3, pos.z);
        bush.scale.setScalar(0.6 + seededRandom() * 0.5);
        bush.scale.y *= 0.7;
        bush.castShadow = true;
        bush.userData.isBush = true;
        
        scene.add(bush);
        allBushes.push(bush);
    }
    
    logTest(`Created ${bushCount} bushes (${CONFIG.bushesPerAgent} per agent)`, 'info');
}

// ============================================
// FISH
// ============================================
function createFish() {
    const fishColors = [0xff6b35, 0xffd700, 0x4ecdc4, 0xff69b4, 0x87ceeb];
    
    const fishCount = Math.floor(CONFIG.fishPerAgent * CONFIG.tribeMembers);
    for (let i = 0; i < fishCount; i++) {
        const angle = seededRandom() * Math.PI * 2;
        const dist = CONFIG.islandRadius * (1 + seededRandom() * 0.8);
        
        const fish = createSingleFish(fishColors);
        fish.mesh.position.set(
            Math.cos(angle) * dist,
            -1 - seededRandom() * 4,
            Math.sin(angle) * dist
        );
        fish.mesh.rotation.y = angle + Math.PI;
        fish.angle = angle;
        fish.dist = dist;
        fish.speed = 0.2 + seededRandom() * 0.3;
        fish.yBase = fish.mesh.position.y;
        
        scene.add(fish.mesh);
        fishList.push(fish);
    }
}

function createSingleFish(colors) {
    const group = new THREE.Group();
    const color = colors[Math.floor(seededRandom() * colors.length)];
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
    
    // Body
    const bodyGeometry = new THREE.ConeGeometry(0.12, 0.5, 6);
    bodyGeometry.rotateZ(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeometry, material);
    group.add(body);
    
    // Tail
    const tailGeometry = new THREE.ConeGeometry(0.1, 0.15, 4);
    tailGeometry.rotateZ(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeometry, material);
    tail.position.x = -0.3;
    group.add(tail);
    
    const scale = 0.7 + seededRandom() * 0.5;
    group.scale.setScalar(scale);
    
    return { mesh: group };
}

// ============================================
// TRIBE MEMBERS (AGENTS)
// ============================================
function createTribeMembers() {
    // Clear existing
    tribeMembers.forEach(m => scene.remove(m.mesh));
    tribeMembers = [];
    
    for (let i = 0; i < CONFIG.tribeMembers; i++) {
        const member = createTribeMember(i);
        const pos = getRandomIslandPosition(10, CONFIG.islandRadius * 0.6, 3);
        
        member.mesh.position.set(pos.x, pos.y, pos.z);
        member.mesh.rotation.y = seededRandom() * Math.PI * 2;
        member.targetAngle = member.mesh.rotation.y;
        
        scene.add(member.mesh);
        tribeMembers.push(member);
    }
    
    logTest(`Created ${CONFIG.tribeMembers} agents`, 'info');
}

function createTribeMember(index) {
    const group = new THREE.Group();
    
    // Skin tones
    const skinTones = [0xc68642, 0x8d5524, 0xa67c52, 0x7d4e2a, 0xb57d52];
    const skinColor = skinTones[Math.floor(seededRandom() * skinTones.length)];
    const skinMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.35, 1, 8, 12);
    const body = new THREE.Mesh(bodyGeometry, skinMaterial);
    body.position.y = 1.3;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 12, 12);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    group.add(head);
    
    // Hair
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const hairGeometry = new THREE.SphereGeometry(0.32, 12, 12);
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 2.35;
    hair.scale.y = 0.5 + seededRandom() * 0.3;
    group.add(hair);
    
    // Grass skirt
    const skirtMaterial = new THREE.MeshStandardMaterial({ color: 0x355e3b, side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) {
        const strandGeometry = new THREE.PlaneGeometry(0.08, 0.4 + seededRandom() * 0.15);
        const strand = new THREE.Mesh(strandGeometry, skirtMaterial);
        const angle = (i / 16) * Math.PI * 2;
        strand.position.set(Math.cos(angle) * 0.3, 0.7, Math.sin(angle) * 0.3);
        strand.rotation.y = angle;
        strand.rotation.x = 0.25;
        group.add(strand);
    }
    
    // Legs
    const legGeometry = new THREE.CapsuleGeometry(0.1, 0.5, 4, 8);
    const leftLeg = new THREE.Mesh(legGeometry, skinMaterial);
    leftLeg.position.set(-0.15, 0.4, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, skinMaterial);
    rightLeg.position.set(0.15, 0.4, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    
    // Arms
    const armGeometry = new THREE.CapsuleGeometry(0.07, 0.4, 4, 8);
    const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
    leftArm.position.set(-0.45, 1.45, 0);
    leftArm.rotation.z = 0.25;
    leftArm.castShadow = true;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
    rightArm.position.set(0.45, 1.45, 0);
    rightArm.rotation.z = -0.25;
    rightArm.castShadow = true;
    group.add(rightArm);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1810 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 2.25, 0.25);
    leftEye.scale.z = 0.5;
    group.add(leftEye);
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.1, 2.25, 0.28);
    group.add(leftPupil);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 2.25, 0.25);
    rightEye.scale.z = 0.5;
    group.add(rightEye);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.1, 2.25, 0.28);
    group.add(rightPupil);
    
    return {
        mesh: group,
        id: `agent_${index}`,
        // Animation & movement
        targetAngle: 0,
        walkPhase: seededRandom() * Math.PI * 2,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        carryMesh: null,
        // Systems
        needs: createAgentNeeds(18 + seededRandom() * 15),
        skills: createAgentSkills(),
        inventory: createInventory(10),
        // State machine
        alive: true,
        state: 'idle',          // idle, walking, gathering, hauling, resting, eating, crafting, fishing
        task: null,             // { type, target, resourceId, amountPlanned, ... }
        restTime: 0,
        actionTimer: 0
    };
}

// ============================================
// AGENT UPDATE LOGIC (REWRITTEN)
// ============================================

function updateTribeMembers(delta) {
    tribeMembers.forEach(member => {
        if (!member.alive) return;

        const mesh = member.mesh;

        // === NEEDS UPDATE ===
        const ctx = {
            isMoving: member.state === 'walking' || member.state === 'hauling' || member.state === 'fishing',
            isResting: member.state === 'resting' || member.state === 'crafting',
            inShelter: hut ? mesh.position.distanceTo(hut.position) < hut.mesh.userData.radius : false,
            inWater: mesh.position.y < CONFIG.waterLevel + 0.2,
            inDeepWater: mesh.position.y < CONFIG.waterLevel - 2,
            nearbyAgentCount: tribeMembers.filter(
                other => other !== member && other.alive &&
                    other.mesh.position.distanceTo(mesh.position) < 10
            ).length,
            nearSickAgent: tribeMembers.some(
                other => other !== member && other.alive &&
                    other.needs?.isSick &&
                    other.mesh.position.distanceTo(mesh.position) < 6
            )
        };

        const needsResult = updateNeeds(member.needs, delta, ctx);
        if (!needsResult.alive) {
            member.alive = false;
            mesh.visible = false;
            totalDeaths++;
            logTest(`Agent ${member.id} died: ${needsResult.deathCause}`, 'warning');
            return;
        }

        // Forced rest event
        if (needsResult.events.some(e => e.type === 'forced_rest')) {
            member.state = 'resting';
            member.task = null;
            member.restTime = 3 + seededRandom() * 3;
        }

        // === HIGH-LEVEL DECISION (IMPROVED AI) ===
        // Update tribe coordinator with latest information
        tribeCoordinator.analyzeTribe(tribeMembers, hut);

        // Create helper object for AI system
        const aiHelpers = {
            angleTo,
            hasFood,
            canCraftSpear,
            findNearestPalmWithCoconuts,
            findNearestJungleTree,
            findNearestRock,
            findNearestFish,
            hasSpear
        };

        // Use improved AI planning
        improvedPlanTask(member, tribeMembers, hut, tribeCoordinator, aiHelpers);

        // === EXECUTION ===
        executeAgentState(member, delta);

        // Sanity check
        checkAgentState(member);
    });
}

function planOrMaintainTask(member) {
    if (!member.alive) return;

    const hunger = member.needs.hunger;
    const energy = member.needs.energy;

    // If we're in the middle of an atomic action, don't replan
    if (member.state === 'gathering' || member.state === 'crafting' || member.state === 'eating' || member.state === 'fishing') {
        return;
    }

    // Eat from inventory if very hungry
    const coconutsInInv = getInventoryCount(member.inventory, 'coconut');
    if (hunger < 0.3 && coconutsInInv > 0) {
        member.state = 'eating';
        member.task = { type: 'eat_from_inventory', resourceId: 'coconut' };
        return;
    }

    // Eat from hut if closer than nearest tree and stockpile has food
    const hutHasCoconuts = hut && hut.storage.coconut > 0;
    const nearestPalm = findNearestPalmWithCoconuts(member);
    const distToHut = hut ? member.mesh.position.distanceTo(hut.position) : Infinity;
    const distToPalm = nearestPalm
        ? member.mesh.position.distanceTo(nearestPalm.position)
        : Infinity;

    if (hunger < 0.4 && hutHasCoconuts && distToHut <= distToPalm) {
        member.state = 'walking';
        member.task = { type: 'go_hut_for_food' };
        member.targetAngle = angleTo(member.mesh.position, hut.position);
        return;
    }

    // Low energy -> rest at/near hut
    if (energy < 0.25) {
        member.state = 'resting';
        member.task = { type: 'recover_energy' };
        member.restTime = 4 + seededRandom() * 4;
        return;
    }

    // If carrying resources and hut exists -> haul to hut
    const carryingAnything = member.inventory.slots.size > 0;
    if (carryingAnything && hut) {
        member.state = 'hauling';
        member.task = { type: 'haul_to_hut' };
        member.targetAngle = angleTo(member.mesh.position, hut.position);
        CarryingSystem.updateCarryVisual(member);
        return;
    }

    // Craft fishing spear if hut has mats and tribe has almost no spears
    const totalSpears = getTotalSpearsInTribeAndHut();
    if (hut && totalSpears < Math.max(2, Math.floor(tribeMembers.length / 3))) {
        if (canCraft(hutAsInventory(), 'fishing_spear')) {
            member.state = 'crafting';
            member.task = { type: 'craft_spear', recipeId: 'fishing_spear' };
            member.actionTimer = 5.0;
            return;
        }
    }

    // If food stockpile is low -> prioritize coconuts
    const desiredCoconutStock = tribeMembers.length * 4;
    const hutCoconutStock = hut ? hut.storage.coconut : 0;
    if (hutCoconutStock < desiredCoconutStock) {
        if (nearestPalm) {
            member.state = 'walking';
            member.task = { type: 'gather_coconuts', targetTree: nearestPalm };
            member.targetAngle = angleTo(member.mesh.position, nearestPalm.position);
            return;
        }
    }

    // Otherwise, gather building materials near hut (wood/stone)
    const gatherTarget = findNearestWoodOrStone(member);
    if (gatherTarget) {
        member.state = 'walking';
        member.task = gatherTarget;
        member.targetAngle = angleTo(member.mesh.position, gatherTarget.target.position);
        return;
    }

    // Fallback: gentle idle near hut
    member.state = 'idle';
    member.task = null;
}

function executeAgentState(member, delta) {
    const mesh = member.mesh;

    switch (member.state) {
        case 'resting':
            member.restTime -= delta;
            if (member.restTime <= 0) {
                member.state = 'idle';
                member.task = null;
            }
            // Use improved resting animation
            member.walkPhase += delta * 2;
            member.terrainY = getTerrainHeight(member.mesh.position.x, member.mesh.position.z);
            AnimationSystem.animateResting(member, delta, member.walkPhase);
            break;

        case 'eating':
            // Eating animation over time
            if (!member.actionTimer || member.actionTimer === 0) {
                member.actionTimer = 2.0; // 2 seconds to eat
            }

            member.walkPhase += delta * 5;
            AnimationSystem.animateEating(member, delta, member.walkPhase);

            member.actionTimer -= delta * CONFIG.simulationSpeed;
            if (member.actionTimer <= 0) {
                handleEating(member);
                member.state = 'idle';
                member.task = null;
                CarryingSystem.clearCarryVisual(member);
            }
            break;

        case 'walking':
        case 'hauling':
            updateWalking(member, delta);
            break;

        case 'fishing':
            updateFishing(member, delta);
            break;

        case 'gathering':
            updateGathering(member, delta);
            break;

        case 'crafting':
            updateCrafting(member, delta);
            break;

        default:
            // Use improved idle animation (NO random wandering)
            member.walkPhase += delta * 2;
            member.terrainY = getTerrainHeight(member.mesh.position.x, member.mesh.position.z);
            AnimationSystem.animateIdle(member, delta, member.walkPhase);
    }
}

function idleBob(member, delta) {
    const mesh = member.mesh;
    member.walkPhase += delta * 2;
    mesh.position.y = getTerrainHeight(mesh.position.x, mesh.position.z) + Math.sin(member.walkPhase) * 0.015;

    member.leftLeg.rotation.x *= 0.9;
    member.rightLeg.rotation.x *= 0.9;
    member.leftArm.rotation.x *= 0.9;
    member.rightArm.rotation.x *= 0.9;
}

function updateWalking(member, delta) {
    const mesh = member.mesh;
    // Scale speed with simulation speed
    const speed = CONFIG.walkSpeed * CONFIG.simulationSpeed * delta;

    member.walkPhase += delta * CONFIG.walkSpeed * 5;

    // Use improved carrying animations if hauling
    if (member.state === 'hauling') {
        // Determine what is being carried
        const carryingCoconuts = member.inventory.slots.has('coconut');
        const carryingWood = member.inventory.slots.has('wood');
        const carryingStone = member.inventory.slots.has('stone');

        if (carryingStone) {
            AnimationSystem.animateCarryingStone(member, delta);
        } else if (carryingWood) {
            AnimationSystem.animateCarryingWood(member, delta);
        } else if (carryingCoconuts) {
            const count = getInventoryCount(member.inventory, 'coconut');
            AnimationSystem.animateCarryingCoconuts(member, delta, count);
        }
    } else {
        // Normal walking animation
        AnimationSystem.animateWalking(member, delta, CONFIG.walkSpeed);
    }

    const targetPos = resolveTaskTargetPosition(member);
    if (!targetPos) {
        member.state = 'idle';
        member.task = null;
        CarryingSystem.clearCarryVisual(member);
        return;
    }

    const dx = targetPos.x - mesh.position.x;
    const dz = targetPos.z - mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.5) {
        // Reached destination
        onDestinationReached(member);
    } else {
        member.targetAngle = Math.atan2(dx, dz);

        const angleDiff = normalizeAngle(member.targetAngle - mesh.rotation.y);
        mesh.rotation.y += angleDiff * delta * 4;

        mesh.position.x += Math.sin(mesh.rotation.y) * speed;
        mesh.position.z += Math.cos(mesh.rotation.y) * speed;

        const terrainY = getTerrainHeight(mesh.position.x, mesh.position.z);
        mesh.position.y = terrainY + Math.abs(Math.sin(member.walkPhase)) * 0.04;

        // CRITICAL: Prevent agents from entering ocean (deadly!)
        const distFromCenter = Math.sqrt(mesh.position.x ** 2 + mesh.position.z ** 2);
        const minSafeHeight = CONFIG.waterLevel + 0.5; // Must stay above water
        if (mesh.position.y < minSafeHeight || distFromCenter > CONFIG.islandRadius * 0.88) {
            // Too close to water or too far out - move back to safety
            member.targetAngle = Math.atan2(-mesh.position.x, -mesh.position.z);
            // Force position back on land
            const safeDist = CONFIG.islandRadius * 0.85;
            mesh.position.x = Math.cos(member.targetAngle) * safeDist;
            mesh.position.z = Math.sin(member.targetAngle) * safeDist;
            mesh.position.y = Math.max(getTerrainHeight(mesh.position.x, mesh.position.z), minSafeHeight);
        }
    }
}

function updateGathering(member, delta) {
    const mesh = member.mesh;
    const task = member.task;
    if (!task) {
        member.state = 'idle';
        return;
    }

    // Use improved animations based on resource type
    member.walkPhase += delta * 10;

    if (task.resourceId === 'coconut') {
        AnimationSystem.animateCoconutGathering(member, delta, member.walkPhase);
    } else if (task.resourceId === 'wood') {
        AnimationSystem.animateWoodGathering(member, delta, member.walkPhase);
    } else if (task.resourceId === 'stone') {
        AnimationSystem.animateStoneGathering(member, delta, member.walkPhase);
    }

    const baseResource = RESOURCES[task.resourceId?.toUpperCase()] || RESOURCES[task.resourceId];
    const baseTime = baseResource?.gatherTime || 1.0;
    const effectiveTime = getGatheringSpeed(member.skills, baseTime);

    if (member.actionTimer <= 0) {
        member.actionTimer = effectiveTime;
    }

    // Scale action timer with simulation speed
    member.actionTimer -= delta * CONFIG.simulationSpeed;
    if (member.actionTimer > 0) return;

    // Apply yield
    const baseYield = task.resourceId === 'coconut' ? 3 : 2;
    const amount = Math.max(1, getGatheringYield(member.skills, baseYield));

    if (!hasInventoryRoom(member.inventory, task.resourceId)) {
        // Inventory full -> haul
        member.state = 'hauling';
        member.task = { type: 'haul_to_hut' };
        CarryingSystem.updateCarryVisual(member);
        return;
    }

    addToInventory(member.inventory, task.resourceId, amount);

    // Visually update world for coconuts
    if (task.type === 'gather_coconuts' && task.targetTree && task.targetTree.userData.coconuts > 0) {
        const taken = Math.min(amount, task.targetTree.userData.coconuts);
        task.targetTree.userData.coconuts -= taken;
        for (let i = 0; i < taken; i++) {
            const coconutMesh = task.targetTree.children.find(c => c.userData.isCoconut);
            if (coconutMesh) {
                task.targetTree.remove(coconutMesh);
            }
        }
    }

    awardXP(member.skills, task.resourceId === 'coconut' ? 'gather_coconut' :
        (task.resourceId === 'wood' ? 'gather_wood' : 'gather_stone'), []);

    CarryingSystem.updateCarryVisual(member);

    // After gather, immediately haul to hut
    member.state = 'hauling';
    member.task = { type: 'haul_to_hut' };
    member.actionTimer = 0;
}

function updateFishing(member, delta) {
    const task = member.task;
    if (!task || task.type !== 'go_fishing' || !task.target) {
        member.state = 'idle';
        member.task = null;
        return;
    }

    // CRITICAL: Never allow agents to go into ocean - fishing is from SHORE ONLY
    const agentY = member.mesh.position.y;
    if (agentY < CONFIG.waterLevel + 0.3) {
        // Agent is in water - emergency escape!
        member.state = 'walking';
        member.task = { type: 'escape_water' };
        fishingSystem.releaseFish(task.target, member.id);
        return;
    }

    // Spearfishing animation
    member.fishingPhase = (member.fishingPhase || 0) + delta * 3;
    const hasSpear = FishingSystem.hasSpear(member.inventory);
    AnimationSystem.animateFishing(member, delta, member.fishingPhase, hasSpear);

    // Check if fish moved out of range
    const fishPos = task.target.mesh.position;
    const inRange = FishingSystem.isInStrikingRange(member.mesh.position, fishPos);

    if (!inRange) {
        // Fish escaped, replan
        member.state = 'idle';
        member.task = null;
        fishingSystem.releaseFish(task.target, member.id);
        return;
    }

    // Face the fish
    member.targetAngle = angleTo(member.mesh.position, fishPos);
    const angleDiff = member.targetAngle - member.mesh.rotation.y;
    member.mesh.rotation.y += angleDiff * delta * 5;

    // Fishing takes time - attempt every 3-5 seconds
    const fishingTime = 4.0;
    if (member.actionTimer <= 0) {
        member.actionTimer = fishingTime;
    }

    member.actionTimer -= delta * CONFIG.simulationSpeed;
    if (member.actionTimer > 0) return;

    // Attempt to catch fish
    const success = FishingSystem.attemptCatch(member, task.target, fishingSystem);

    if (success) {
        // Caught fish! Spear is consumed (one-use only)
        const spearConsumed = useTool(member.inventory, 'fishing_spear');
        if (!spearConsumed) {
            // No spear left (shouldn't happen, but safety check)
            member.state = 'idle';
            member.task = null;
            fishingSystem.releaseFish(task.target, member.id);
            CarryingSystem.removeSpear(member); // Remove visual
            return;
        }
        
        // Remove spear visual if no spears left
        if (!FishingSystem.hasSpear(member.inventory)) {
            CarryingSystem.removeSpear(member);
        }

        // Add fish to inventory
        FishingSystem.addFishToInventory(member.inventory);
        FishingSystem.removeFish(task.target, fishList, scene);
        fishingSystem.releaseFish(task.target, member.id);

        // Award XP (fishing skill improves success rate)
        awardXP(member.skills, 'fishing', []);

        // Consume energy
        member.needs.energy = Math.max(0, member.needs.energy - 0.15);

        // Update carry visual
        CarryingSystem.updateCarryVisual(member);

        // Return to shore and haul to hut
        member.state = 'hauling';
        member.task = { type: 'haul_to_hut' };
        member.actionTimer = 0;

        logTest(`Agent ${member.id} caught a fish! (spear consumed)`, 'success');
    } else {
        // Missed - try again (spear not consumed on miss)
        member.actionTimer = fishingTime;
    }
}

function updateCrafting(member, delta) {
    const task = member.task;
    if (!task || task.type !== 'craft_spear' || !hut) {
        member.state = 'idle';
        member.task = null;
        return;
    }

    member.actionTimer -= delta;

    // Use improved crafting animation
    member.walkPhase += delta * 4;
    AnimationSystem.animateCrafting(member, delta, member.walkPhase);

    if (member.actionTimer > 0) return;

    if (!canCraft(hutAsInventory(), task.recipeId)) {
        member.state = 'idle';
        member.task = null;
        return;
    }

    consumeCraftingResources(hutAsInventory(), task.recipeId);
    
    // Check if agent already has max spears (2 max)
    const toolData = member.inventory.tools.get('fishing_spear');
    const currentSpearCount = toolData?.count || (toolData ? 1 : 0);
    const maxSpears = 2;
    
    if (currentSpearCount < maxSpears) {
        // Agent can carry more spears - give them one
        if (!addTool(member.inventory, 'fishing_spear')) {
            // Failed to add (shouldn't happen if check passed)
        } else {
            equipTool(member.inventory, 'fishing_spear');
            CarryingSystem.attachSpear(member);
        }
    }
    
    // Always store in hut (even if agent already has 2)
    hut.storage.fishing_spear = (hut.storage.fishing_spear || 0) + 1;

    awardXP(member.skills, 'craft_tool', []);

    member.state = 'idle';
    member.task = null;
}

function resolveTaskTargetPosition(member) {
    const task = member.task;
    if (!task) return null;

    // Tasks that go to hut
    if (task.type === 'haul_to_hut' || task.type === 'go_hut_for_food' ||
        task.type === 'patrol_to_hut' || task.type === 'go_hut_for_helping' ||
        task.type === 'get_spear_from_hut') {
        return hut ? hut.position : null;
    }

    // Gathering tasks
    if ((task.type === 'gather_coconuts' || task.type === 'gather_wood' || task.type === 'gather_stone') && task.target) {
        return task.target.position;
    }

    // Fishing task - go to shore position to throw spear from land (NEVER enter water)
    if (task.type === 'go_fishing' && task.target) {
        const fishPos = task.target.mesh.position;
        const waterLevel = CONFIG.waterLevel;
        const spot = FishingSystem.calculateFishingSpot(member.mesh.position, fishPos, waterLevel, CONFIG.islandRadius);
        // Use terrain height to ensure agent stays on land (SAFETY: always above water)
        const terrainY = getTerrainHeight(spot.x, spot.z);
        return new THREE.Vector3(spot.x, Math.max(terrainY, waterLevel + 0.5), spot.z);
    }
    
    // Emergency escape from water - go to nearest safe land
    if (task.type === 'escape_water') {
        const currentPos = member.mesh.position;
        const safeDist = CONFIG.islandRadius * 0.85; // Well on land
        const angle = Math.atan2(currentPos.z, currentPos.x);
        const safeX = Math.cos(angle) * safeDist;
        const safeZ = Math.sin(angle) * safeDist;
        const safeY = getTerrainHeight(safeX, safeZ);
        return new THREE.Vector3(safeX, safeY, safeZ);
    }

    // Helping another agent
    if (task.type === 'help_agent' && task.targetAgent) {
        const targetMember = tribeMembers.find(m => m.id === task.targetAgent);
        if (targetMember && targetMember.alive) {
            return targetMember.mesh.position;
        }
    }

    // Fishing
    if (task.type === 'go_fishing_spot') {
        const angle = Math.atan2(member.mesh.position.x, member.mesh.position.z);
        const dist = CONFIG.islandRadius * 1.1;
        return new THREE.Vector3(
            Math.sin(angle) * dist,
            CONFIG.waterLevel,
            Math.cos(angle) * dist
        );
    }

    return null;
}

function onDestinationReached(member) {
    const task = member.task;
    if (!task) {
        member.state = 'idle';
        return;
    }

    if (task.type === 'haul_to_hut' && hut) {
        // Deposit all carried stackable resources
        member.inventory.slots.forEach((slot, resourceId) => {
            const amount = slot.count;
            removeFromInventory(member.inventory, resourceId, amount);

            if (hut.storage[resourceId] == null) {
                hut.storage[resourceId] = 0;
            }
            hut.storage[resourceId] += amount;
        });

        CarryingSystem.clearCarryVisual(member);
        member.state = 'idle';
        member.task = null;
        return;
    }

    if (task.type === 'go_hut_for_food' && hut && hut.storage.coconut > 0) {
        // Take up to 2 coconuts to eat and maybe carry one
        const take = Math.min(2, hut.storage.coconut);
        hut.storage.coconut -= take;
        addToInventory(member.inventory, 'coconut', take);
        member.state = 'eating';
        member.task = { type: 'eat_from_inventory', resourceId: 'coconut' };
        return;
    }

    if (task.type === 'gather_coconuts' || task.type === 'gather_wood' || task.type === 'gather_stone') {
        member.state = 'gathering';
        member.actionTimer = 0;
        return;
    }

    if (task.type === 'go_fishing' && task.target) {
        // Check if fish is still nearby and in striking range
        if (FishingSystem.isInStrikingRange(member.mesh.position, task.target.mesh.position)) {
            member.state = 'fishing';
            member.actionTimer = 0;
            member.fishingPhase = 0; // For animation
            return;
        } else {
            // Fish moved away, replan
            member.state = 'idle';
            member.task = null;
            return;
        }
    }

    if (task.type === 'go_fishing_spot') {
        member.state = 'fishing';
        member.actionTimer = 3 + seededRandom() * 3;
        return;
    }

    // Patrol to hut - just arrive and go idle (ready for new tasks)
    if (task.type === 'patrol_to_hut') {
        member.state = 'idle';
        member.task = null;
        return;
    }

    // Go to hut to get food for helping
    if (task.type === 'go_hut_for_helping' && hut && hut.storage.coconut > tribeMembers.length) {
        // Take a coconut to give to someone in need
        const take = Math.min(2, hut.storage.coconut - tribeMembers.length);
        if (take > 0) {
            hut.storage.coconut -= take;
            addToInventory(member.inventory, 'coconut', take);
            CarryingSystem.updateCarryVisual(member);
        }
        member.state = 'idle';
        member.task = null;
        return;
    }

    // Get spear from hut
    if (task.type === 'get_spear_from_hut' && hut) {
        if (hut.storage.fishing_spear > 0) {
            const toolData = member.inventory.tools.get('fishing_spear');
            const currentCount = toolData?.count || (toolData ? 1 : 0);
            if (currentCount < 2) {
                if (addTool(member.inventory, 'fishing_spear')) {
                    hut.storage.fishing_spear--;
                    equipTool(member.inventory, 'fishing_spear');
                    CarryingSystem.attachSpear(member);
                }
            }
        }
        member.state = 'idle';
        member.task = null;
        return;
    }
    
    // Handle escape_water task completion
    if (task.type === 'escape_water') {
        member.state = 'idle';
        member.task = null;
        return;
    }
    
    // Help agent - give them food, fish, or spear
    if (task.type === 'help_agent') {
        const targetMember = tribeMembers.find(m => m.id === task.targetAgent);
        if (targetMember && targetMember.alive) {
            let helped = false;
            
            // Give fish if available
            if (getInventoryCount(member.inventory, 'fish') > 0 && targetMember.needs.hunger < 0.5) {
                removeFromInventory(member.inventory, 'fish', 1);
                addToInventory(targetMember.inventory, 'fish', 1);
                logTest(`Agent ${member.id} gave fish to ${targetMember.id}`, 'success');
                helped = true;
            }
            // Give coconut/food if available
            else if (hasFood(member.inventory) && targetMember.needs.hunger < 0.5) {
                removeFromInventory(member.inventory, 'coconut', 1);
                addToInventory(targetMember.inventory, 'coconut', 1);
                logTest(`Agent ${member.id} gave food to ${targetMember.id}`, 'success');
                helped = true;
            }
            // Give spear if target needs it for fishing (and we have extras)
            else if (task.giveSpear && member.inventory.tools.has('fishing_spear')) {
                const toolData = member.inventory.tools.get('fishing_spear');
                const spearCount = toolData?.count || 1;
                if (spearCount > 1 || !FishingSystem.hasSpear(targetMember.inventory)) {
                    // Remove one spear from us
                    if (toolData.count && toolData.count > 1) {
                        toolData.count--;
                    } else {
                        member.inventory.tools.delete('fishing_spear');
                        if (member.inventory.equippedTool === 'fishing_spear') {
                            member.inventory.equippedTool = null;
                            CarryingSystem.removeSpear(member);
                        }
                    }
                    // Give to target
                    addTool(targetMember.inventory, 'fishing_spear');
                    equipTool(targetMember.inventory, 'fishing_spear');
                    CarryingSystem.attachSpear(targetMember);
                    logTest(`Agent ${member.id} gave spear to ${targetMember.id}`, 'success');
                    helped = true;
                }
            }
            
            if (helped) {
                CarryingSystem.updateCarryVisual(member);
                CarryingSystem.updateCarryVisual(targetMember);
            }
        }
        CarryingSystem.clearCarryVisual(member);
        member.state = 'idle';
        member.task = null;
        return;
    }

    member.state = 'idle';
    member.task = null;
}

function handleEating(member) {
    const task = member.task;
    const resourceId = task?.resourceId || 'coconut';
    const removed = removeFromInventory(member.inventory, resourceId, 1);
    if (!removed) return;

    const nutrition = RESOURCES[resourceId.toUpperCase()]?.nutrition || CONFIG.coconutNutrition;
    const itemData = Array.isArray(removed) ? removed[0] : null;
    const isRaw = false;
    const isSpoiled = false;

    applyFoodToNeeds(member.needs, {
        nutrition,
        isRaw,
        isSpoiled
    });

    // If still hungry and has more, eat one more, else keep one to haul
    const remaining = getInventoryCount(member.inventory, resourceId);
    if (member.needs.hunger < 0.6 && remaining > 0) {
        applyFoodToNeeds(member.needs, { nutrition, isRaw, isSpoiled });
        removeFromInventory(member.inventory, resourceId, 1);
    }

    if (getInventoryCount(member.inventory, resourceId) > 0 && hut) {
        // Carry leftovers back to hut
        member.state = 'hauling';
        member.task = { type: 'haul_to_hut' };
        CarryingSystem.updateCarryVisual(member);
    }
}

// Helpers

function angleTo(from, to) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    return Math.atan2(dx, dz);
}

function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}

function findNearestPalmWithCoconuts(member, coordinator) {
    let nearest = null;
    let nearestDist = Infinity;

    allTrees.forEach(treeData => {
        if (treeData.mesh.userData.treeType === 'palm' && treeData.mesh.userData.coconuts > 0) {
            // Skip if already claimed by another agent
            if (coordinator && coordinator.isResourceClaimed(treeData.mesh, member.id)) {
                return;
            }

            const dist = treeData.mesh.position.distanceTo(member.mesh.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = treeData.mesh;
            }
        }
    });

    return nearest;
}

function findNearestWoodOrStone(member) {
    let best = null;
    let bestDist = Infinity;

    allTrees.forEach(treeData => {
        const dist = treeData.mesh.position.distanceTo(member.mesh.position);
        if (dist < bestDist) {
            bestDist = dist;
            best = { type: 'gather_wood', resourceId: 'wood', target: treeData.mesh };
        }
    });

    allRocks.forEach(rock => {
        const dist = rock.position.distanceTo(member.mesh.position);
        if (dist < bestDist) {
            bestDist = dist;
            best = { type: 'gather_stone', resourceId: 'stone', target: rock };
        }
    });

    return best;
}

function ensureCarryVisual(member) {
    if (member.carryMesh) return;

    const carryGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const carryMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    const carry = new THREE.Mesh(carryGeo, carryMat);
    carry.castShadow = true;

    carry.position.set(member.rightArm.position.x, member.rightArm.position.y - 0.1, member.rightArm.position.z + 0.15);
    member.mesh.add(carry);
    member.carryMesh = carry;
}

function clearCarryVisual(member) {
    if (member.carryMesh) {
        member.mesh.remove(member.carryMesh);
        member.carryMesh.geometry.dispose();
        member.carryMesh.material.dispose();
        member.carryMesh = null;
    }
}

function hutAsInventory() {
    // Minimal adapter so we can reuse crafting helpers on hut storage
    return {
        slots: new Map(Object.entries(hut.storage).map(([id, count]) => [id, { count, items: [] }])),
        maxSlots: 16
    };
}

// Additional helper functions for improved AI
function findNearestJungleTree(member, coordinator) {
    let nearest = null;
    let nearestDist = Infinity;

    allTrees.forEach(treeData => {
        // Skip if already claimed by another agent
        if (coordinator && coordinator.isResourceClaimed(treeData.mesh, member.id)) {
            return;
        }

        const dist = treeData.mesh.position.distanceTo(member.mesh.position);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = treeData.mesh;
        }
    });

    return nearest;
}

function findNearestRock(member, coordinator) {
    let nearest = null;
    let nearestDist = Infinity;

    allRocks.forEach(rock => {
        // Skip if already claimed by another agent
        if (coordinator && coordinator.isResourceClaimed(rock, member.id)) {
            return;
        }

        const dist = rock.position.distanceTo(member.mesh.position);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = rock;
        }
    });

    return nearest;
}

function findNearestFish(member) {
    // Use FishingSystem to find fish, checking claims
    return FishingSystem.findNearestFish(member, fishList, fishingSystem);
}

function hasSpear(member) {
    return FishingSystem.hasSpear(member.inventory);
}

function hasFood(inventory) {
    return getInventoryCount(inventory, 'coconut') > 0 ||
           getInventoryCount(inventory, 'fish') > 0;
}

function canCraftSpear(hut) {
    if (!hut) return false;
    return canCraft(hutAsInventory(), 'fishing_spear');
}

function getTotalSpearsInTribeAndHut() {
    let total = hut ? (hut.storage.fishing_spear || 0) : 0;
    tribeMembers.forEach(m => {
        const tools = m.inventory?.tools;
        if (tools?.has('fishing_spear')) {
            total += 1;
        }
    });
    return total;
}

// ============================================
// FISH UPDATE
// ============================================
function updateFish(delta) {
    // Update fish fleeing behavior
    fishList.forEach(fish => {
        // Check for nearby agents and flee
        FishingSystem.updateFishFleeing(fish, tribeMembers, delta, FISHING_CONFIG.FLEE_DISTANCE);

        // Normal swimming behavior
        fish.angle += delta * fish.speed * 0.3;
        fish.mesh.position.x = Math.cos(fish.angle) * fish.dist;
        fish.mesh.position.z = Math.sin(fish.angle) * fish.dist;
        fish.mesh.position.y = fish.yBase + Math.sin(clock.elapsedTime * 2 + fish.angle) * 0.25;
        fish.mesh.rotation.y = fish.angle + Math.PI / 2;
    });

    // Spawn new fish occasionally to maintain population
    if (seededRandom() < 0.01 * delta) { // Small chance per frame
        FishingSystem.spawnFish(
            scene,
            fishList,
            CONFIG.islandRadius,
            CONFIG.waterLevel,
            createSingleFish,
            fishCount
        );
    }

    // Clean up fishing system claims
    fishingSystem.cleanupClaims(tribeMembers);
}

// ============================================
// COCONUT REGENERATION
// ============================================
function regenerateCoconuts(delta) {
    allTrees.forEach(treeData => {
        if (treeData.mesh.userData.treeType === 'palm' && treeData.mesh.userData.coconuts < 3) {
            if (seededRandom() < 0.002 * delta) {
                treeData.mesh.userData.coconuts++;
                
                // Add visual coconut
                const coconutMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
                const coconutGeometry = new THREE.SphereGeometry(0.2, 8, 8);
                const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
                const angle = seededRandom() * Math.PI * 2;
                coconut.position.set(Math.cos(angle) * 0.6, 4.5 + seededRandom() * 2, Math.sin(angle) * 0.6);
                coconut.userData.isCoconut = true;
                treeData.mesh.add(coconut);
            }
        }
    });
}

// ============================================
// CAMERA CONTROLS
// ============================================
function setupControls() {
    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': controls.forward = true; break;
            case 'KeyS': controls.backward = true; break;
            case 'KeyA': controls.left = true; break;
            case 'KeyD': controls.right = true; break;
            case 'KeyQ': controls.down = true; break;
            case 'KeyE': controls.up = true; break;
            case 'ShiftLeft':
            case 'ShiftRight': controls.shift = true; break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': controls.forward = false; break;
            case 'KeyS': controls.backward = false; break;
            case 'KeyA': controls.left = false; break;
            case 'KeyD': controls.right = false; break;
            case 'KeyQ': controls.down = false; break;
            case 'KeyE': controls.up = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': controls.shift = false; break;
        }
    });
    
    renderer.domElement.addEventListener('click', () => {
        if (CONFIG.cameraMode === 'free') {
            renderer.domElement.requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
        const hint = document.getElementById('controls-hint');
        if (hint) hint.classList.toggle('hidden', isPointerLocked);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isPointerLocked || CONFIG.cameraMode !== 'free') return;
        
        cameraYaw -= e.movementX * CONFIG.cameraSensitivity;
        cameraPitch += e.movementY * CONFIG.cameraSensitivity;
        cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPitch));
    });
}

function updateCamera(delta) {
    if (CONFIG.cameraMode === 'orbit') {
        // Distant orbit camera
        const orbitRadius = CONFIG.islandRadius * 2.2;
        const orbitHeight = 80;
        
        orbitCameraAngle += delta * 0.08;
        
        camera.position.set(
            Math.cos(orbitCameraAngle) * orbitRadius,
            orbitHeight,
            Math.sin(orbitCameraAngle) * orbitRadius
        );
        
        camera.lookAt(0, 8, 0);
    } else {
        // Free fly
        const speed = CONFIG.cameraSpeed * (controls.shift ? 2.5 : 1) * delta;
        
        const forward = new THREE.Vector3(
            -Math.sin(cameraYaw) * Math.cos(cameraPitch),
            -Math.sin(cameraPitch),
            -Math.cos(cameraYaw) * Math.cos(cameraPitch)
        );
        const right = new THREE.Vector3(-Math.cos(cameraYaw), 0, Math.sin(cameraYaw));
        
        if (controls.forward) camera.position.addScaledVector(forward, speed);
        if (controls.backward) camera.position.addScaledVector(forward, -speed);
        if (controls.right) camera.position.addScaledVector(right, speed);
        if (controls.left) camera.position.addScaledVector(right, -speed);
        if (controls.up) camera.position.y += speed;
        if (controls.down) camera.position.y -= speed;
        
        // Keep above terrain
        const minY = Math.max(getTerrainHeight(camera.position.x, camera.position.z) + 2, 3);
        camera.position.y = Math.max(camera.position.y, minY);
        
        camera.rotation.order = 'YXZ';
        camera.rotation.y = cameraYaw;
        camera.rotation.x = -cameraPitch;
    }
}

// ============================================
// GUI
// ============================================
function setupGUI() {
    const gui = new GUI({ container: document.getElementById('gui-container') });
    gui.title('🏝️ Island Controls');
    
    // Simulation
    const simFolder = gui.addFolder('Simulation');
    simFolder.add(CONFIG, 'tribeMembers', 1, 25, 1).name('Agents').onChange(createTribeMembers);
    simFolder.add(CONFIG, 'walkSpeed', 0.5, 5, 0.1).name('Walk Speed');
    simFolder.add(CONFIG, 'simulationSpeed', 1, 50, 1).name('Speed (1x-50x)');
    
    // Time of Day
    const timeFolder = gui.addFolder('Time of Day');
    timeFolder.add(CONFIG, 'timeOfDay', 0, 1, 0.01).name('Time').onChange(updateTimeOfDay).listen();
    timeFolder.add(CONFIG, 'autoPlayTime').name('Auto-play');
    
    // Camera
    const camFolder = gui.addFolder('Camera');
    camFolder.add(CONFIG, 'cameraSpeed', 10, 150, 5).name('Speed');
    camFolder.add(CONFIG, 'cameraMode', ['free', 'orbit']).name('Mode').onChange(() => {
        if (CONFIG.cameraMode === 'free') {
            cameraYaw = 0;
            cameraPitch = 0;
        }
    });
    
    // Quality
    const qualityFolder = gui.addFolder('Quality');
    qualityFolder.add(CONFIG, 'visualQuality', ['high', 'low']).name('Visual').onChange((v) => {
        renderer.shadowMap.enabled = v === 'high';
        renderer.setPixelRatio(v === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
        sun.shadow.mapSize.width = v === 'high' ? 2048 : 1024;
        sun.shadow.mapSize.height = v === 'high' ? 2048 : 1024;
    });
    
    // Debug
    const debugFolder = gui.addFolder('Debug');
    debugFolder.add(CONFIG, 'showDebug').name('Show Stats').onChange((v) => {
        document.getElementById('debug-overlay').style.display = v ? 'block' : 'none';
    });
    debugFolder.add({ runChecks: () => runSanityChecks(scene, tribeMembers, allTrees) }, 'runChecks').name('Run Sanity Checks');
    debugFolder.add({ clearLog: clearTestLog }, 'clearLog').name('Clear Log');
    
    simFolder.open();
    timeFolder.open();
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
    requestAnimationFrame(animate);
    
    const frameDelta = Math.min(clock.getDelta(), 0.1);
    
    // FPS tracking
    frameCount++;
    const now = performance.now();
    if (now - lastFPSUpdate >= 1000) {
        currentFPS = frameCount;
        stepsPerSecond = stepCountThisSecond;
        frameCount = 0;
        stepCountThisSecond = 0;
        lastFPSUpdate = now;
    }
    
    // Fixed timestep simulation
    simulationAccumulator += frameDelta * CONFIG.simulationSpeed;
    
    let steps = 0;
    while (simulationAccumulator >= CONFIG.fixedTimestep && steps < CONFIG.maxStepsPerFrame) {
        stepSimulation(CONFIG.fixedTimestep);
        simulationAccumulator -= CONFIG.fixedTimestep;
        steps++;
        totalSimSteps++;
        stepCountThisSecond++;
    }
    
    // Update visuals
    updateVisuals(frameDelta);
    
    // Update stats
    const aliveAgents = tribeMembers.filter(m => m.alive).length;
    const coconutsAvailable = allTrees.reduce((sum, t) => sum + (t.mesh.userData.coconuts || 0), 0);
    
    updateStats({
        fps: currentFPS,
        stepsPerSecond: stepsPerSecond,
        agentsAlive: aliveAgents,
        deaths: totalDeaths,
        coconutsAvailable
    });
    
    // Render
    renderer.render(scene, camera);
}

function stepSimulation(delta) {
    updateTribeMembers(delta);
    regenerateCoconuts(delta);
}

function updateVisuals(delta) {
    // Water
    if (water) {
        water.material.uniforms['time'].value += delta * 0.4;
    }
    
    // Camera
    updateCamera(delta);
    
    // Fish
    updateFish(delta);
    
    // Time of day auto-play
    if (CONFIG.autoPlayTime) {
        CONFIG.timeOfDay += delta * 0.015;
        if (CONFIG.timeOfDay > 1) CONFIG.timeOfDay = 0;
        updateTimeOfDay();
    }
}

// ============================================
// RESIZE
// ============================================
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// ML-READY API
// ============================================
window.IslandSimulationAPI = {
    getState: () => tribeMembers.map(a => ({
        id: a.id,
        position: { x: a.mesh.position.x, y: a.mesh.position.y, z: a.mesh.position.z },
        hunger: a.hunger,
        energy: a.energy,
        alive: a.alive,
        state: a.state,
        inventory: { ...a.inventory }
    })),
    
    getEnvironmentState: () => ({
        trees: allTrees.map(t => ({
            position: { x: t.mesh.position.x, y: t.mesh.position.y, z: t.mesh.position.z },
            type: t.mesh.userData.treeType,
            coconuts: t.mesh.userData.coconuts || 0
        })),
        timeOfDay: CONFIG.timeOfDay,
        simulationSpeed: CONFIG.simulationSpeed
    }),
    
    setSimulationSpeed: (speed) => { CONFIG.simulationSpeed = Math.max(1, Math.min(50, speed)); },
    setTimeOfDay: (t) => { CONFIG.timeOfDay = Math.max(0, Math.min(1, t)); updateTimeOfDay(); },
    
    step: (n = 1) => { for (let i = 0; i < n; i++) stepSimulation(CONFIG.fixedTimestep); },
    
    reset: () => {
        resetSeed(CONFIG.seed);
        totalDeaths = 0;
        createTribeMembers();
        allTrees.forEach(t => {
            if (t.mesh.userData.treeType === 'palm') {
                t.mesh.userData.coconuts = 1 + Math.floor(seededRandom() * 3);
            }
        });
    },
    
    runSanityChecks: () => runSanityChecks(scene, tribeMembers, allTrees)
};

// ============================================
// START
// ============================================
init();

