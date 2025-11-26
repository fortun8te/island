// ============================================
// SKILLS & EXPERIENCE SYSTEM
// Per Island Sim Full Prompt spec
// ============================================

export const SKILLS = {
    GATHERING: {
        id: 'gathering',
        name: 'Gathering',
        maxLevel: 100,
        // Effects at max level: +100% speed, +50% yield
        speedBonus: level => level / 100,        // 0-100% bonus
        yieldBonus: level => (level / 100) * 0.5  // 0-50% bonus
    },
    FISHING: {
        id: 'fishing',
        name: 'Fishing',
        maxLevel: 100,
        // Effects at max level: +100% catch rate, +50% larger fish
        catchBonus: level => level / 100,
        sizeBonus: level => (level / 100) * 0.5
    },
    CRAFTING: {
        id: 'crafting',
        name: 'Crafting',
        maxLevel: 100,
        // Effects at max level: -30% build time, +50% durability
        timeReduction: level => (level / 100) * 0.3,
        durabilityBonus: level => (level / 100) * 0.5
    },
    COMBAT: {
        id: 'combat',
        name: 'Combat',
        maxLevel: 100,
        // Effects at max level: +80% win chance vs unskilled
        winChanceBonus: level => (level / 100) * 0.8
    },
    COOKING: {
        id: 'cooking',
        name: 'Cooking',
        maxLevel: 100,
        // Effects at max level: -50% cook time, +30% nutrition
        timeReduction: level => (level / 100) * 0.5,
        nutritionBonus: level => (level / 100) * 0.3
    }
};

// XP required per level (increases exponentially)
const XP_PER_LEVEL = 100;
const XP_SCALING = 1.15;

/**
 * Create default skills state for a new agent
 */
export function createAgentSkills() {
    return {
        gathering: { level: 0, xp: 0 },
        fishing: { level: 0, xp: 0 },
        crafting: { level: 0, xp: 0 },
        combat: { level: 0, xp: 0 },
        cooking: { level: 0, xp: 0 }
    };
}

/**
 * Get XP required for a specific level
 */
export function getXPForLevel(level) {
    return Math.floor(XP_PER_LEVEL * Math.pow(XP_SCALING, level));
}

/**
 * Add XP to a skill, handling level ups
 * @returns {object} { leveled, newLevel }
 */
export function addSkillXP(skills, skillId, amount, apprenticeshipBonus = 1) {
    const skill = skills[skillId];
    if (!skill) return { leveled: false, newLevel: 0 };
    
    const maxLevel = SKILLS[skillId.toUpperCase()]?.maxLevel || 100;
    if (skill.level >= maxLevel) return { leveled: false, newLevel: skill.level };
    
    // Apply apprenticeship bonus (nearby skilled agent)
    skill.xp += amount * apprenticeshipBonus;
    
    // Check for level up
    const xpNeeded = getXPForLevel(skill.level);
    let leveled = false;
    
    while (skill.xp >= xpNeeded && skill.level < maxLevel) {
        skill.xp -= xpNeeded;
        skill.level++;
        leveled = true;
    }
    
    return { leveled, newLevel: skill.level };
}

/**
 * Get skill level
 */
export function getSkillLevel(skills, skillId) {
    return skills[skillId]?.level || 0;
}

/**
 * Get skill bonus for a specific effect
 */
export function getSkillBonus(skills, skillId, bonusType) {
    const skillDef = SKILLS[skillId.toUpperCase()];
    if (!skillDef || !skillDef[bonusType]) return 0;
    
    const level = getSkillLevel(skills, skillId);
    return skillDef[bonusType](level);
}

/**
 * Calculate apprenticeship bonus based on nearby skilled agents
 * Children near skilled adults learn faster
 */
export function getApprenticeshipBonus(agentSkillLevel, nearbyAgents, skillId) {
    let bonus = 1;
    
    nearbyAgents.forEach(other => {
        const otherLevel = getSkillLevel(other.skills, skillId);
        if (otherLevel > agentSkillLevel + 10) {
            // 50% bonus per skilled mentor, max 2x total
            bonus += 0.5;
        }
    });
    
    return Math.min(2, bonus);
}

/**
 * Calculate gathering speed with skill bonus
 */
export function getGatheringSpeed(skills, baseTime) {
    const bonus = getSkillBonus(skills, 'gathering', 'speedBonus');
    return baseTime / (1 + bonus);
}

/**
 * Calculate gathering yield with skill bonus
 */
export function getGatheringYield(skills, baseYield) {
    const bonus = getSkillBonus(skills, 'gathering', 'yieldBonus');
    return Math.floor(baseYield * (1 + bonus));
}

/**
 * Calculate fishing catch chance with skill bonus
 */
export function getFishingCatchChance(skills, baseChance) {
    const bonus = getSkillBonus(skills, 'fishing', 'catchBonus');
    return Math.min(1, baseChance * (1 + bonus));
}

/**
 * Calculate crafting time with skill bonus
 */
export function getCraftingTime(skills, baseTime) {
    const reduction = getSkillBonus(skills, 'crafting', 'timeReduction');
    return baseTime * (1 - reduction);
}

/**
 * Calculate item durability with skill bonus
 */
export function getCraftedDurability(skills, baseDurability) {
    const bonus = getSkillBonus(skills, 'crafting', 'durabilityBonus');
    return Math.floor(baseDurability * (1 + bonus));
}

/**
 * Calculate combat win chance
 */
export function getCombatWinChance(attackerSkills, defenderSkills) {
    const attackerBonus = getSkillBonus(attackerSkills, 'combat', 'winChanceBonus');
    const defenderBonus = getSkillBonus(defenderSkills, 'combat', 'winChanceBonus');
    
    // Base 50% chance, modified by skill difference
    const baseChance = 0.5;
    const skillDiff = attackerBonus - defenderBonus;
    
    return Math.max(0.1, Math.min(0.9, baseChance + skillDiff));
}

/**
 * Calculate cooking time with skill bonus
 */
export function getCookingTime(skills, baseTime) {
    const reduction = getSkillBonus(skills, 'cooking', 'timeReduction');
    return baseTime * (1 - reduction);
}

/**
 * Calculate cooked food nutrition with skill bonus
 */
export function getCookedNutrition(skills, baseNutrition) {
    const bonus = getSkillBonus(skills, 'cooking', 'nutritionBonus');
    return baseNutrition * (1 + bonus);
}

/**
 * XP rewards for various actions
 */
export const XP_REWARDS = {
    // Gathering
    gather_coconut: { skill: 'gathering', xp: 5 },
    gather_wood: { skill: 'gathering', xp: 8 },
    gather_stone: { skill: 'gathering', xp: 10 },
    gather_vine: { skill: 'gathering', xp: 5 },
    
    // Fishing
    catch_mullet: { skill: 'fishing', xp: 5 },
    catch_parrotfish: { skill: 'fishing', xp: 15 },
    catch_grouper: { skill: 'fishing', xp: 30 },
    catch_shark: { skill: 'fishing', xp: 100 },
    
    // Crafting
    craft_tool: { skill: 'crafting', xp: 20 },
    craft_boat: { skill: 'crafting', xp: 50 },
    craft_shelter: { skill: 'crafting', xp: 40 },
    repair_item: { skill: 'crafting', xp: 10 },
    
    // Combat
    win_fight: { skill: 'combat', xp: 25 },
    kill_shark: { skill: 'combat', xp: 100 },
    kill_squid: { skill: 'combat', xp: 500 },
    
    // Cooking
    cook_fish: { skill: 'cooking', xp: 10 },
    cook_meal: { skill: 'cooking', xp: 20 }
};

/**
 * Award XP for an action
 */
export function awardXP(skills, actionId, nearbyAgents = []) {
    const reward = XP_REWARDS[actionId];
    if (!reward) return { leveled: false, newLevel: 0 };
    
    const currentLevel = getSkillLevel(skills, reward.skill);
    const apprenticeshipBonus = getApprenticeshipBonus(currentLevel, nearbyAgents, reward.skill);
    
    return addSkillXP(skills, reward.skill, reward.xp, apprenticeshipBonus);
}

