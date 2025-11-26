// ============================================
// TERRAIN HEIGHT UTILITIES
// ============================================

import { CONFIG, seededRandom } from '../config.js';

// Pre-computed island shape parameters
const islandSeed = {
    a: 3.7,
    b: 7.2,
    c: 2.1,
    d: 0.08
};

/**
 * Get terrain height at world coordinates (x, z)
 * Used for placing assets and keeping agents grounded
 */
export function getTerrainHeight(x, z) {
    // Angular variation for organic island shape
    const angle = Math.atan2(z, x);
    const radiusVariation = 1 + Math.sin(angle * 3 + islandSeed.a) * 0.12 + Math.sin(angle * 5 + islandSeed.b) * 0.08;
    const effectiveRadius = CONFIG.islandRadius * radiusVariation;
    
    const dist = Math.sqrt(x * x + z * z);
    const normalizedDist = dist / effectiveRadius;
    
    // Underwater area
    if (normalizedDist >= 1) {
        return -3 * (normalizedDist - 1) - 1;
    }
    
    // Island terrain - gentle rise from beach to center
    const falloff = 1 - Math.pow(normalizedDist, 1.8);
    let height = falloff * 12; // Max height ~12 units
    
    // Subtle terrain noise
    height += Math.sin(x * 0.04 + islandSeed.a) * Math.cos(z * 0.04) * 1.5;
    height += Math.sin((x + z) * 0.025 + islandSeed.b) * 2;
    
    // Central hill
    if (normalizedDist < 0.35) {
        height += (0.35 - normalizedDist) * 8;
    }
    
    return Math.max(0.3, height);
}

/**
 * Check if position is valid land (above water, within island)
 */
export function isValidLandPosition(x, z, minHeight = 2) {
    const height = getTerrainHeight(x, z);
    const dist = Math.sqrt(x * x + z * z);
    return height >= minHeight && dist < CONFIG.islandRadius * 0.9;
}

/**
 * Get random valid position on island
 */
export function getRandomIslandPosition(minDist = 5, maxDist = null, minHeight = 2, maxAttempts = 100) {
    maxDist = maxDist || CONFIG.islandRadius * 0.8;
    
    for (let i = 0; i < maxAttempts; i++) {
        const angle = seededRandom() * Math.PI * 2;
        const dist = minDist + seededRandom() * (maxDist - minDist);
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getTerrainHeight(x, z);
        
        if (y >= minHeight) {
            return { x, y, z };
        }
    }
    
    // Fallback to center
    return { x: 0, y: getTerrainHeight(0, 0), z: 0 };
}

/**
 * Snap an object to terrain height
 */
export function snapToTerrain(object, offsetY = 0) {
    const height = getTerrainHeight(object.position.x, object.position.z);
    object.position.y = height + offsetY;
}

