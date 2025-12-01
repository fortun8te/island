// ============================================
// NS TRAIN SIMULATION - Amsterdam ↔ Amersfoort
// ============================================

import * as THREE from 'three';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // Train types
    SPRINTER_INTERVAL: 300, // 5 minutes in seconds
    INTERCITY_INTERVAL: 600, // 10 minutes in seconds

    // Physics
    SPRINTER_MAX_SPEED: 30, // units per second (represents ~130 km/h)
    INTERCITY_MAX_SPEED: 45, // units per second (represents ~200 km/h)
    ACCELERATION: 8, // units per second²
    DECELERATION: 12, // units per second²

    // Track layout
    TRACK_LENGTH: 200,
    TRACK_SPACING: 2, // distance between two tracks
    SEGMENT_LENGTH: 20, // length of each blocking segment

    // Station positions (0 to 1 along track)
    STATIONS: [
        { name: 'Amsterdam Centraal', position: 0.05 },
        { name: 'Hilversum', position: 0.5 },
        { name: 'Amersfoort', position: 0.95 }
    ],

    STATION_STOP_TIME: 30 // seconds
};

// ============================================
// GLOBAL STATE
// ============================================

let scene, camera, renderer, clock;
let tracks = { northbound: null, southbound: null };
let stations = [];
let signals = [];
let trains = [];
let selectedTrain = null;
let segments = [];

// Timetable state
let simulationTime = 0;
let nextSprinterSpawn = 0;
let nextIntercitySpawn = 0;

// Raycaster for clicking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ============================================
// SEGMENT SYSTEM (for blocking logic)
// ============================================

class TrackSegment {
    constructor(startPos, endPos, track) {
        this.startPos = startPos;
        this.endPos = endPos;
        this.track = track; // 'northbound' or 'southbound'
        this.occupiedBy = null;
    }

    isOccupied() {
        return this.occupiedBy !== null;
    }

    occupy(train) {
        this.occupiedBy = train;
    }

    release() {
        this.occupiedBy = null;
    }

    contains(position) {
        return position >= this.startPos && position <= this.endPos;
    }
}

function createSegments() {
    const numSegments = Math.ceil(CONFIG.TRACK_LENGTH / CONFIG.SEGMENT_LENGTH);

    for (let i = 0; i < numSegments; i++) {
        const startPos = i * CONFIG.SEGMENT_LENGTH;
        const endPos = Math.min((i + 1) * CONFIG.SEGMENT_LENGTH, CONFIG.TRACK_LENGTH);

        segments.push({
            northbound: new TrackSegment(startPos, endPos, 'northbound'),
            southbound: new TrackSegment(startPos, endPos, 'southbound')
        });
    }
}

function getSegmentForPosition(position, track) {
    for (let seg of segments) {
        if (seg[track].contains(position)) {
            return seg[track];
        }
    }
    return null;
}

function getNextSegment(currentSegment, direction) {
    const index = segments.findIndex(s =>
        s.northbound === currentSegment || s.southbound === currentSegment
    );

    if (index === -1) return null;

    const nextIndex = direction === 'forward' ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= segments.length) return null;

    return segments[nextIndex][currentSegment.track];
}

// ============================================
// SIGNAL SYSTEM
// ============================================

class Signal {
    constructor(position, track) {
        this.position = position;
        this.track = track;
        this.state = 'green'; // 'red' or 'green'

        // Create visual representation
        const geometry = new THREE.BoxGeometry(0.5, 3, 0.5);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.pole = new THREE.Mesh(geometry, poleMaterial);

        const lightGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        this.lightMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5
        });
        this.light = new THREE.Mesh(lightGeometry, this.lightMaterial);
        this.light.position.y = 2;

        this.group = new THREE.Group();
        this.group.add(this.pole);
        this.group.add(this.light);

        // Position signal
        const offset = track === 'northbound' ? -CONFIG.TRACK_SPACING/2 - 2 : CONFIG.TRACK_SPACING/2 + 2;
        this.group.position.set(position - CONFIG.TRACK_LENGTH/2, 0, offset);
    }

    setRed() {
        this.state = 'red';
        this.lightMaterial.color.setHex(0xff0000);
        this.lightMaterial.emissive.setHex(0xff0000);
    }

    setGreen() {
        this.state = 'green';
        this.lightMaterial.color.setHex(0x00ff00);
        this.lightMaterial.emissive.setHex(0x00ff00);
    }

    update(segment) {
        // Check if next segment is occupied
        const nextSeg = getNextSegment(segment, 'forward');
        if (nextSeg && nextSeg.isOccupied()) {
            this.setRed();
        } else {
            this.setGreen();
        }
    }
}

// ============================================
// TRAIN CLASS
// ============================================

class Train {
    constructor(type, track) {
        this.type = type; // 'sprinter' or 'intercity'
        this.track = track; // 'northbound' or 'southbound'
        this.position = track === 'northbound' ? 0 : CONFIG.TRACK_LENGTH;
        this.velocity = 0;
        this.maxSpeed = type === 'sprinter' ? CONFIG.SPRINTER_MAX_SPEED : CONFIG.INTERCITY_MAX_SPEED;
        this.state = 'running'; // 'running', 'stopping_at_station', 'stopped_at_station', 'waiting_for_signal'
        this.stationStopTimer = 0;
        this.currentSegment = null;
        this.direction = track === 'northbound' ? 1 : -1;
        this.delay = 0;

        // Create visual representation
        const length = type === 'sprinter' ? 8 : 12;
        const geometry = new THREE.BoxGeometry(length, 2, 1.5);
        const color = type === 'sprinter' ? 0xFFC917 : 0x003082;
        const material = new THREE.MeshStandardMaterial({ color });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData.train = this;

        this.updatePosition();
        scene.add(this.mesh);
    }

    updatePosition() {
        const offset = this.track === 'northbound' ? -CONFIG.TRACK_SPACING/2 : CONFIG.TRACK_SPACING/2;
        this.mesh.position.set(
            this.position - CONFIG.TRACK_LENGTH/2,
            1,
            offset
        );

        // Rotate to face direction of travel
        this.mesh.rotation.y = this.direction === 1 ? 0 : Math.PI;
    }

    update(deltaTime) {
        // Update segment occupancy
        const newSegment = getSegmentForPosition(this.position, this.track);
        if (newSegment !== this.currentSegment) {
            if (this.currentSegment) {
                this.currentSegment.release();
            }
            if (newSegment) {
                newSegment.occupy(this);
            }
            this.currentSegment = newSegment;
        }

        // State machine
        switch (this.state) {
            case 'running':
                this.updateRunning(deltaTime);
                break;
            case 'stopping_at_station':
                this.updateStoppingAtStation(deltaTime);
                break;
            case 'stopped_at_station':
                this.updateStoppedAtStation(deltaTime);
                break;
            case 'waiting_for_signal':
                this.updateWaitingForSignal(deltaTime);
                break;
        }

        this.updatePosition();
    }

    updateRunning(deltaTime) {
        // Check if we need to stop at a station
        const nextStation = this.getNextStation();
        if (nextStation) {
            const stationPos = nextStation.position * CONFIG.TRACK_LENGTH;
            const distanceToStation = Math.abs(this.position - stationPos);

            // Calculate braking distance
            const brakingDistance = (this.velocity * this.velocity) / (2 * CONFIG.DECELERATION);

            if (distanceToStation <= brakingDistance + 2) {
                this.state = 'stopping_at_station';
                this.targetStationPos = stationPos;
                return;
            }
        }

        // Check signals
        const nextSegment = getNextSegment(this.currentSegment, 'forward');
        if (nextSegment && nextSegment.isOccupied()) {
            // Red signal ahead - start braking
            this.state = 'waiting_for_signal';
            return;
        }

        // Accelerate to max speed
        if (this.velocity < this.maxSpeed) {
            this.velocity = Math.min(this.maxSpeed, this.velocity + CONFIG.ACCELERATION * deltaTime);
        }

        this.position += this.velocity * deltaTime * this.direction;
    }

    updateStoppingAtStation(deltaTime) {
        const distanceToStop = Math.abs(this.position - this.targetStationPos);

        if (distanceToStop < 0.5 && this.velocity < 1) {
            // Arrived at station
            this.velocity = 0;
            this.position = this.targetStationPos;
            this.state = 'stopped_at_station';
            this.stationStopTimer = CONFIG.STATION_STOP_TIME;
        } else {
            // Decelerate
            this.velocity = Math.max(0, this.velocity - CONFIG.DECELERATION * deltaTime);
            this.position += this.velocity * deltaTime * this.direction;
        }
    }

    updateStoppedAtStation(deltaTime) {
        this.stationStopTimer -= deltaTime;
        if (this.stationStopTimer <= 0) {
            this.state = 'running';
        }
    }

    updateWaitingForSignal(deltaTime) {
        // Decelerate
        this.velocity = Math.max(0, this.velocity - CONFIG.DECELERATION * deltaTime);

        if (this.velocity > 0) {
            this.position += this.velocity * deltaTime * this.direction;
        }

        // Check if signal is clear
        const nextSegment = getNextSegment(this.currentSegment, 'forward');
        if (!nextSegment || !nextSegment.isOccupied()) {
            this.state = 'running';
        }
    }

    getNextStation() {
        for (let station of CONFIG.STATIONS) {
            const stationPos = station.position * CONFIG.TRACK_LENGTH;

            if (this.direction === 1 && stationPos > this.position) {
                return station;
            } else if (this.direction === -1 && stationPos < this.position) {
                return station;
            }
        }
        return null;
    }

    isOffTrack() {
        if (this.direction === 1 && this.position > CONFIG.TRACK_LENGTH) return true;
        if (this.direction === -1 && this.position < 0) return true;
        return false;
    }

    destroy() {
        if (this.currentSegment) {
            this.currentSegment.release();
        }
        scene.remove(this.mesh);
    }
}

// ============================================
// SCENE SETUP
// ============================================

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE8F4F8);
    scene.fog = new THREE.Fog(0xE8F4F8, 100, 300);

    // Camera - angled top-down view
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.set(0, 150, 100);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7CB342,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    scene.add(ground);

    // Create track
    createTrack();

    // Create stations
    createStations();

    // Create segments
    createSegments();

    // Create signals (between segments)
    createSignals();

    // Clock
    clock = new THREE.Clock();

    // Mouse events
    window.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onWindowResize);

    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
    }, 500);

    // Start animation
    animate();
}

function createTrack() {
    const trackMaterial = new THREE.MeshStandardMaterial({
        color: 0x4A4A4A,
        metalness: 0.8,
        roughness: 0.2
    });

    // Northbound track
    const northGeometry = new THREE.BoxGeometry(CONFIG.TRACK_LENGTH, 0.2, 0.8);
    const northTrack = new THREE.Mesh(northGeometry, trackMaterial);
    northTrack.position.set(0, 0, -CONFIG.TRACK_SPACING/2);
    scene.add(northTrack);
    tracks.northbound = northTrack;

    // Southbound track
    const southGeometry = new THREE.BoxGeometry(CONFIG.TRACK_LENGTH, 0.2, 0.8);
    const southTrack = new THREE.Mesh(southGeometry, trackMaterial);
    southTrack.position.set(0, 0, CONFIG.TRACK_SPACING/2);
    scene.add(southTrack);
    tracks.southbound = southTrack;

    // Sleepers (railroad ties)
    const sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    for (let i = 0; i < CONFIG.TRACK_LENGTH; i += 2) {
        const sleeperGeometry = new THREE.BoxGeometry(0.3, 0.15, CONFIG.TRACK_SPACING * 2);
        const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial);
        sleeper.position.set(i - CONFIG.TRACK_LENGTH/2, -0.1, 0);
        scene.add(sleeper);
    }
}

function createStations() {
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });

    for (let stationConfig of CONFIG.STATIONS) {
        const x = stationConfig.position * CONFIG.TRACK_LENGTH - CONFIG.TRACK_LENGTH/2;

        // Platform
        const platformGeometry = new THREE.BoxGeometry(12, 0.5, 8);
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(x, 0.25, 0);
        scene.add(platform);

        // Station building (simple box)
        const buildingGeometry = new THREE.BoxGeometry(10, 5, 6);
        const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(x, 2.5, 8);
        scene.add(building);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(7, 2, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xCC0000 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(x, 6, 8);
        scene.add(roof);

        // Create text label using CSS2DRenderer alternative - simple sprite
        createStationLabel(x, stationConfig.name);

        stations.push({
            name: stationConfig.name,
            position: stationConfig.position,
            mesh: platform
        });
    }
}

function createStationLabel(x, name) {
    // Create a simple box with text representation
    const labelGeometry = new THREE.BoxGeometry(8, 1, 0.1);
    const labelMaterial = new THREE.MeshStandardMaterial({ color: 0x003082 });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(x, 7, 8);
    scene.add(label);
}

function createSignals() {
    // Create signals between stations
    const signalPositions = [30, 60, 90, 120, 150, 180];

    for (let pos of signalPositions) {
        // Northbound signal
        const northSignal = new Signal(pos, 'northbound');
        scene.add(northSignal.group);
        signals.push(northSignal);

        // Southbound signal
        const southSignal = new Signal(pos, 'southbound');
        scene.add(southSignal.group);
        signals.push(southSignal);
    }
}

// ============================================
// TIMETABLE & SPAWNING
// ============================================

function updateTimetable(deltaTime) {
    simulationTime += deltaTime;

    // Spawn Sprinter
    if (simulationTime >= nextSprinterSpawn) {
        spawnTrain('sprinter');
        nextSprinterSpawn = simulationTime + CONFIG.SPRINTER_INTERVAL;
    }

    // Spawn Intercity
    if (simulationTime >= nextIntercitySpawn) {
        spawnTrain('intercity');
        nextIntercitySpawn = simulationTime + CONFIG.INTERCITY_INTERVAL;
    }
}

function spawnTrain(type) {
    // Alternate between northbound and southbound
    const track = trains.length % 2 === 0 ? 'northbound' : 'southbound';
    const train = new Train(type, track);
    trains.push(train);
}

// ============================================
// UPDATE & ANIMATION
// ============================================

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update timetable
    updateTimetable(deltaTime);

    // Update all trains
    for (let i = trains.length - 1; i >= 0; i--) {
        const train = trains[i];
        train.update(deltaTime);

        // Remove trains that are off track
        if (train.isOffTrack()) {
            train.destroy();
            trains.splice(i, 1);
        }
    }

    // Update signals
    for (let signal of signals) {
        const segment = getSegmentForPosition(signal.position, signal.track);
        if (segment) {
            signal.update(segment);
        }
    }

    // Update UI
    updateUI();

    // Render
    renderer.render(scene, camera);
}

// ============================================
// UI UPDATES
// ============================================

function updateUI() {
    // Update time
    const hours = Math.floor(simulationTime / 3600) % 24;
    const minutes = Math.floor((simulationTime % 3600) / 60);
    const seconds = Math.floor(simulationTime % 60);
    document.getElementById('current-time').textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update active trains
    document.getElementById('active-trains').textContent = trains.length;

    // Update next trains
    const nextTrainsHTML = [];

    const timeToNextSprinter = Math.max(0, nextSprinterSpawn - simulationTime);
    const timeToNextIntercity = Math.max(0, nextIntercitySpawn - simulationTime);

    if (timeToNextSprinter < 600) {
        const mins = Math.floor(timeToNextSprinter / 60);
        const secs = Math.floor(timeToNextSprinter % 60);
        nextTrainsHTML.push(
            `<div><span class="train-badge badge-sprinter">SPR</span> <span>over ${mins}:${secs.toString().padStart(2, '0')}</span></div>`
        );
    }

    if (timeToNextIntercity < 600) {
        const mins = Math.floor(timeToNextIntercity / 60);
        const secs = Math.floor(timeToNextIntercity % 60);
        nextTrainsHTML.push(
            `<div><span class="train-badge badge-intercity">IC</span> <span>over ${mins}:${secs.toString().padStart(2, '0')}</span></div>`
        );
    }

    document.getElementById('next-trains').innerHTML = nextTrainsHTML.join('');

    // Update selected train info
    if (selectedTrain && trains.includes(selectedTrain)) {
        document.getElementById('selected-train-info').classList.remove('hidden');
        document.getElementById('selected-type').innerHTML =
            selectedTrain.type === 'sprinter'
                ? '<span class="train-type-sprinter">Sprinter</span>'
                : '<span class="train-type-intercity">Intercity</span>';

        const speedKmh = Math.round(selectedTrain.velocity * 3.6); // rough conversion
        document.getElementById('selected-speed').textContent = `${speedKmh} km/u`;

        document.getElementById('selected-direction').textContent =
            selectedTrain.track === 'northbound' ? 'Amsterdam → Amersfoort' : 'Amersfoort → Amsterdam';

        document.getElementById('selected-delay').textContent = `${selectedTrain.delay} min`;

        // Highlight selected train
        selectedTrain.mesh.material.emissive = new THREE.Color(0x444444);
        selectedTrain.mesh.material.emissiveIntensity = 0.3;
    } else {
        document.getElementById('selected-train-info').classList.add('hidden');
        selectedTrain = null;
    }

    // Remove highlight from non-selected trains
    for (let train of trains) {
        if (train !== selectedTrain) {
            train.mesh.material.emissive = new THREE.Color(0x000000);
            train.mesh.material.emissiveIntensity = 0;
        }
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(trains.map(t => t.mesh));

    if (intersects.length > 0) {
        const clickedTrain = intersects[0].object.userData.train;
        selectedTrain = clickedTrain;
    } else {
        selectedTrain = null;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// START
// ============================================

init();
