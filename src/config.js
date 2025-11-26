// ============================================
// CONFIGURATION - Island Simulation
// ============================================

export const CONFIG = {
    // Agents
    tribeMembers: 10,
    walkSpeed: 2.0,
    
    // Camera
    cameraSpeed: 50,
    cameraSensitivity: 0.002,
    cameraMode: 'orbit', // Start with orbit for visual check
    
    // Island
    islandRadius: 100,
    palmTreeCount: 60,
    jungleTreeCount: 100,
    rockCount: 25,
    bushCount: 40,
    fishCount: 15,
    waterLevel: 0,
    
    // Simulation
    simulationSpeed: 1, // 1x to 50x
    timeOfDay: 0, // 0 = sunrise (DEFAULT), 0.5 = midday, 1 = sunset
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

