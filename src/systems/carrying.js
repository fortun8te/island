// ============================================
// RESOURCE CARRYING VISUAL SYSTEM
// ============================================
// Advanced visual representation of carried resources

import * as THREE from 'three';

/**
 * Visual carrying system for resources
 * Shows different resources with proper positioning and visuals
 */
export class CarryingSystem {
    /**
     * Create visual mesh for coconuts
     */
    static createCoconutMesh(count = 1) {
        const group = new THREE.Group();

        for (let i = 0; i < Math.min(count, 3); i++) {
            const coconutGeo = new THREE.SphereGeometry(0.18, 8, 8);
            const coconutMat = new THREE.MeshStandardMaterial({
                color: 0x4a3520,
                roughness: 0.9,
                metalness: 0.1
            });
            const coconut = new THREE.Mesh(coconutGeo, coconutMat);
            coconut.castShadow = true;

            // Stack coconuts
            if (count === 1) {
                coconut.position.set(0, -0.1, 0.2);
            } else if (count === 2) {
                coconut.position.set(i * 0.2 - 0.1, -0.15, 0.2);
            } else {
                // 3 coconuts in triangle formation
                const positions = [
                    { x: 0, y: -0.1, z: 0.2 },
                    { x: -0.15, y: -0.2, z: 0.25 },
                    { x: 0.15, y: -0.2, z: 0.25 }
                ];
                coconut.position.copy(positions[i]);
            }

            group.add(coconut);
        }

        group.userData.resourceType = 'coconut';
        group.userData.count = count;
        return group;
    }

    /**
     * Create visual mesh for wood bundle
     */
    static createWoodMesh(count = 1) {
        const group = new THREE.Group();

        // Create bundle of sticks
        const stickCount = Math.min(count * 2, 6);

        for (let i = 0; i < stickCount; i++) {
            const stickGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
            const stickMat = new THREE.MeshStandardMaterial({
                color: 0x6b4423,
                roughness: 0.95
            });
            const stick = new THREE.Mesh(stickGeo, stickMat);
            stick.castShadow = true;

            // Bundle sticks together
            stick.rotation.z = Math.PI / 2;
            stick.rotation.y = (i / stickCount) * 0.4 - 0.2;
            stick.position.y = (i % 3) * 0.08 - 0.08;
            stick.position.x = -0.1 + (i % 2) * 0.05;

            group.add(stick);
        }

        // Position bundle on shoulder
        group.position.set(0.15, 0.4, -0.1);
        group.rotation.z = -0.3;

        group.userData.resourceType = 'wood';
        group.userData.count = count;
        return group;
    }

    /**
     * Create visual mesh for stone
     */
    static createStoneMesh(count = 1) {
        const group = new THREE.Group();

        const stoneCount = Math.min(count, 2);

        for (let i = 0; i < stoneCount; i++) {
            // Irregular stone shape
            const stoneGeo = new THREE.DodecahedronGeometry(0.15, 0);
            const stoneMat = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.9,
                metalness: 0.2,
                flatShading: true
            });
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.castShadow = true;

            // Random rotation for organic look
            stone.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            // Position stones
            if (stoneCount === 1) {
                stone.position.set(0, -0.3, 0.15);
            } else {
                stone.position.set((i - 0.5) * 0.25, -0.35 + i * 0.05, 0.15);
            }

            stone.scale.set(
                0.9 + Math.random() * 0.2,
                0.9 + Math.random() * 0.2,
                0.9 + Math.random() * 0.2
            );

            group.add(stone);
        }

        group.userData.resourceType = 'stone';
        group.userData.count = count;
        return group;
    }

    /**
     * Update carry visual based on inventory
     */
    static updateCarryVisual(member) {
        // Clear existing carry visuals
        this.clearCarryVisual(member);

        if (!member.inventory || member.inventory.slots.size === 0) {
            return;
        }

        // Determine what to show (priority: stone > wood > coconut)
        const slots = Array.from(member.inventory.slots.entries());

        for (const [resourceId, slot] of slots) {
            let mesh = null;

            if (resourceId === 'stone') {
                mesh = this.createStoneMesh(slot.count);
            } else if (resourceId === 'wood') {
                mesh = this.createWoodMesh(slot.count);
            } else if (resourceId === 'coconut') {
                mesh = this.createCoconutMesh(slot.count);
            }

            if (mesh) {
                member.mesh.add(mesh);
                if (!member.carryMeshes) member.carryMeshes = [];
                member.carryMeshes.push(mesh);
                // Only show one type at a time (prioritized above)
                break;
            }
        }
    }

    /**
     * Clear all carry visuals
     */
    static clearCarryVisual(member) {
        // Clear old single carryMesh (backward compat)
        if (member.carryMesh) {
            member.mesh.remove(member.carryMesh);
            member.carryMesh.geometry?.dispose();
            member.carryMesh.material?.dispose();
            member.carryMesh = null;
        }

        // Clear new carryMeshes array
        if (member.carryMeshes) {
            member.carryMeshes.forEach(mesh => {
                member.mesh.remove(mesh);
                // Dispose of all geometries and materials
                mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            });
            member.carryMeshes = [];
        }
    }

    /**
     * Check if agent is carrying anything
     */
    static isCarrying(member) {
        return member.inventory && member.inventory.slots.size > 0;
    }

    /**
     * Get count of carried items
     */
    static getCarriedCount(member) {
        if (!member.inventory) return 0;
        let total = 0;
        member.inventory.slots.forEach(slot => {
            total += slot.count;
        });
        return total;
    }

    /**
     * Create fishing spear visual
     */
    static createSpearMesh() {
        const group = new THREE.Group();

        // Shaft
        const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6);
        const shaftMat = new THREE.MeshStandardMaterial({
            color: 0x8b6914,
            roughness: 0.8
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.castShadow = true;
        group.add(shaft);

        // Spear tip
        const tipGeo = new THREE.ConeGeometry(0.05, 0.15, 6);
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.4,
            metalness: 0.6
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.y = 0.675;
        tip.castShadow = true;
        group.add(tip);

        group.userData.isSpear = true;
        return group;
    }

    /**
     * Attach spear to agent's hand
     */
    static attachSpear(member) {
        if (member.spearMesh) return; // Already has spear

        const spear = this.createSpearMesh();

        // Position spear in right hand
        spear.position.set(0.15, 0, 0.3);
        spear.rotation.z = -Math.PI / 6;
        spear.rotation.x = Math.PI / 4;

        member.mesh.add(spear);
        member.spearMesh = spear;
    }

    /**
     * Remove spear from agent
     */
    static removeSpear(member) {
        if (member.spearMesh) {
            member.mesh.remove(member.spearMesh);
            member.spearMesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            member.spearMesh = null;
        }
    }
}
