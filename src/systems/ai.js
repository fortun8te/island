// ============================================
// IMPROVED AGENT AI SYSTEM
// ============================================
// This module provides 100% goal-oriented behavior with
// tribe-level coordination and no random wandering.

import { seededRandom } from '../config.js';

/**
 * Tribe-level task coordination system
 * Analyzes tribe needs and assigns optimal tasks to agents
 */
export class TribeCoordinator {
    constructor() {
        this.taskAssignments = new Map(); // agentId -> assigned task priority
        this.criticalNeeds = new Map(); // agentId -> { hunger, energy, needsHelp }
        this.claimedResources = new Map(); // resourceTargetId -> agentId (prevents duplicates)
    }

    /**
     * Analyze tribe state and update critical needs
     * Also clean up old resource claims
     */
    analyzeTribe(tribeMembers, hut) {
        this.criticalNeeds.clear();

        // Clean up resource claims for agents no longer targeting them
        const activeAgents = new Set(tribeMembers.map(m => m.id));
        for (const [resourceId, agentId] of this.claimedResources.entries()) {
            if (!activeAgents.has(agentId)) {
                this.claimedResources.delete(resourceId);
            }
        }

        // Also clean claims where agent changed task
        tribeMembers.forEach(member => {
            if (!member.task || !member.task.target) {
                // Agent not targeting a resource, clear their claims
                for (const [resourceId, agentId] of this.claimedResources.entries()) {
                    if (agentId === member.id) {
                        this.claimedResources.delete(resourceId);
                    }
                }
            }
        });

        tribeMembers.forEach(member => {
            if (!member.alive) return;

            const needsHelp = member.needs.hunger < 0.2 || member.needs.energy < 0.15;
            this.criticalNeeds.set(member.id, {
                hunger: member.needs.hunger,
                energy: member.needs.energy,
                health: member.needs.health,
                needsHelp,
                position: member.mesh.position.clone()
            });
        });
    }

    /**
     * Calculate tribal resource priorities
     */
    calculateResourcePriorities(tribeMembers, hut) {
        const tribeSize = tribeMembers.filter(m => m.alive).length;

        // Calculate desired stockpile levels
        const desiredCoconuts = tribeSize * 5; // 5 coconuts per agent
        const desiredWood = tribeSize * 3;
        const desiredStone = tribeSize * 2;
        const desiredSpears = Math.max(2, Math.floor(tribeSize / 3));

        const currentCoconuts = hut ? (hut.storage.coconut || 0) : 0;
        const currentWood = hut ? (hut.storage.wood || 0) : 0;
        const currentStone = hut ? (hut.storage.stone || 0) : 0;
        const currentSpears = hut ? (hut.storage.fishing_spear || 0) : 0;

        // Calculate urgency (0-1, higher = more urgent)
        return {
            coconuts: Math.max(0, 1 - (currentCoconuts / desiredCoconuts)),
            wood: Math.max(0, 1 - (currentWood / desiredWood)),
            stone: Math.max(0, 1 - (currentStone / desiredStone)),
            spears: Math.max(0, 1 - (currentSpears / desiredSpears))
        };
    }

    /**
     * Find agents who need help
     */
    getAgentsNeedingHelp() {
        const needHelp = [];
        this.criticalNeeds.forEach((needs, agentId) => {
            if (needs.needsHelp) {
                needHelp.push({ agentId, ...needs });
            }
        });
        return needHelp;
    }

    /**
     * Count how many agents are working on a specific task type
     */
    countAgentsOnTask(tribeMembers, taskType) {
        return tribeMembers.filter(m =>
            m.alive && m.task && m.task.type === taskType
        ).length;
    }

    /**
     * Check if a resource is already claimed by another agent
     */
    isResourceClaimed(resourceTarget, agentId) {
        const targetId = resourceTarget.uuid || resourceTarget.id;
        const claimingAgent = this.claimedResources.get(targetId);
        return claimingAgent && claimingAgent !== agentId;
    }

    /**
     * Claim a resource for an agent
     */
    claimResource(resourceTarget, agentId) {
        const targetId = resourceTarget.uuid || resourceTarget.id;
        this.claimedResources.set(targetId, agentId);
    }

    /**
     * Release a resource claim
     */
    releaseResource(resourceTarget, agentId) {
        const targetId = resourceTarget.uuid || resourceTarget.id;
        if (this.claimedResources.get(targetId) === agentId) {
            this.claimedResources.delete(targetId);
        }
    }
}

/**
 * Improved task planning with 100% goal-oriented behavior
 * NO random wandering, NO idle time wasting
 */
export function improvedPlanTask(member, tribeMembers, hut, coordinator, findHelpers) {
    if (!member.alive) return;

    const hunger = member.needs.hunger;
    const energy = member.needs.energy;
    const health = member.needs.health;

    // If in atomic action, don't replan
    if (member.state === 'gathering' || member.state === 'crafting' ||
        member.state === 'eating' || member.state === 'fishing') {
        return;
    }

    // ============================================
    // PRIORITY 1: CRITICAL SURVIVAL NEEDS
    // ============================================

    // CRITICAL hunger - eat immediately from inventory
    if (hunger < 0.25 && findHelpers.hasFood(member.inventory)) {
        member.state = 'eating';
        member.task = { type: 'eat_from_inventory', resourceId: 'coconut', priority: 'critical' };
        return;
    }

    // CRITICAL hunger - go to hut for food
    if (hunger < 0.3 && hut && hut.storage.coconut > 0) {
        member.state = 'walking';
        member.task = { type: 'go_hut_for_food', priority: 'critical' };
        member.targetAngle = findHelpers.angleTo(member.mesh.position, hut.position);
        return;
    }

    // CRITICAL energy - must rest
    if (energy < 0.2) {
        member.state = 'resting';
        member.task = { type: 'recover_energy', priority: 'critical' };
        member.restTime = 4 + seededRandom() * 4;
        return;
    }

    // ============================================
    // PRIORITY 2: HELPING OTHER AGENTS
    // ============================================

    const agentsNeedingHelp = coordinator.getAgentsNeedingHelp();
    if (agentsNeedingHelp.length > 0 && hunger > 0.5 && energy > 0.4) {
        // Check if we can help someone
        const canHelp = findHelpers.hasFood(member.inventory) ||
                       (hut && hut.storage.coconut > tribeMembers.length);

        if (canHelp) {
            const nearestNeedyAgent = agentsNeedingHelp
                .map(a => ({
                    ...a,
                    dist: member.mesh.position.distanceTo(a.position)
                }))
                .sort((a, b) => a.dist - b.dist)[0];

            if (nearestNeedyAgent && nearestNeedyAgent.dist < 50) {
                // Go help this agent
                if (findHelpers.hasFood(member.inventory)) {
                    member.state = 'walking';
                    member.task = {
                        type: 'help_agent',
                        targetAgent: nearestNeedyAgent.agentId,
                        priority: 'high'
                    };
                    return;
                } else if (hut && hut.storage.coconut > tribeMembers.length) {
                    member.state = 'walking';
                    member.task = { type: 'go_hut_for_helping', priority: 'high' };
                    member.targetAngle = findHelpers.angleTo(member.mesh.position, hut.position);
                    return;
                }
            }
        }
    }

    // ============================================
    // PRIORITY 3: INVENTORY MANAGEMENT
    // ============================================

    // Carrying resources -> haul to hut immediately
    const carryingAnything = member.inventory.slots.size > 0;
    if (carryingAnything && hut) {
        member.state = 'hauling';
        member.task = { type: 'haul_to_hut', priority: 'medium' };
        member.targetAngle = findHelpers.angleTo(member.mesh.position, hut.position);
        return;
    }

    // ============================================
    // PRIORITY 4: TRIBE RESOURCE NEEDS
    // ============================================

    const priorities = coordinator.calculateResourcePriorities(tribeMembers, hut);

    // Moderate hunger - gather/eat if tribe food is adequate
    if (hunger < 0.5) {
        if (priorities.coconuts < 0.5) {
            // Tribe has enough food, we can eat from hut
            if (hut && hut.storage.coconut > 0) {
                member.state = 'walking';
                member.task = { type: 'go_hut_for_food', priority: 'medium' };
                member.targetAngle = findHelpers.angleTo(member.mesh.position, hut.position);
                return;
            }
        }
    }

    // Craft fishing spears if needed
    if (priorities.spears > 0.5 && hut) {
        if (findHelpers.canCraftSpear(hut)) {
            // Check if someone else is already crafting
            const craftersCount = coordinator.countAgentsOnTask(tribeMembers, 'craft_spear');
            const walkingToCraftCount = coordinator.countAgentsOnTask(tribeMembers, 'walk_to_hut_to_craft');
            
            if (craftersCount === 0 && walkingToCraftCount === 0) {
                // First walk to hut, then craft
                const distToHut = member.mesh.position.distanceTo(hut.position);
                if (distToHut > 3) {
                    // Not at hut yet - walk there first
                    member.state = 'walking';
                    member.task = { type: 'walk_to_hut_to_craft', recipeId: 'fishing_spear', priority: 'medium' };
                    member.targetAngle = findHelpers.angleTo(member.mesh.position, hut.position);
                    return;
                } else {
                    // At hut - can craft immediately
                    member.state = 'crafting';
                    member.task = { type: 'craft_spear', recipeId: 'fishing_spear', priority: 'medium' };
                    member.actionTimer = 5.0;
                    return;
                }
            }
        }
    }

    // ============================================
    // PRIORITY 4.3: GET SPEAR FROM HUT (if needed for fishing)
    // ============================================
    
    // Get spear from hut if: need to fish but don't have spear
    if (!findHelpers.hasSpear(member) && 
        hut && hut.storage.fishing_spear > 0 &&
        energy > 0.3 && priorities.coconuts > 0.3) {
        // Check if someone else is getting a spear
        const gettingSpear = coordinator.countAgentsOnTask(tribeMembers, 'get_spear_from_hut');
        if (gettingSpear === 0) {
            member.state = 'walking';
            member.task = { type: 'get_spear_from_hut', priority: 'high' };
            member.targetAngle = findHelpers.angleTo(member.mesh.position, hut.position);
            return;
        }
    }

    // ============================================
    // PRIORITY 4.5: FISHING (Alternative Food Source)
    // ============================================

    // Go fishing if:
    // 1. Have a spear equipped (REQUIRED)
    // 2. Tribe needs food (coconuts low)
    // 3. Good energy for fishing from shore
    if (findHelpers.hasSpear && findHelpers.hasSpear(member) &&
        energy > 0.4 && hunger > 0.3 &&
        priorities.coconuts > 0.4) {

        // Check if too many agents are already fishing
        const fishersCount = coordinator.countAgentsOnTask(tribeMembers, 'go_fishing');
        const maxFishers = Math.max(1, Math.floor(tribeMembers.filter(m => m.alive).length * 0.3));

        if (fishersCount < maxFishers) {
            const nearestFish = findHelpers.findNearestFish(member);
            if (nearestFish) {
                member.state = 'walking';
                member.task = {
                    type: 'go_fishing',
                    target: nearestFish,
                    priority: 'medium'
                };
                member.targetAngle = findHelpers.angleTo(member.mesh.position, nearestFish.mesh.position);
                return;
            }
        }
    }

    // ============================================
    // PRIORITY 5: RESOURCE GATHERING (OPTIMIZED)
    // ============================================

    // Determine what resource to gather based on tribe priorities
    const resourceTasks = [
        { type: 'coconuts', urgency: priorities.coconuts, findFunc: findHelpers.findNearestPalmWithCoconuts },
        { type: 'wood', urgency: priorities.wood, findFunc: findHelpers.findNearestJungleTree },
        { type: 'stone', urgency: priorities.stone, findFunc: findHelpers.findNearestRock }
    ].sort((a, b) => b.urgency - a.urgency);

    // Try to gather the most urgent resource
    for (const resource of resourceTasks) {
        if (resource.urgency > 0.3) { // Only gather if somewhat needed
            const target = resource.findFunc(member, coordinator); // Pass coordinator to check claims
            if (target) {
                // Check if too many agents are already gathering this
                const gatherType = `gather_${resource.type}`;
                const workersCount = coordinator.countAgentsOnTask(tribeMembers, gatherType);
                const optimalWorkers = Math.ceil(tribeMembers.filter(m => m.alive).length * resource.urgency * 0.6);

                if (workersCount < optimalWorkers) {
                    // Claim this resource to prevent others from targeting it
                    coordinator.claimResource(target, member.id);

                    member.state = 'walking';
                    member.task = {
                        type: gatherType,
                        target: target,
                        resourceId: resource.type === 'coconuts' ? 'coconut' : resource.type,
                        priority: 'low'
                    };
                    member.targetAngle = findHelpers.angleTo(member.mesh.position, target.position);
                    return;
                }
            }
        }
    }

    // ============================================
    // PRIORITY 6: MAINTENANCE TASKS
    // ============================================

    // If nothing else to do, gather the least stocked resource
    // This ensures agents are ALWAYS productive
    const leastStocked = resourceTasks[0]; // Already sorted by urgency
    const target = leastStocked.findFunc(member, coordinator); // Pass coordinator
    if (target) {
        // Claim this resource
        coordinator.claimResource(target, member.id);

        member.state = 'walking';
        member.task = {
            type: `gather_${leastStocked.type}`,
            target: target,
            resourceId: leastStocked.type === 'coconuts' ? 'coconut' : leastStocked.type,
            priority: 'maintenance'
        };
        member.targetAngle = findHelpers.angleTo(member.mesh.position, target.position);
        return;
    }

    // ============================================
    // FALLBACK: PATROL TO HUT (NOT IDLE!)
    // ============================================
    // If absolutely nothing to do, go to hut area to be ready for tasks
    // This is better than idle wandering
    if (hut) {
        const distToHut = member.mesh.position.distanceTo(hut.position);
        if (distToHut > 10) {
            member.state = 'walking';
            member.task = { type: 'patrol_to_hut', priority: 'fallback' };
            member.targetAngle = findHelpers.angleTo(member.mesh.position, hut.position);
            return;
        }
    }

    // Absolute fallback - rest to recover energy for future tasks
    member.state = 'resting';
    member.task = { type: 'recover_energy', priority: 'fallback' };
    member.restTime = 2 + seededRandom() * 2;
}

/**
 * Improved idle behavior - NO RANDOM WANDERING
 * Agents stay alert and ready for tasks
 */
export function improvedIdleBehavior(member, delta) {
    const mesh = member.mesh;

    // Gentle breathing animation only
    member.walkPhase += delta * 2;
    const breathe = Math.sin(member.walkPhase) * 0.015;
    mesh.position.y = member.terrainY + breathe;

    // Smoothly return limbs to neutral position
    member.leftLeg.rotation.x *= 0.9;
    member.rightLeg.rotation.x *= 0.9;
    member.leftArm.rotation.x *= 0.9;
    member.rightArm.rotation.x *= 0.9;

    // NO RANDOM ANGLE CHANGES - agents stay facing their last direction
    // This makes them appear more purposeful and ready
}
