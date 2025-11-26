// ============================================
// CONFIGURATION - Island Simulation
// ============================================

export const VERSION = '2.0.0'; // Balance overhaul: spears, fishing, resources

// Build number - increments with each commit (27 = current commit count)
export const BUILD_NUMBER = 27;

export const CONFIG = {
    // Agents
    tribeMembers: 10,
    walkSpeed: 2.0,
    
    // Camera
    cameraSpeed: 50,
    cameraSensitivity: 0.002,
    cameraMode: 'orbit', // Start with orbit for visual check
    
    // Island - Resources scale with agent count
    islandRadius: 100,
    // Base counts per agent (will be multiplied by tribeMembers in init)
    palmTreesPerAgent: 6,
    jungleTreesPerAgent: 10,
    rocksPerAgent: 2.5,
    bushesPerAgent: 4,
    fishPerAgent: 1.5,
    waterLevel: 0,
    
    // Simulation
    simulationSpeed: 50, // 1x to 50x (default: 50x for testing)
    timeOfDay: 0.23, // 0 = sunrise, 0.5 = midday, 1 = sunset (DEFAULT: 0.23 = morning)
    autoPlayTime: false,
    visualQuality: 'high', // 'high' or 'low'
    showDebug: true,
    
    // Agent needs rates
    hungerDecayRate: 0.015, // per second
    hungerMovingMultiplier: 1.3, // faster when moving
    energyDecayRate: 0.012, // per second when moving
    energyRestoreRate: 0.04, // per second when resting
    coconutNutrition: 0.35, // hunger restored per coconut
    
    // Fixed timestep for ML training
    fixedTimestep: 1/20, // 20 FPS logic updates
    maxStepsPerFrame: 50, // Cap steps per frame for high-speed
    
    // Deterministic seed
    seed: 12345,
    
    // Sanity check thresholds
    floatingThreshold: 0.5, // Max distance asset can be above terrain
    sinkingThreshold: 1.0, // Max distance asset can be below terrain
};

// Simple seeded random for determinism
let _seed = CONFIG.seed;
export function seededRandom() {
    _seed = (_seed * 9301 + 49297) % 233280;
    return _seed / 233280;
}

export function resetSeed(seed = CONFIG.seed) {
    _seed = seed;
}

