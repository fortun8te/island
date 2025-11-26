// ============================================
// THREATS SYSTEM - Sharks & Giant Squid
// Per Island Sim Full Prompt spec
// ============================================

export const THREAT_TYPES = {
    BULL_SHARK: {
        id: 'bull_shark',
        name: 'Bull Shark',
        type: 'mini_boss',
        health: 100,
        damage: 40,
        speed: 8,
        
        // Encounter chances by location/time
        encounterChance: {
            deep_reef_day: 0.05,
            deep_reef_dawn_dusk: 0.30,
            deep_reef_night: 0.50,
            shallow_reef_night: 0.02
        },
        
        // Combat
        soloDeathChance: 0.9,      // 90% death if alone
        groupSize: 3,              // Need 3-4 hunters to have good chance
        weakPoints: ['gills', 'eyes'],
        
        // Rewards
        drops: {
            shark_meat: { min: 6, max: 10 },
            shark_teeth: { min: 8, max: 15 },
            shark_skin: { min: 2, max: 4 },
            shark_jaw: { min: 1, max: 1 }
        },
        
        description: 'Dangerous predator in deep waters. Hunt in groups of 3-4 with spears.'
    },
    
    GIANT_SQUID: {
        id: 'giant_squid',
        name: 'The Deep Hunger',
        type: 'final_boss',
        health: 500,
        damage: 80,
        speed: 12,
        
        // Spawn conditions (ALL must be met)
        spawnConditions: {
            isNight: true,
            isDeepWater: true,
            isStorm: false,        // Optional: storms increase chance
            isNewMoon: false,      // Optional: new moon increases chance
            bloodInWater: false    // Optional: recent shark kill
        },
        baseSpawnChance: 0.001,   // Very rare
        
        // Warning signs
        warnings: [
            'bioluminescent_glow',
            'fish_disappear',
            'temperature_drop',
            'strange_currents'
        ],
        warningDuration: 30,      // Seconds of warning before attack
        
        // Combat
        minHunters: 6,            // Need 6+ hunters
        tentacleGrabChance: 0.3,  // Per attack
        inkCloudDuration: 10,     // Seconds of obscured vision
        weakPoints: ['eyes'],
        
        // Rewards
        drops: {
            squid_meat: { min: 15, max: 25 },
            squid_beak: { min: 1, max: 1 },
            squid_tentacle: { min: 6, max: 10 },
            squid_ink: { min: 2, max: 3 },
            squid_eye: { min: 2, max: 2 }
        },
        
        // Legend status for killer
        grantsLegendStatus: true,
        legendEffects: {
            immortalityBuff: false,  // Optional
            healthBuff: 0.5,
            relationshipBoost: 100
        },
        
        description: 'Mythical deep-ocean terror. Only the bravest hunting parties dare face it.'
    }
};

/**
 * Create threat instance
 */
export function createThreat(threatType, position) {
    const def = THREAT_TYPES[threatType];
    if (!def) return null;
    
    return {
        id: `${threatType}_${Date.now()}`,
        type: threatType,
        health: def.health,
        maxHealth: def.health,
        position: { ...position },
        state: 'patrolling', // patrolling, attacking, fleeing, dead
        target: null,
        damage: def.damage,
        speed: def.speed,
        
        // Combat state
        inCombat: false,
        combatants: [],
        
        // Squid-specific
        inkCloudActive: false,
        inkCloudTimer: 0,
        tentacleTargets: [],
        
        // Tracking
        spawnTime: Date.now(),
        killerId: null
    };
}

/**
 * Check if shark encounter happens
 */
export function checkSharkEncounter(location, timeOfDay, hasBlood = false) {
    const def = THREAT_TYPES.BULL_SHARK;
    let chance = 0;
    
    // Determine time period
    const isDawn = timeOfDay >= 0.12 && timeOfDay < 0.2;
    const isDusk = timeOfDay >= 0.8 && timeOfDay < 0.88;
    const isNight = timeOfDay < 0.12 || timeOfDay >= 0.88;
    
    if (location === 'deep_reef') {
        if (isNight) chance = def.encounterChance.deep_reef_night;
        else if (isDawn || isDusk) chance = def.encounterChance.deep_reef_dawn_dusk;
        else chance = def.encounterChance.deep_reef_day;
    } else if (location === 'shallow_reef' && isNight) {
        chance = def.encounterChance.shallow_reef_night;
    }
    
    // Blood in water doubles chance
    if (hasBlood) chance *= 2;
    
    return Math.random() < chance;
}

/**
 * Check if giant squid spawns
 */
export function checkSquidSpawn(conditions) {
    const def = THREAT_TYPES.GIANT_SQUID;
    
    // Must be night and deep water
    if (!conditions.isNight || !conditions.isDeepWater) return false;
    
    let chance = def.baseSpawnChance;
    
    // Modifiers
    if (conditions.isStorm) chance *= 3;
    if (conditions.isNewMoon) chance *= 2;
    if (conditions.bloodInWater) chance *= 5;
    
    return Math.random() < chance;
}

/**
 * Calculate combat outcome
 */
export function calculateCombatOutcome(threat, hunters) {
    const def = THREAT_TYPES[threat.type];
    if (!def) return { success: false, casualties: hunters.map(h => h.id) };
    
    const hunterCount = hunters.length;
    const hasProperWeapons = hunters.some(h => h.hasSpear);
    
    // Calculate base success chance
    let successChance = 0;
    
    if (threat.type === 'BULL_SHARK') {
        if (hunterCount === 1) {
            successChance = 0.1; // Solo is suicide
        } else if (hunterCount === 2) {
            successChance = 0.3;
        } else if (hunterCount >= 3) {
            successChance = 0.5 + (hunterCount - 3) * 0.1;
        }
        
        if (!hasProperWeapons) successChance *= 0.3;
    } else if (threat.type === 'GIANT_SQUID') {
        if (hunterCount < def.minHunters) {
            successChance = 0.05; // Near impossible
        } else {
            successChance = 0.3 + (hunterCount - def.minHunters) * 0.05;
        }
        
        if (!hasProperWeapons) successChance *= 0.2;
    }
    
    // Factor in hunter skills
    const avgCombatSkill = hunters.reduce((sum, h) => sum + (h.combatSkill || 0), 0) / hunterCount;
    successChance += avgCombatSkill * 0.3;
    
    // Cap at 90%
    successChance = Math.min(0.9, successChance);
    
    const success = Math.random() < successChance;
    
    // Calculate casualties
    const casualties = [];
    hunters.forEach(hunter => {
        let deathChance = success ? 0.1 : 0.5;
        
        // Solo is deadly
        if (hunterCount === 1) deathChance = success ? 0.3 : def.soloDeathChance;
        
        // Squid tentacle grabs
        if (threat.type === 'GIANT_SQUID' && Math.random() < def.tentacleGrabChance) {
            deathChance += 0.4;
        }
        
        if (Math.random() < deathChance) {
            casualties.push(hunter.id);
        }
    });
    
    return {
        success,
        casualties,
        drops: success ? generateDrops(def.drops) : {},
        killerId: success && hunters.length > 0 ? hunters[0].id : null
    };
}

/**
 * Generate random drops from loot table
 */
function generateDrops(dropTable) {
    const drops = {};
    
    for (const [itemId, range] of Object.entries(dropTable)) {
        const count = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
        if (count > 0) drops[itemId] = count;
    }
    
    return drops;
}

/**
 * Update threat behavior
 */
export function updateThreat(threat, delta, nearbyAgents) {
    if (threat.state === 'dead') return [];
    
    const events = [];
    const def = THREAT_TYPES[threat.type];
    
    // Ink cloud timer (squid)
    if (threat.inkCloudActive) {
        threat.inkCloudTimer -= delta;
        if (threat.inkCloudTimer <= 0) {
            threat.inkCloudActive = false;
            events.push({ type: 'ink_cleared' });
        }
    }
    
    // Find nearest agent in water
    let nearestAgent = null;
    let nearestDist = Infinity;
    
    nearbyAgents.forEach(agent => {
        if (!agent.inWater) return;
        const dx = agent.position.x - threat.position.x;
        const dz = agent.position.z - threat.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestAgent = agent;
        }
    });
    
    // State machine
    switch (threat.state) {
        case 'patrolling':
            // Random movement
            threat.position.x += (Math.random() - 0.5) * threat.speed * delta;
            threat.position.z += (Math.random() - 0.5) * threat.speed * delta;
            
            // Aggro if agent nearby
            if (nearestAgent && nearestDist < 30) {
                threat.state = 'attacking';
                threat.target = nearestAgent.id;
                events.push({ type: 'threat_aggro', threatId: threat.id, targetId: nearestAgent.id });
            }
            break;
            
        case 'attacking':
            if (!nearestAgent || nearestDist > 50) {
                threat.state = 'patrolling';
                threat.target = null;
                break;
            }
            
            // Move toward target
            const dx = nearestAgent.position.x - threat.position.x;
            const dz = nearestAgent.position.z - threat.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist > 2) {
                threat.position.x += (dx / dist) * threat.speed * delta;
                threat.position.z += (dz / dist) * threat.speed * delta;
            } else {
                // Attack!
                events.push({ 
                    type: 'threat_attack', 
                    threatId: threat.id, 
                    targetId: nearestAgent.id,
                    damage: def.damage
                });
                
                // Squid ink cloud
                if (threat.type === 'GIANT_SQUID' && Math.random() < 0.2) {
                    threat.inkCloudActive = true;
                    threat.inkCloudTimer = def.inkCloudDuration;
                    events.push({ type: 'ink_cloud', threatId: threat.id });
                }
            }
            break;
            
        case 'fleeing':
            // Move away from agents
            if (nearestAgent) {
                const fdx = threat.position.x - nearestAgent.position.x;
                const fdz = threat.position.z - nearestAgent.position.z;
                const fdist = Math.sqrt(fdx * fdx + fdz * fdz);
                threat.position.x += (fdx / fdist) * threat.speed * delta * 1.5;
                threat.position.z += (fdz / fdist) * threat.speed * delta * 1.5;
            }
            
            // Despawn if far enough
            if (nearestDist > 100) {
                events.push({ type: 'threat_fled', threatId: threat.id });
                threat.state = 'dead'; // Remove from sim
            }
            break;
    }
    
    // Low health = flee
    if (threat.health < threat.maxHealth * 0.2 && threat.state !== 'fleeing') {
        threat.state = 'fleeing';
        events.push({ type: 'threat_fleeing', threatId: threat.id });
    }
    
    return events;
}

/**
 * Apply damage to threat
 */
export function damageThreat(threat, amount, attackerId) {
    threat.health -= amount;
    
    if (threat.health <= 0) {
        threat.state = 'dead';
        threat.killerId = attackerId;
        return { killed: true, killerId: attackerId };
    }
    
    return { killed: false };
}

