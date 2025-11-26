// ============================================
// FISHING SYSTEM OVERHAUL
// ============================================
// Comprehensive spearfishing mechanics with wading, targeting, and catching

import { seededRandom } from '../config.js';

/**
 * Fishing System - manages all fishing-related mechanics
 * Includes spearfishing, wading, fish targeting, and catching
 */
export class FishingSystem {
    constructor() {
        this.claimedFish = new Map(); // fishId -> agentId
        this.fishingAttempts = new Map(); // agentId -> attempt count
    }

    /**
     * Clean up stale fish claims
     */
    cleanupClaims(activeAgents) {
        const activeIds = new Set(activeAgents.map(a => a.id));
        for (const [fishId, agentId] of this.claimedFish.entries()) {
            if (!activeIds.has(agentId)) {
                this.claimedFish.delete(fishId);
            }
        }
    }

    /**
     * Check if a fish is already claimed
     */
    isFishClaimed(fish, agentId) {
        const fishId = fish.mesh.uuid;
        const claimingAgent = this.claimedFish.get(fishId);
        return claimingAgent && claimingAgent !== agentId;
    }

    /**
     * Claim a fish for an agent
     */
    claimFish(fish, agentId) {
        const fishId = fish.mesh.uuid;
        this.claimedFish.set(fishId, agentId);
    }

    /**
     * Release a fish claim
     */
    releaseFish(fish, agentId) {
        const fishId = fish.mesh.uuid;
        if (this.claimedFish.get(fishId) === agentId) {
            this.claimedFish.delete(fishId);
        }
    }

    /**
     * Find nearest unclaimed fish for an agent
     * Only looks for fish in shallow water (depth < 5)
     */
    static findNearestFish(agent, fishList, fishingSystem) {
        let nearest = null;
        let minDist = Infinity;

        fishList.forEach(fish => {
            // Only target fish in shallow water (catchable depth)
            const fishDepth = Math.abs(fish.mesh.position.y);
            if (fishDepth > 5) return;

            // Check if already claimed by another agent
            if (fishingSystem && fishingSystem.isFishClaimed(fish, agent.id)) {
                return;
            }

            const dist = agent.mesh.position.distanceTo(fish.mesh.position);
            if (dist < minDist && dist < 30) { // Max detection range: 30 units
                minDist = dist;
                nearest = fish;
            }
        });

        return nearest;
    }

    /**
     * Check if agent has a fishing spear equipped
     */
    static hasSpear(inventory) {
        if (!inventory || !inventory.equipped) return false;
        return inventory.equipped.toolId === 'fishing_spear';
    }

    /**
     * Check if agent is in fishable water depth
     * Fishable depth: 0.5 to 3 units below water level
     */
    static isInFishableDepth(agentPosition, waterLevel) {
        const depth = waterLevel - agentPosition.y;
        return depth >= 0.5 && depth <= 3.0;
    }

    /**
     * Calculate optimal fishing spot near a fish
     * Returns a position in shallow water near the target fish
     */
    static calculateFishingSpot(agentPosition, fishPosition, waterLevel) {
        // Get direction from agent to fish
        const dx = fishPosition.x - agentPosition.x;
        const dz = fishPosition.z - agentPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.1) return fishPosition.clone();

        // Normalize
        const ndx = dx / dist;
        const ndz = dz / dist;

        // Calculate spot 2-3 units away from fish (spear reach distance)
        const reachDistance = 2.5;
        const spotX = fishPosition.x - ndx * reachDistance;
        const spotZ = fishPosition.z - ndz * reachDistance;

        // Set Y to be in shallow water (0.8 units below water surface)
        const spotY = waterLevel - 0.8;

        return { x: spotX, y: spotY, z: spotZ };
    }

    /**
     * Check if agent is close enough to fish to attempt catching
     */
    static isInStrikingRange(agentPosition, fishPosition) {
        const dx = agentPosition.x - fishPosition.x;
        const dz = agentPosition.z - fishPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Must be within 3 units horizontally
        return dist <= 3.5;
    }

    /**
     * Attempt to catch a fish
     * Success rate depends on skill and randomness
     */
    static attemptCatch(agent, fish, fishingSystem) {
        if (!fishingSystem) return false;

        // Get attempt count for this agent
        const attempts = fishingSystem.fishingAttempts.get(agent.id) || 0;
        fishingSystem.fishingAttempts.set(agent.id, attempts + 1);

        // Base success rate: 30%
        // Increases with fishing skill (if implemented)
        // Decreases if agent is low energy
        let successRate = 0.30;

        // Bonus from fishing skill (if exists)
        if (agent.skills && agent.skills.fishing) {
            successRate += agent.skills.fishing.level * 0.05;
        }

        // Penalty from low energy
        if (agent.needs.energy < 0.3) {
            successRate *= 0.5;
        }

        // Bonus for persistent attempts (slight increase per attempt)
        successRate += Math.min(attempts * 0.02, 0.15);

        // Roll for success
        const roll = seededRandom();
        const success = roll < successRate;

        if (success) {
            // Reset attempt counter on success
            fishingSystem.fishingAttempts.delete(agent.id);
            return true;
        }

        return false;
    }

    /**
     * Add caught fish to inventory
     * Fish count as food (similar to coconuts but better nutrition)
     */
    static addFishToInventory(inventory) {
        if (!inventory || !inventory.slots) return false;

        // Check if inventory has space
        const totalItems = Array.from(inventory.slots.values()).reduce((sum, slot) => sum + slot.count, 0);
        if (totalItems >= inventory.capacity) return false;

        // Add fish to inventory
        if (inventory.slots.has('fish')) {
            inventory.slots.get('fish').count += 1;
        } else {
            inventory.slots.set('fish', { resourceId: 'fish', count: 1 });
        }

        return true;
    }

    /**
     * Remove caught fish from world
     */
    static removeFish(fish, fishList, scene) {
        const index = fishList.indexOf(fish);
        if (index > -1) {
            fishList.splice(index, 1);
        }

        // Remove mesh from scene
        if (scene && fish.mesh) {
            scene.remove(fish.mesh);

            // Dispose of geometry and materials
            fish.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    /**
     * Spawn new fish to maintain population
     * Called periodically to replace caught fish
     */
    static spawnFish(scene, fishList, islandRadius, waterLevel, createSingleFish, maxFish = 20) {
        if (fishList.length >= maxFish) return null;

        const angle = seededRandom() * Math.PI * 2;
        const dist = islandRadius * (1 + seededRandom() * 0.8);

        const fishColors = [0xff6b35, 0xffd700, 0x4ecdc4, 0xff69b4, 0x87ceeb];
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

        return fish;
    }

    /**
     * Calculate wading speed based on water depth
     * Deeper water = slower movement
     */
    static getWadingSpeed(agentPosition, waterLevel, baseSpeed) {
        const depth = waterLevel - agentPosition.y;

        if (depth <= 0) {
            // On land, normal speed
            return baseSpeed;
        } else if (depth < 0.5) {
            // Ankle deep, slight slowdown
            return baseSpeed * 0.85;
        } else if (depth < 1.5) {
            // Knee to waist deep, moderate slowdown
            return baseSpeed * 0.60;
        } else if (depth < 2.5) {
            // Chest deep, significant slowdown
            return baseSpeed * 0.40;
        } else {
            // Too deep for wading, very slow (swimming)
            return baseSpeed * 0.25;
        }
    }

    /**
     * Check if position is too deep for safe wading
     */
    static isTooDeep(position, waterLevel) {
        const depth = waterLevel - position.y;
        return depth > 3.0; // More than 3 units deep is too dangerous
    }

    /**
     * Get water depth at position
     */
    static getWaterDepth(position, waterLevel) {
        return Math.max(0, waterLevel - position.y);
    }

    /**
     * Check if agent should cancel fishing due to danger
     * (too deep, low energy, low health)
     */
    static shouldCancelFishing(agent, waterLevel) {
        // Too deep
        if (this.isTooDeep(agent.mesh.position, waterLevel)) {
            return true;
        }

        // Too low energy (might drown)
        if (agent.needs.energy < 0.15) {
            return true;
        }

        // Too low health
        if (agent.needs.health < 0.2) {
            return true;
        }

        return false;
    }

    /**
     * Update fish AI to flee from nearby agents
     * Makes fishing more challenging and realistic
     */
    static updateFishFleeing(fish, agents, delta, fleeDistance = 4.0) {
        // Check for nearby agents in water
        let nearestAgent = null;
        let minDist = Infinity;

        agents.forEach(agent => {
            if (!agent.alive) return;

            // Only flee from agents in water
            const agentDepth = this.getWaterDepth(agent.mesh.position, 0); // waterLevel passed separately
            if (agentDepth < 0.3) return;

            const dist = agent.mesh.position.distanceTo(fish.mesh.position);
            if (dist < minDist && dist < fleeDistance) {
                minDist = dist;
                nearestAgent = agent;
            }
        });

        if (nearestAgent && minDist < fleeDistance) {
            // Flee away from agent
            const fleeStrength = (1 - minDist / fleeDistance) * 2.0;

            const dx = fish.mesh.position.x - nearestAgent.mesh.position.x;
            const dz = fish.mesh.position.z - nearestAgent.mesh.position.z;
            const len = Math.sqrt(dx * dx + dz * dz);

            if (len > 0.1) {
                const ndx = dx / len;
                const ndz = dz / len;

                // Update angle to flee
                fish.angle = Math.atan2(ndz, ndx);
                fish.speed = Math.min(fish.speed * (1 + fleeStrength), 1.5);
            }
        } else {
            // Gradually return to normal speed
            fish.speed = 0.2 + seededRandom() * 0.3;
        }
    }
}

/**
 * Fishing task types
 */
export const FISHING_TASKS = {
    FIND_FISH: 'find_fish',
    WADE_TO_SPOT: 'wade_to_fishing_spot',
    SPEARFISH: 'spearfishing',
    RETURN_WITH_CATCH: 'return_with_fish'
};

/**
 * Fishing configuration
 */
export const FISHING_CONFIG = {
    MIN_DEPTH: 0.5,          // Minimum depth to fish
    MAX_DEPTH: 3.0,          // Maximum safe depth
    STRIKING_RANGE: 3.5,     // Distance to attempt catch
    FLEE_DISTANCE: 4.0,      // Distance fish flee from agents
    BASE_SUCCESS_RATE: 0.30, // 30% base catch rate
    SPEAR_REACH: 2.5,        // Optimal distance from fish
    MAX_FISH_SPAWN: 20       // Maximum fish population
};
