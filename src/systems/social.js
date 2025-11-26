// ============================================
// SOCIAL SYSTEM - Relationships & Interactions
// Per Island Sim Full Prompt spec
// ============================================

export const RELATIONSHIP_BOUNDS = {
    MIN: -100,
    MAX: 100,
    NEUTRAL: 0,
    FRIEND_THRESHOLD: 30,
    ENEMY_THRESHOLD: -30,
    FAMILY_BASE: 50
};

export const SOCIAL_ACTIONS = {
    HELP: 'help',
    TRADE: 'trade',
    BETRAY: 'betray',
    FIGHT: 'fight',
    TEAM_UP: 'team_up',
    MATE: 'mate',
    SHARE_FOOD: 'share_food',
    PROTECT: 'protect'
};

// Relationship changes for actions
export const RELATIONSHIP_CHANGES = {
    share_food: { giver: 0, receiver: 15 },
    help_build: { helper: 5, helped: 10 },
    protect: { protector: 5, protected: 20 },
    successful_mate: { both: 25 },
    trade_fair: { both: 5 },
    trade_unfair: { winner: 2, loser: -10 },
    refuse_help: { refuser: 0, refused: -8 },
    steal: { thief: 0, victim: -30 },
    betray_trade: { betrayer: 0, betrayed: -40 },
    attack: { attacker: 0, attacked: -25 },
    kill_family: { killer: 0, family: -100 },
    parent_child: { both: RELATIONSHIP_BOUNDS.FAMILY_BASE },
    sibling: { both: 30 },
    near_death_save: { saver: 10, saved: 50 }
};

/**
 * Create social state for an agent
 */
export function createAgentSocial(agentId) {
    return {
        id: agentId,
        relationships: new Map(), // agentId -> score
        familyIds: new Set(),     // Parents, children, siblings
        friendIds: new Set(),
        enemyIds: new Set(),
        
        // Tracking
        totalHelpsGiven: 0,
        totalHelpsReceived: 0,
        totalBetrayals: 0,
        totalFights: 0,
        
        // Status
        isHero: false,           // Killed shark
        isLegend: false,         // Killed squid
        heroKills: 0
    };
}

/**
 * Get relationship score between two agents
 */
export function getRelationship(social, otherAgentId) {
    return social.relationships.get(otherAgentId) || RELATIONSHIP_BOUNDS.NEUTRAL;
}

/**
 * Set relationship score (clamped)
 */
export function setRelationship(social, otherAgentId, score) {
    const clamped = Math.max(RELATIONSHIP_BOUNDS.MIN, Math.min(RELATIONSHIP_BOUNDS.MAX, score));
    social.relationships.set(otherAgentId, clamped);
    
    // Update friend/enemy sets
    if (clamped >= RELATIONSHIP_BOUNDS.FRIEND_THRESHOLD) {
        social.friendIds.add(otherAgentId);
        social.enemyIds.delete(otherAgentId);
    } else if (clamped <= RELATIONSHIP_BOUNDS.ENEMY_THRESHOLD) {
        social.enemyIds.add(otherAgentId);
        social.friendIds.delete(otherAgentId);
    } else {
        social.friendIds.delete(otherAgentId);
        social.enemyIds.delete(otherAgentId);
    }
}

/**
 * Modify relationship by delta
 */
export function modifyRelationship(social, otherAgentId, delta) {
    const current = getRelationship(social, otherAgentId);
    setRelationship(social, otherAgentId, current + delta);
}

/**
 * Establish family relationship (parent-child, siblings)
 */
export function establishFamily(social1, social2, type = 'parent_child') {
    social1.familyIds.add(social2.id);
    social2.familyIds.add(social1.id);
    
    const change = RELATIONSHIP_CHANGES[type]?.both || RELATIONSHIP_BOUNDS.FAMILY_BASE;
    modifyRelationship(social1, social2.id, change);
    modifyRelationship(social2, social1.id, change);
}

/**
 * Process a social action between two agents
 */
export function processSocialAction(actor, target, action, context = {}) {
    const events = [];
    
    switch (action) {
        case SOCIAL_ACTIONS.SHARE_FOOD: {
            const change = RELATIONSHIP_CHANGES.share_food;
            modifyRelationship(target, actor.id, change.receiver);
            actor.totalHelpsGiven++;
            target.totalHelpsReceived++;
            events.push({ type: 'food_shared', from: actor.id, to: target.id });
            break;
        }
        
        case SOCIAL_ACTIONS.HELP: {
            const change = RELATIONSHIP_CHANGES.help_build;
            modifyRelationship(actor, target.id, change.helper);
            modifyRelationship(target, actor.id, change.helped);
            actor.totalHelpsGiven++;
            target.totalHelpsReceived++;
            events.push({ type: 'helped', from: actor.id, to: target.id });
            break;
        }
        
        case SOCIAL_ACTIONS.PROTECT: {
            const change = RELATIONSHIP_CHANGES.protect;
            modifyRelationship(actor, target.id, change.protector);
            modifyRelationship(target, actor.id, change.protected);
            events.push({ type: 'protected', from: actor.id, to: target.id });
            break;
        }
        
        case SOCIAL_ACTIONS.TRADE: {
            const isFair = context.fair !== false;
            const change = isFair ? RELATIONSHIP_CHANGES.trade_fair : RELATIONSHIP_CHANGES.trade_unfair;
            if (isFair) {
                modifyRelationship(actor, target.id, change.both);
                modifyRelationship(target, actor.id, change.both);
            } else {
                modifyRelationship(actor, target.id, change.winner);
                modifyRelationship(target, actor.id, change.loser);
            }
            events.push({ type: 'traded', fair: isFair, between: [actor.id, target.id] });
            break;
        }
        
        case SOCIAL_ACTIONS.BETRAY: {
            const change = RELATIONSHIP_CHANGES.betray_trade;
            modifyRelationship(target, actor.id, change.betrayed);
            actor.totalBetrayals++;
            events.push({ type: 'betrayed', by: actor.id, victim: target.id });
            break;
        }
        
        case SOCIAL_ACTIONS.FIGHT: {
            const change = RELATIONSHIP_CHANGES.attack;
            modifyRelationship(target, actor.id, change.attacked);
            actor.totalFights++;
            target.totalFights++;
            
            // Family killing is worst
            if (actor.familyIds.has(target.id)) {
                // All family members hate the killer
                actor.familyIds.forEach(famId => {
                    if (famId !== target.id) {
                        modifyRelationship({ relationships: new Map([[famId, 0]]) }, actor.id, RELATIONSHIP_CHANGES.kill_family.family);
                    }
                });
            }
            events.push({ type: 'fought', attacker: actor.id, defender: target.id });
            break;
        }
        
        case SOCIAL_ACTIONS.MATE: {
            const change = RELATIONSHIP_CHANGES.successful_mate;
            modifyRelationship(actor, target.id, change.both);
            modifyRelationship(target, actor.id, change.both);
            events.push({ type: 'mated', between: [actor.id, target.id] });
            break;
        }
        
        case SOCIAL_ACTIONS.TEAM_UP: {
            // Small positive boost for cooperation
            modifyRelationship(actor, target.id, 3);
            modifyRelationship(target, actor.id, 3);
            events.push({ type: 'teamed_up', between: [actor.id, target.id] });
            break;
        }
    }
    
    return events;
}

/**
 * Grant hero status (killed shark)
 */
export function grantHeroStatus(social, allAgentSocials) {
    social.isHero = true;
    social.heroKills++;
    
    // Big positive relationship boost with everyone
    allAgentSocials.forEach(other => {
        if (other.id !== social.id) {
            modifyRelationship(other, social.id, 30);
        }
    });
    
    return { type: 'became_hero', agentId: social.id };
}

/**
 * Grant legend status (killed giant squid)
 */
export function grantLegendStatus(social, allAgentSocials) {
    social.isLegend = true;
    social.heroKills++;
    
    // Massive positive relationship with everyone (+100)
    allAgentSocials.forEach(other => {
        if (other.id !== social.id) {
            setRelationship(other, social.id, RELATIONSHIP_BOUNDS.MAX);
        }
    });
    
    return { type: 'became_legend', agentId: social.id };
}

/**
 * Check if two agents are willing to cooperate
 */
export function willCooperate(social1, social2) {
    const rel1 = getRelationship(social1, social2.id);
    const rel2 = getRelationship(social2, social1.id);
    
    // Both need at least neutral relationship
    return rel1 >= 0 && rel2 >= 0;
}

/**
 * Check if two agents are willing to mate
 */
export function willMate(social1, social2) {
    const rel1 = getRelationship(social1, social2.id);
    const rel2 = getRelationship(social2, social1.id);
    
    // Need positive relationship
    return rel1 > 10 && rel2 > 10;
}

/**
 * Get list of friends (positive relationship)
 */
export function getFriends(social) {
    return Array.from(social.friendIds);
}

/**
 * Get list of enemies (negative relationship)
 */
export function getEnemies(social) {
    return Array.from(social.enemyIds);
}

/**
 * Get list of family members
 */
export function getFamily(social) {
    return Array.from(social.familyIds);
}

/**
 * Calculate social standing (reputation)
 */
export function getSocialStanding(social, allAgentSocials) {
    let total = 0;
    let count = 0;
    
    allAgentSocials.forEach(other => {
        if (other.id !== social.id) {
            total += getRelationship(other, social.id);
            count++;
        }
    });
    
    if (count === 0) return 0;
    
    let standing = total / count;
    
    // Bonuses
    if (social.isLegend) standing += 50;
    else if (social.isHero) standing += 25;
    
    return standing;
}

/**
 * Find best potential mate based on relationship and availability
 */
export function findBestMate(social, allAgentSocials, isAvailable) {
    let best = null;
    let bestScore = -Infinity;
    
    allAgentSocials.forEach(other => {
        if (other.id === social.id) return;
        if (!isAvailable(other.id)) return;
        if (!willMate(social, other)) return;
        
        const rel = getRelationship(social, other.id);
        if (rel > bestScore) {
            bestScore = rel;
            best = other;
        }
    });
    
    return best;
}

/**
 * Find agents willing to help in a fight/hunt
 */
export function findAllies(social, allAgentSocials, minRelationship = 20) {
    const allies = [];
    
    allAgentSocials.forEach(other => {
        if (other.id === social.id) return;
        
        const rel = getRelationship(other, social.id);
        if (rel >= minRelationship) {
            allies.push({ social: other, relationship: rel });
        }
    });
    
    // Sort by relationship strength
    allies.sort((a, b) => b.relationship - a.relationship);
    
    return allies.map(a => a.social);
}

