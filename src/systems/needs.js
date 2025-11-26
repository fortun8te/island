// ============================================
// NEEDS SYSTEM - Full Survival Simulation
// Per Island Sim Full Prompt spec
// ============================================

export const LIFE_STAGES = {
    BABY: { name: 'baby', minAge: 0, maxAge: 2, canAct: false, canReproduce: false, efficiencyMult: 0 },
    CHILD: { name: 'child', minAge: 2, maxAge: 12, canAct: true, canReproduce: false, efficiencyMult: 0.5 },
    ADULT: { name: 'adult', minAge: 12, maxAge: 50, canAct: true, canReproduce: true, efficiencyMult: 1.0 },
    ELDER: { name: 'elder', minAge: 50, maxAge: 999, canAct: true, canReproduce: false, efficiencyMult: 0.6 }
};

export const DEATH_CAUSES = {
    STARVATION: 'starvation',
    EXHAUSTION: 'exhaustion',
    DROWNING: 'drowning',
    SICKNESS: 'sickness',
    OLD_AGE: 'old_age',
    COMBAT: 'combat',
    SHARK: 'shark_attack',
    SQUID: 'squid_attack',
    CHILDBIRTH: 'childbirth'
};

// Default needs config
export const NEEDS_CONFIG = {
    // Hunger
    hungerDecayRate: 0.003,          // Per second base
    hungerMovingMult: 1.3,           // Multiplier when moving
    hungerLowThreshold: 0.3,         // Below this: slowed
    hungerCriticalThreshold: 0.1,    // Below this: death risk
    
    // Energy
    energyDecayRate: 0.002,          // Per second when active
    energyRestoreRate: 0.01,         // Per second when resting
    energyRestoreShelterMult: 2.0,   // Shelter bonus
    energyLowThreshold: 0.3,         // Below this: less efficient
    energyCriticalThreshold: 0.1,    // Below this: forced rest
    
    // Health
    healthDecayBase: 0.0005,         // Slow base decay
    healthRecoverRate: 0.002,        // When well-fed and resting
    healthSicknessDecay: 0.005,      // When sick
    
    // Social
    socialDecayRate: 0.001,          // When isolated
    socialRecoverRate: 0.004,        // When near others
    socialProximityRange: 15,        // Units to count as "near"
    
    // Reproduction
    reproductionDriveRate: 0.0008,   // Increase over time for adults
    reproductionThreshold: 0.7,      // Drive level to seek mate
    
    // Aging
    ageYearsPerSecond: 0.02,         // Sim time to years conversion
    oldAgeThreshold: 55,
    maxNaturalAge: 95,
    
    // Sickness
    rawFishSicknessChance: 0.3,
    spoiledFoodSicknessChance: 0.7,
    sicknessSpreadChance: 0.1,       // Per second when near sick agent
    sicknessDuration: 60,            // Seconds
    
    // Death thresholds
    exhaustionDeathTime: 10,         // Seconds at 0 energy before death
    drownEnergyDrain: 0.1            // Energy per second in deep water
};

/**
 * Create default needs state for a new agent
 */
export function createAgentNeeds(age = 18) {
    return {
        // Core needs (0-1, 1 = full)
        hunger: 0.8 + Math.random() * 0.2,
        energy: 0.9 + Math.random() * 0.1,
        health: 1.0,
        social: 0.7 + Math.random() * 0.3,
        reproductionDrive: 0,
        
        // Life cycle
        age: age,
        lifeStage: getLifeStage(age),
        
        // Status effects
        isSick: false,
        sicknessTimer: 0,
        exhaustionTimer: 0,
        isResting: false,
        inShelter: false,
        inWater: false,
        inDeepWater: false,
        
        // Tracking
        deathCause: null,
        alive: true,
        
        // Pregnancy (for female agents)
        isPregnant: false,
        pregnancyTimer: 0,
        pregnancyDuration: 30, // Seconds
        
        // Parent tracking
        parentIds: [],
        childIds: []
    };
}

/**
 * Get life stage from age
 */
export function getLifeStage(age) {
    if (age < LIFE_STAGES.BABY.maxAge) return LIFE_STAGES.BABY;
    if (age < LIFE_STAGES.CHILD.maxAge) return LIFE_STAGES.CHILD;
    if (age < LIFE_STAGES.ADULT.maxAge) return LIFE_STAGES.ADULT;
    return LIFE_STAGES.ELDER;
}

/**
 * Calculate efficiency multiplier based on needs and age
 */
export function getEfficiencyMultiplier(needs) {
    let mult = needs.lifeStage.efficiencyMult;
    
    // Hunger penalty
    if (needs.hunger < NEEDS_CONFIG.hungerLowThreshold) {
        mult *= 0.5 + (needs.hunger / NEEDS_CONFIG.hungerLowThreshold) * 0.5;
    }
    
    // Energy penalty
    if (needs.energy < NEEDS_CONFIG.energyLowThreshold) {
        mult *= 0.5 + (needs.energy / NEEDS_CONFIG.energyLowThreshold) * 0.5;
    }
    
    // Sickness penalty
    if (needs.isSick) {
        mult *= 0.5;
    }
    
    // Old age penalty (gradual after threshold)
    if (needs.age > NEEDS_CONFIG.oldAgeThreshold) {
        const ageOver = needs.age - NEEDS_CONFIG.oldAgeThreshold;
        const maxOver = NEEDS_CONFIG.maxNaturalAge - NEEDS_CONFIG.oldAgeThreshold;
        mult *= 1 - (ageOver / maxOver) * 0.4;
    }
    
    return Math.max(0.1, mult);
}

/**
 * Update agent needs for one simulation step
 * @returns {object} { alive, deathCause, events }
 */
export function updateNeeds(needs, delta, context = {}) {
    const events = [];
    
    if (!needs.alive) return { alive: false, deathCause: needs.deathCause, events };
    
    const {
        isMoving = false,
        isResting = false,
        inShelter = false,
        inWater = false,
        inDeepWater = false,
        nearbyAgentCount = 0,
        nearSickAgent = false
    } = context;
    
    // Update state
    needs.isResting = isResting;
    needs.inShelter = inShelter;
    needs.inWater = inWater;
    needs.inDeepWater = inDeepWater;
    
    // === AGING ===
    needs.age += NEEDS_CONFIG.ageYearsPerSecond * delta;
    needs.lifeStage = getLifeStage(needs.age);
    
    // Old age death chance
    if (needs.age > NEEDS_CONFIG.maxNaturalAge) {
        const deathChance = (needs.age - NEEDS_CONFIG.maxNaturalAge) * 0.01 * delta;
        if (Math.random() < deathChance) {
            needs.alive = false;
            needs.deathCause = DEATH_CAUSES.OLD_AGE;
            events.push({ type: 'death', cause: DEATH_CAUSES.OLD_AGE });
            return { alive: false, deathCause: DEATH_CAUSES.OLD_AGE, events };
        }
    }
    
    // === HUNGER ===
    let hungerDecay = NEEDS_CONFIG.hungerDecayRate * delta;
    if (isMoving) hungerDecay *= NEEDS_CONFIG.hungerMovingMult;
    if (needs.isSick) hungerDecay *= 2;
    needs.hunger = Math.max(0, needs.hunger - hungerDecay);
    
    // Starvation death
    if (needs.hunger <= 0) {
        needs.alive = false;
        needs.deathCause = DEATH_CAUSES.STARVATION;
        events.push({ type: 'death', cause: DEATH_CAUSES.STARVATION });
        return { alive: false, deathCause: DEATH_CAUSES.STARVATION, events };
    }
    
    // === ENERGY ===
    if (isResting) {
        let restoreRate = NEEDS_CONFIG.energyRestoreRate * delta;
        if (inShelter) restoreRate *= NEEDS_CONFIG.energyRestoreShelterMult;
        needs.energy = Math.min(1, needs.energy + restoreRate);
        needs.exhaustionTimer = 0;
    } else if (isMoving || inWater) {
        let drainRate = NEEDS_CONFIG.energyDecayRate * delta;
        if (inDeepWater) drainRate = NEEDS_CONFIG.drownEnergyDrain * delta;
        needs.energy = Math.max(0, needs.energy - drainRate);
    }
    
    // Exhaustion tracking
    if (needs.energy <= 0) {
        needs.exhaustionTimer += delta;
        if (needs.exhaustionTimer >= NEEDS_CONFIG.exhaustionDeathTime) {
            needs.alive = false;
            needs.deathCause = inDeepWater ? DEATH_CAUSES.DROWNING : DEATH_CAUSES.EXHAUSTION;
            events.push({ type: 'death', cause: needs.deathCause });
            return { alive: false, deathCause: needs.deathCause, events };
        }
    } else {
        needs.exhaustionTimer = 0;
    }
    
    // Forced rest at critical energy
    if (needs.energy < NEEDS_CONFIG.energyCriticalThreshold && !isResting) {
        events.push({ type: 'forced_rest' });
    }
    
    // === HEALTH ===
    let healthChange = 0;
    
    // Base decay (aging)
    healthChange -= NEEDS_CONFIG.healthDecayBase * delta;
    
    // Sickness damage
    if (needs.isSick) {
        healthChange -= NEEDS_CONFIG.healthSicknessDecay * delta;
    }
    
    // Recovery when well-fed and resting
    if (isResting && needs.hunger > 0.5 && !needs.isSick) {
        healthChange += NEEDS_CONFIG.healthRecoverRate * delta;
    }
    
    needs.health = Math.max(0, Math.min(1, needs.health + healthChange));
    
    // Health death
    if (needs.health <= 0) {
        needs.alive = false;
        needs.deathCause = needs.isSick ? DEATH_CAUSES.SICKNESS : DEATH_CAUSES.OLD_AGE;
        events.push({ type: 'death', cause: needs.deathCause });
        return { alive: false, deathCause: needs.deathCause, events };
    }
    
    // === SOCIAL ===
    if (nearbyAgentCount > 0) {
        needs.social = Math.min(1, needs.social + NEEDS_CONFIG.socialRecoverRate * delta * nearbyAgentCount);
    } else {
        needs.social = Math.max(0, needs.social - NEEDS_CONFIG.socialDecayRate * delta);
    }
    
    // Isolation health penalty
    if (needs.social < 0.2) {
        needs.health = Math.max(0, needs.health - 0.0002 * delta);
    }
    
    // === REPRODUCTION DRIVE ===
    if (needs.lifeStage.canReproduce && !needs.isPregnant) {
        needs.reproductionDrive = Math.min(1, needs.reproductionDrive + NEEDS_CONFIG.reproductionDriveRate * delta);
    }
    
    // === SICKNESS ===
    if (needs.isSick) {
        needs.sicknessTimer -= delta;
        if (needs.sicknessTimer <= 0) {
            needs.isSick = false;
            events.push({ type: 'recovered' });
        }
    }
    
    // Sickness spread
    if (!needs.isSick && nearSickAgent && Math.random() < NEEDS_CONFIG.sicknessSpreadChance * delta) {
        needs.isSick = true;
        needs.sicknessTimer = NEEDS_CONFIG.sicknessDuration;
        events.push({ type: 'got_sick', source: 'spread' });
    }
    
    // === PREGNANCY ===
    if (needs.isPregnant) {
        needs.pregnancyTimer += delta;
        if (needs.pregnancyTimer >= needs.pregnancyDuration) {
            events.push({ type: 'give_birth' });
            needs.isPregnant = false;
            needs.pregnancyTimer = 0;
            needs.energy = Math.max(0.1, needs.energy - 0.4); // Childbirth exhaustion
            
            // Rare childbirth complication
            if (Math.random() < 0.02 && needs.health < 0.3) {
                needs.alive = false;
                needs.deathCause = DEATH_CAUSES.CHILDBIRTH;
                events.push({ type: 'death', cause: DEATH_CAUSES.CHILDBIRTH });
                return { alive: false, deathCause: DEATH_CAUSES.CHILDBIRTH, events };
            }
        }
    }
    
    return { alive: true, deathCause: null, events };
}

/**
 * Apply food consumption to needs
 */
export function consumeFood(needs, foodItem) {
    const { nutrition = 0.3, isRaw = false, isSpoiled = false } = foodItem;
    
    needs.hunger = Math.min(1, needs.hunger + nutrition);
    
    // Sickness chance from raw/spoiled food
    let sicknessChance = 0;
    if (isRaw) sicknessChance = NEEDS_CONFIG.rawFishSicknessChance;
    if (isSpoiled) sicknessChance = NEEDS_CONFIG.spoiledFoodSicknessChance;
    
    // Vulnerable groups have higher chance
    if (needs.lifeStage === LIFE_STAGES.CHILD || needs.lifeStage === LIFE_STAGES.ELDER) {
        sicknessChance *= 1.5;
    }
    if (needs.isPregnant) sicknessChance *= 1.3;
    if (needs.health < 0.5) sicknessChance *= 1.5;
    
    if (sicknessChance > 0 && Math.random() < sicknessChance) {
        needs.isSick = true;
        needs.sicknessTimer = NEEDS_CONFIG.sicknessDuration;
        return { gotSick: true };
    }
    
    return { gotSick: false };
}

/**
 * Start reproduction process
 */
export function startReproduction(needs1, needs2) {
    if (!needs1.lifeStage.canReproduce || !needs2.lifeStage.canReproduce) return false;
    if (needs1.isPregnant || needs2.isPregnant) return false;
    if (needs1.reproductionDrive < NEEDS_CONFIG.reproductionThreshold) return false;
    if (needs2.reproductionDrive < NEEDS_CONFIG.reproductionThreshold) return false;
    
    // Determine which one gets pregnant (simplified: random)
    const pregnant = Math.random() < 0.5 ? needs1 : needs2;
    pregnant.isPregnant = true;
    pregnant.pregnancyTimer = 0;
    
    // Reset drives
    needs1.reproductionDrive = 0;
    needs2.reproductionDrive = 0;
    
    return true;
}

/**
 * Create child needs inheriting from parents
 */
export function createChildNeeds(parent1Needs, parent2Needs) {
    const child = createAgentNeeds(0);
    
    // Baby starts with full needs but can't act
    child.hunger = 1;
    child.energy = 1;
    child.health = 1;
    child.social = 1;
    
    return child;
}

