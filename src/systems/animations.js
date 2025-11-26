// ============================================
// ANIMATION SYSTEM OVERHAUL
// ============================================
// Comprehensive animation system for all agent actions

/**
 * Animation System - handles all agent animations
 * Provides realistic, action-specific animations for every behavior
 */
export class AnimationSystem {
    constructor() {
        this.animations = new Map();
    }

    /**
     * GATHERING ANIMATIONS
     */

    /**
     * Coconut gathering - reaching up animation
     */
    static animateCoconutGathering(member, delta, phase) {
        const reachPhase = Math.sin(phase * 8);

        // Right arm reaches up high
        member.rightArm.rotation.x = -1.5 - reachPhase * 0.3;
        member.rightArm.rotation.z = 0.3;

        // Left arm supports/balances
        member.leftArm.rotation.x = -0.5 + reachPhase * 0.2;

        // Slight body lean back for reaching
        member.torso.rotation.x = -0.1 - reachPhase * 0.05;

        // Legs stable but slight bounce
        const bounce = Math.abs(reachPhase) * 0.15;
        member.leftLeg.rotation.x = bounce;
        member.rightLeg.rotation.x = -bounce;

        return reachPhase;
    }

    /**
     * Wood gathering - chopping/punching animation
     */
    static animateWoodGathering(member, delta, phase) {
        const chopPhase = Math.sin(phase * 10);
        const isPunching = chopPhase > 0;

        if (isPunching) {
            // Punch forward with right arm
            member.rightArm.rotation.x = -0.6 - chopPhase * 0.8;
            member.rightArm.rotation.y = -0.2;
            member.leftArm.rotation.x = 0.2 + chopPhase * 0.4;
        } else {
            // Wind up
            member.rightArm.rotation.x = 0.4;
            member.rightArm.rotation.y = 0.3;
            member.leftArm.rotation.x = -0.3;
        }

        // Torso rotation for power
        member.torso.rotation.y = chopPhase * 0.3;
        member.torso.rotation.x = -0.2 + chopPhase * 0.1;

        // Leg stance for stability
        member.leftLeg.rotation.x = 0.2;
        member.rightLeg.rotation.x = -0.1;

        return chopPhase;
    }

    /**
     * Stone gathering - overhead smashing animation
     */
    static animateStoneGathering(member, delta, phase) {
        const smashPhase = Math.sin(phase * 8);
        const isSmashing = smashPhase < 0;

        if (isSmashing) {
            // Arms come down hard
            member.rightArm.rotation.x = -0.8 + smashPhase * 0.6;
            member.leftArm.rotation.x = -0.7 + smashPhase * 0.5;
        } else {
            // Arms raised overhead
            member.rightArm.rotation.x = -2.0 + smashPhase * 0.4;
            member.leftArm.rotation.x = -1.9 + smashPhase * 0.3;
        }

        // Body lean for momentum
        member.torso.rotation.x = smashPhase * 0.2;

        // Stable stance
        member.leftLeg.rotation.x = 0.1;
        member.rightLeg.rotation.x = -0.1;

        return smashPhase;
    }

    /**
     * CARRYING ANIMATIONS
     */

    /**
     * Carrying coconuts - arms up to support head-carried load
     */
    static animateCarryingCoconuts(member, delta, count = 1) {
        // Arms up to balance/support load on head
        member.rightArm.rotation.x = -1.2;
        member.rightArm.rotation.y = 0;
        member.leftArm.rotation.x = -1.2;
        member.leftArm.rotation.y = 0;

        // Slight upright posture for balance
        member.torso.rotation.x = 0;

        // Walking animation with carrying
        const walkPhase = member.walkPhase || 0;
        const legSwing = Math.sin(walkPhase) * 0.3; // Reduced swing when carrying
        member.leftLeg.rotation.x = legSwing;
        member.rightLeg.rotation.x = -legSwing;
    }

    /**
     * Carrying wood - bundle on head
     */
    static animateCarryingWood(member, delta) {
        // Both arms up to balance wood bundle on head
        member.rightArm.rotation.x = -1.2;
        member.rightArm.rotation.z = 0;

        // Left arm helps balance
        member.leftArm.rotation.x = -1.2;
        member.leftArm.rotation.z = 0;

        // Upright posture for balance
        member.torso.rotation.z = 0;

        // Stable walking
        const walkPhase = member.walkPhase || 0;
        const legSwing = Math.sin(walkPhase) * 0.25;
        member.leftLeg.rotation.x = legSwing;
        member.rightLeg.rotation.x = -legSwing;
    }

    /**
     * Carrying stone - heavy load on head
     */
    static animateCarryingStone(member, delta) {
        // Both arms up to balance heavy stone on head
        member.rightArm.rotation.x = -1.3;
        member.rightArm.rotation.z = 0;
        member.leftArm.rotation.x = -1.3;
        member.leftArm.rotation.z = 0;

        // Upright but careful posture
        member.torso.rotation.x = 0;

        // Slow, careful steps
        const walkPhase = member.walkPhase || 0;
        const legSwing = Math.sin(walkPhase) * 0.2; // Very reduced
        member.leftLeg.rotation.x = legSwing;
        member.rightLeg.rotation.x = -legSwing;
    }

    /**
     * FISHING ANIMATIONS
     */

    /**
     * Wading into water - careful steps
     */
    static animateWading(member, delta, depth) {
        const wadingPhase = member.walkPhase || 0;

        // Arms out for balance
        member.rightArm.rotation.x = -0.3;
        member.rightArm.rotation.z = 0.6;
        member.leftArm.rotation.x = -0.3;
        member.leftArm.rotation.z = -0.6;

        // Careful leg movement
        const legSwing = Math.sin(wadingPhase) * 0.2;
        member.leftLeg.rotation.x = legSwing;
        member.rightLeg.rotation.x = -legSwing;

        // Lean back slightly
        member.torso.rotation.x = -0.1;
    }

    /**
     * Spearfishing - ready stance then thrust
     */
    static animateFishing(member, delta, phase, hasSpear) {
        if (!hasSpear) {
            // No spear - idle in water
            member.rightArm.rotation.x = -0.2;
            member.leftArm.rotation.x = -0.2;
            return;
        }

        const thrustPhase = Math.sin(phase * 3);
        const isThrusting = thrustPhase > 0.7;

        if (isThrusting) {
            // Thrust spear down into water
            member.rightArm.rotation.x = 0.8 + thrustPhase * 0.4;
            member.rightArm.rotation.y = 0;
            member.leftArm.rotation.x = 0.3;

            // Lean forward aggressively
            member.torso.rotation.x = 0.4;
        } else {
            // Ready stance - spear raised
            member.rightArm.rotation.x = -1.0;
            member.rightArm.rotation.y = 0;
            member.leftArm.rotation.x = -0.5;

            // Upright, focused
            member.torso.rotation.x = 0.1;
        }

        // Stable stance in water
        member.leftLeg.rotation.x = 0.1;
        member.rightLeg.rotation.x = -0.1;
    }

    /**
     * CRAFTING ANIMATIONS
     */

    /**
     * Crafting at hut - working with hands
     */
    static animateCrafting(member, delta, phase) {
        const workPhase = Math.sin(phase * 4);

        // Hands working on craft
        member.rightArm.rotation.x = -0.6 + workPhase * 0.3;
        member.rightArm.rotation.y = -0.3 + workPhase * 0.2;
        member.leftArm.rotation.x = -0.5 - workPhase * 0.2;
        member.leftArm.rotation.y = 0.3 - workPhase * 0.2;

        // Leaning over work
        member.torso.rotation.x = 0.3;

        // Kneeling or seated stance
        member.leftLeg.rotation.x = 0.8;
        member.rightLeg.rotation.x = 0.7;
    }

    /**
     * EATING ANIMATIONS
     */

    /**
     * Eating - bringing food to mouth
     */
    static animateEating(member, delta, phase) {
        const eatPhase = Math.sin(phase * 5);
        const isBiting = eatPhase > 0;

        if (isBiting) {
            // Bring food to mouth
            member.rightArm.rotation.x = -1.8;
            member.rightArm.rotation.y = -0.4;
            member.rightArm.rotation.z = 0.2;

            // Head tilts slightly
            member.head.rotation.x = -0.2;
        } else {
            // Lower food
            member.rightArm.rotation.x = -1.0;
            member.rightArm.rotation.y = -0.2;

            member.head.rotation.x = 0;
        }

        // Other arm relaxed
        member.leftArm.rotation.x = 0;

        // Standing or sitting
        member.torso.rotation.x = 0;
        member.leftLeg.rotation.x = 0.1;
        member.rightLeg.rotation.x = -0.1;
    }

    /**
     * RESTING ANIMATIONS
     */

    /**
     * Resting - relaxed, breathing
     */
    static animateResting(member, delta, phase) {
        const breathe = Math.sin(phase * 2) * 0.02;

        // Relaxed arms
        member.rightArm.rotation.x = 0.2 + breathe;
        member.leftArm.rotation.x = 0.2 + breathe;

        // Slight torso movement from breathing
        member.torso.rotation.x = breathe;

        // Seated or lying position
        member.leftLeg.rotation.x = 1.2;
        member.rightLeg.rotation.x = 1.1;

        // Head slightly forward (resting)
        member.head.rotation.x = 0.2;
    }

    /**
     * WALKING ANIMATIONS
     */

    /**
     * Normal walking - smooth stride
     */
    static animateWalking(member, delta, walkSpeed) {
        const walkPhase = member.walkPhase || 0;
        const legSwing = Math.sin(walkPhase) * 0.5;
        const armSwing = Math.sin(walkPhase + Math.PI) * 0.3;

        member.leftLeg.rotation.x = legSwing;
        member.rightLeg.rotation.x = -legSwing;

        member.leftArm.rotation.x = -armSwing;
        member.rightArm.rotation.x = armSwing;

        // Natural torso sway
        member.torso.rotation.y = Math.sin(walkPhase * 2) * 0.05;

        // Head stays level
        member.head.rotation.x = 0;
    }

    /**
     * IDLE ANIMATIONS
     */

    /**
     * Idle - calm, attentive stance
     */
    static animateIdle(member, delta, phase) {
        const breathe = Math.sin(phase * 2) * 0.015;

        // Gentle breathing movement
        member.torso.rotation.x = breathe;

        // Arms at sides, relaxed
        member.rightArm.rotation.x *= 0.95;
        member.leftArm.rotation.x *= 0.95;

        // Legs in neutral stance
        member.leftLeg.rotation.x *= 0.95;
        member.rightLeg.rotation.x *= 0.95;

        // Alert head position
        member.head.rotation.x = 0;
    }
}

/**
 * Animation state constants
 */
export const ANIM_STATES = {
    IDLE: 'idle',
    WALKING: 'walking',
    GATHERING_COCONUT: 'gathering_coconut',
    GATHERING_WOOD: 'gathering_wood',
    GATHERING_STONE: 'gathering_stone',
    CARRYING_COCONUT: 'carrying_coconut',
    CARRYING_WOOD: 'carrying_wood',
    CARRYING_STONE: 'carrying_stone',
    FISHING_WADE: 'fishing_wade',
    FISHING_SPEAR: 'fishing_spear',
    CRAFTING: 'crafting',
    EATING: 'eating',
    RESTING: 'resting'
};
