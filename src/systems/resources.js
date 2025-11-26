// ============================================
// RESOURCES & FOOD SYSTEM
// Per Island Sim Full Prompt spec
// ============================================

// ============================================
// RESOURCE DEFINITIONS
// ============================================

export const RESOURCES = {
    // Food - Coconuts
    COCONUT: {
        id: 'coconut',
        name: 'Coconut',
        type: 'food',
        nutrition: 0.35,
        gatherTime: 1.0,
        energyCost: 0.05,
        spoils: false,
        stackSize: 6,
        sources: ['palm_tree']
    },
    
    // Food - Fish (Tiered)
    MULLET: {
        id: 'mullet',
        name: 'Mullet',
        type: 'food',
        tier: 1,
        nutrition: 0.15,
        nutritionCooked: 0.25,
        catchTime: 3.0,
        energyCost: 0.08,
        spoilTime: 120, // 2 minutes
        stackSize: 4,
        location: 'shore',
        dangerDay: 0,
        dangerNight: 0,
        toolRequired: null,
        description: 'Small fish from tidal pools. Safe, low reward.'
    },
    PARROTFISH: {
        id: 'parrotfish',
        name: 'Parrotfish',
        type: 'food',
        tier: 2,
        nutrition: 0.3,
        nutritionCooked: 0.45,
        catchTime: 5.0,
        energyCost: 0.12,
        spoilTime: 100,
        stackSize: 3,
        location: 'shallow_reef',
        dangerDay: 0,
        dangerNight: 0.02, // 2% shark risk at night
        toolRequired: 'spear',
        description: 'Medium fish from shallow reef. Needs spear.'
    },
    GROUPER: {
        id: 'grouper',
        name: 'Grouper',
        type: 'food',
        tier: 3,
        nutrition: 0.5,
        nutritionCooked: 0.7,
        catchTime: 8.0,
        energyCost: 0.2,
        spoilTime: 80,
        stackSize: 2,
        location: 'deep_reef',
        dangerDay: 0.05,  // 5% shark risk
        dangerNight: 0.5, // 50% shark risk at night!
        toolRequired: 'spear',
        skillRequired: 'diving',
        description: 'Large fish from deep reef. High risk, high reward.'
    },
    
    // Building Materials
    WOOD: {
        id: 'wood',
        name: 'Wood',
        type: 'material',
        gatherTime: 2.0,
        energyCost: 0.1,
        stackSize: 10,
        sources: ['ground_stick', 'palm_chop', 'jungle_tree']
    },
    STONE: {
        id: 'stone',
        name: 'Stone',
        type: 'material',
        gatherTime: 2.5,
        energyCost: 0.12,
        stackSize: 8,
        sources: ['rock']
    },
    VINE: {
        id: 'vine',
        name: 'Vine',
        type: 'material',
        gatherTime: 1.5,
        energyCost: 0.06,
        stackSize: 8,
        sources: ['bush', 'jungle_tree']
    },
    LEAVES: {
        id: 'leaves',
        name: 'Palm Leaves',
        type: 'material',
        gatherTime: 1.0,
        energyCost: 0.04,
        stackSize: 12,
        sources: ['palm_tree', 'bush']
    },
    
    // Special drops
    SHARK_MEAT: {
        id: 'shark_meat',
        name: 'Shark Meat',
        type: 'food',
        nutrition: 0.8,
        nutritionCooked: 1.0,
        spoilTime: 60,
        stackSize: 8,
        description: 'Massive meat yield from bull shark.'
    },
    SHARK_TEETH: {
        id: 'shark_teeth',
        name: 'Shark Teeth',
        type: 'trophy',
        stackSize: 20,
        description: 'Sharp teeth for tools and weapons.'
    },
    SHARK_SKIN: {
        id: 'shark_skin',
        name: 'Shark Skin',
        type: 'material',
        stackSize: 4,
        description: 'Tough hide for armor.'
    },
    SQUID_MEAT: {
        id: 'squid_meat',
        name: 'Giant Squid Meat',
        type: 'food',
        nutrition: 1.0,
        nutritionCooked: 1.2,
        spoilTime: 40,
        stackSize: 20,
        description: 'Legendary feast for the tribe.'
    },
    SQUID_BEAK: {
        id: 'squid_beak',
        name: 'Squid Beak',
        type: 'trophy',
        stackSize: 1,
        description: 'Ultimate crafting material.'
    },
    SQUID_TENTACLE: {
        id: 'squid_tentacle',
        name: 'Squid Tentacle',
        type: 'material',
        stackSize: 8,
        description: 'Super-strong rope material.'
    },
    SQUID_INK: {
        id: 'squid_ink',
        name: 'Squid Ink Sac',
        type: 'material',
        stackSize: 2,
        description: 'Powerful dye and medicine.'
    }
};

// ============================================
// TOOL DEFINITIONS
// ============================================

export const TOOLS = {
    FISHING_SPEAR: {
        id: 'fishing_spear',
        name: 'Fishing Spear',
        type: 'tool',
        recipe: { wood: 2, stone: 1 },
        craftTime: 5.0,
        durability: 15,
        effects: {
            fishingSpeedBonus: 0.5,
            canCatchTier2: true,
            canCatchTier3: true
        }
    },
    GATHERING_STICK: {
        id: 'gathering_stick',
        name: 'Gathering Stick',
        type: 'tool',
        recipe: { wood: 2, vine: 1 },
        craftTime: 3.0,
        durability: 20,
        effects: {
            gatherSpeedBonus: 0.5
        }
    },
    STONE_AXE: {
        id: 'stone_axe',
        name: 'Stone Axe',
        type: 'tool',
        recipe: { wood: 2, stone: 2, vine: 1 },
        craftTime: 8.0,
        durability: 10,
        effects: {
            canChopTrees: true,
            woodYieldBonus: 1.0,
            combatDamageBonus: 0.3
        }
    },
    SHARK_SPEAR: {
        id: 'shark_spear',
        name: 'Shark-Tooth Spear',
        type: 'weapon',
        recipe: { wood: 3, shark_teeth: 5, vine: 2 },
        craftTime: 12.0,
        durability: 25,
        effects: {
            combatDamageBonus: 0.8,
            fishingSpeedBonus: 0.8,
            canHuntSharks: true
        }
    }
};

// ============================================
// STRUCTURE DEFINITIONS
// ============================================

export const STRUCTURES = {
    FIRE: {
        id: 'fire',
        name: 'Campfire',
        recipe: { wood: 3, stone: 2 },
        buildTime: 5.0,
        fuelPerSecond: 0.02, // Wood consumed per second
        radius: 8,
        effects: {
            canCook: true,
            warmthBonus: 0.2,
            energyRegenBonus: 0.1
        }
    },
    SHELTER: {
        id: 'shelter',
        name: 'Shelter',
        recipe: { wood: 8, vine: 4, leaves: 6 },
        buildTime: 30.0,
        capacity: 4, // Max agents
        effects: {
            energyRegenMultiplier: 2.0,
            weatherProtection: true,
            sicknessResistance: 0.3
        }
    },
    BOAT: {
        id: 'boat',
        name: 'Fishing Boat',
        recipe: { wood: 12, vine: 6, leaves: 4 },
        buildTime: 60.0,
        durability: 100,
        capacity: 3, // Max agents
        effects: {
            canReachDeepWater: true,
            fishingBonus: 0.3
        }
    }
};

// ============================================
// INVENTORY HELPERS
// ============================================

/**
 * Create empty inventory
 */
export function createInventory(maxSlots = 12) {
    return {
        slots: new Map(), // resourceId -> { count, items[] }
        maxSlots,
        tools: new Map(), // toolId -> { durability }
        equippedTool: null
    };
}

/**
 * Add item to inventory
 * @returns {boolean} success
 */
export function addToInventory(inventory, resourceId, count = 1, itemData = {}) {
    const resource = RESOURCES[resourceId.toUpperCase()] || RESOURCES[resourceId];
    if (!resource) return false;
    
    const existing = inventory.slots.get(resourceId) || { count: 0, items: [] };
    const stackSize = resource.stackSize || 10;
    
    // Check if we can add
    if (existing.count + count > stackSize) {
        // Check if we have room for new slot
        if (inventory.slots.size >= inventory.maxSlots && existing.count === 0) {
            return false; // No room
        }
    }
    
    existing.count = Math.min(stackSize, existing.count + count);
    
    // Track individual items for spoilage
    if (resource.spoilTime) {
        for (let i = 0; i < count; i++) {
            existing.items.push({
                spawnTime: Date.now(),
                spoilTime: resource.spoilTime * 1000,
                isCooked: itemData.isCooked || false,
                ...itemData
            });
        }
    }
    
    inventory.slots.set(resourceId, existing);
    return true;
}

/**
 * Remove item from inventory
 * @returns {object|null} removed item data or null
 */
export function removeFromInventory(inventory, resourceId, count = 1) {
    const existing = inventory.slots.get(resourceId);
    if (!existing || existing.count < count) return null;
    
    existing.count -= count;
    
    // Remove tracked items (oldest first)
    const removed = existing.items.splice(0, count);
    
    if (existing.count <= 0) {
        inventory.slots.delete(resourceId);
    }
    
    return removed.length > 0 ? removed : { count };
}

/**
 * Get count of resource in inventory
 */
export function getInventoryCount(inventory, resourceId) {
    return inventory.slots.get(resourceId)?.count || 0;
}

/**
 * Get total items in inventory
 */
export function getInventoryTotal(inventory) {
    let total = 0;
    inventory.slots.forEach(slot => total += slot.count);
    return total;
}

/**
 * Check if inventory has room
 */
export function hasInventoryRoom(inventory, resourceId = null) {
    if (resourceId) {
        const existing = inventory.slots.get(resourceId);
        const resource = RESOURCES[resourceId.toUpperCase()] || RESOURCES[resourceId];
        if (existing && existing.count < (resource?.stackSize || 10)) return true;
    }
    return inventory.slots.size < inventory.maxSlots;
}

/**
 * Add tool to inventory
 */
export function addTool(inventory, toolId, durability = null) {
    const tool = TOOLS[toolId.toUpperCase()] || TOOLS[toolId];
    if (!tool) return false;
    
    inventory.tools.set(toolId, {
        durability: durability ?? tool.durability,
        maxDurability: tool.durability
    });
    return true;
}

/**
 * Use tool (reduce durability)
 * @returns {boolean} tool still usable
 */
export function useTool(inventory, toolId) {
    const tool = inventory.tools.get(toolId);
    if (!tool) return false;
    
    tool.durability--;
    
    if (tool.durability <= 0) {
        inventory.tools.delete(toolId);
        if (inventory.equippedTool === toolId) {
            inventory.equippedTool = null;
        }
        return false; // Tool broke
    }
    
    return true;
}

/**
 * Equip a tool
 */
export function equipTool(inventory, toolId) {
    if (!inventory.tools.has(toolId)) return false;
    inventory.equippedTool = toolId;
    return true;
}

/**
 * Get equipped tool effects
 */
export function getEquippedToolEffects(inventory) {
    if (!inventory.equippedTool) return {};
    const toolDef = TOOLS[inventory.equippedTool.toUpperCase()] || TOOLS[inventory.equippedTool];
    return toolDef?.effects || {};
}

/**
 * Check if tool available
 */
export function hasTool(inventory, toolId) {
    return inventory.tools.has(toolId);
}

// ============================================
// FOOD & SPOILAGE
// ============================================

/**
 * Update spoilage for inventory items
 * @returns {array} spoiled items
 */
export function updateSpoilage(inventory, currentTime = Date.now()) {
    const spoiled = [];
    
    inventory.slots.forEach((slot, resourceId) => {
        const resource = RESOURCES[resourceId.toUpperCase()] || RESOURCES[resourceId];
        if (!resource?.spoilTime) return;
        
        // Check each item for spoilage
        for (let i = slot.items.length - 1; i >= 0; i--) {
            const item = slot.items[i];
            const age = currentTime - item.spawnTime;
            
            if (age >= item.spoilTime) {
                slot.items.splice(i, 1);
                slot.count--;
                spoiled.push({ resourceId, item });
            }
        }
        
        if (slot.count <= 0) {
            inventory.slots.delete(resourceId);
        }
    });
    
    return spoiled;
}

/**
 * Get food nutrition value
 */
export function getFoodNutrition(resourceId, isCooked = false) {
    const resource = RESOURCES[resourceId.toUpperCase()] || RESOURCES[resourceId];
    if (!resource || resource.type !== 'food') return 0;
    
    if (isCooked && resource.nutritionCooked) {
        return resource.nutritionCooked;
    }
    return resource.nutrition || 0;
}

/**
 * Check if food is raw (can cause sickness)
 */
export function isFoodRaw(resourceId, itemData = {}) {
    const resource = RESOURCES[resourceId.toUpperCase()] || RESOURCES[resourceId];
    if (!resource || resource.type !== 'food') return false;
    
    // Coconuts are never raw
    if (resourceId === 'coconut') return false;
    
    // Fish are raw unless cooked
    return !itemData.isCooked;
}

/**
 * Check if food is spoiled
 */
export function isFoodSpoiled(itemData, currentTime = Date.now()) {
    if (!itemData?.spawnTime || !itemData?.spoilTime) return false;
    return (currentTime - itemData.spawnTime) >= itemData.spoilTime;
}

// ============================================
// CRAFTING
// ============================================

/**
 * Check if can craft item
 */
export function canCraft(inventory, recipeId) {
    const recipe = TOOLS[recipeId.toUpperCase()]?.recipe || 
                   STRUCTURES[recipeId.toUpperCase()]?.recipe;
    if (!recipe) return false;
    
    for (const [resourceId, needed] of Object.entries(recipe)) {
        if (getInventoryCount(inventory, resourceId) < needed) {
            return false;
        }
    }
    return true;
}

/**
 * Consume resources for crafting
 */
export function consumeCraftingResources(inventory, recipeId) {
    const recipe = TOOLS[recipeId.toUpperCase()]?.recipe || 
                   STRUCTURES[recipeId.toUpperCase()]?.recipe;
    if (!recipe) return false;
    
    for (const [resourceId, needed] of Object.entries(recipe)) {
        removeFromInventory(inventory, resourceId, needed);
    }
    return true;
}

/**
 * Get crafting time for item
 */
export function getCraftTime(recipeId, skillBonus = 0) {
    const item = TOOLS[recipeId.toUpperCase()] || STRUCTURES[recipeId.toUpperCase()];
    if (!item) return 0;
    
    return item.craftTime * (1 - skillBonus);
}

