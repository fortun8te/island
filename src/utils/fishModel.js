// ============================================
// FISH MODEL - Low Poly with Good Texture
// ============================================

import * as THREE from 'three';

/**
 * Create a procedural fish texture
 */
function createFishTexture(color, variant = 0) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base color gradient (body)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    
    // Different color schemes for variety
    if (variant === 0) {
        // Tropical blue/yellow
        gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`);
        gradient.addColorStop(0.5, `rgba(${Math.min(255, color.r * 255 + 30)}, ${Math.min(255, color.g * 255 + 30)}, ${Math.min(255, color.b * 255 + 30)}, 1)`);
        gradient.addColorStop(1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.8)`);
    } else if (variant === 1) {
        // Striped pattern
        gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`);
        gradient.addColorStop(0.3, `rgba(${Math.max(0, color.r * 255 - 40)}, ${Math.max(0, color.g * 255 - 40)}, ${Math.max(0, color.b * 255 - 40)}, 1)`);
        gradient.addColorStop(0.6, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`);
        gradient.addColorStop(1, `rgba(${Math.max(0, color.r * 255 - 20)}, ${Math.max(0, color.g * 255 - 20)}, ${Math.max(0, color.b * 255 - 20)}, 0.8)`);
    } else {
        // Spotted pattern
        gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`);
        gradient.addColorStop(1, `rgba(${Math.min(255, color.r * 255 + 20)}, ${Math.min(255, color.g * 255 + 20)}, ${Math.min(255, color.b * 255 + 20)}, 0.9)`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Add scales pattern
    ctx.strokeStyle = `rgba(${Math.max(0, color.r * 255 - 30)}, ${Math.max(0, color.g * 255 - 30)}, ${Math.max(0, color.b * 255 - 30)}, 0.3)`;
    ctx.lineWidth = 1;
    
    for (let y = 20; y < size; y += 25) {
        for (let x = 20; x < size; x += 30) {
            ctx.beginPath();
            ctx.arc(x + (y % 2 === 0 ? 0 : 15), y, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Add highlight/shine (fish scale effect)
    const highlightGradient = ctx.createRadialGradient(size * 0.3, size * 0.3, 0, size * 0.3, size * 0.3, size * 0.4);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(0, 0, size, size);

    // Add darker dorsal line
    ctx.fillStyle = `rgba(${Math.max(0, color.r * 255 - 50)}, ${Math.max(0, color.g * 255 - 50)}, ${Math.max(0, color.b * 255 - 50)}, 0.6)`;
    ctx.fillRect(0, size * 0.1, size, size * 0.08);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

/**
 * Create a low-poly fish model with good texture
 */
export function createFishModel(baseColor, variant = 0) {
    const group = new THREE.Group();
    
    // Convert hex color to RGB
    const color = new THREE.Color(baseColor);
    
    // Create textured material
    const texture = createFishTexture(color, variant);
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0.1,
        transparent: false,
        side: THREE.DoubleSide
    });

    // ============================================
    // FISH BODY (main fuselage)
    // ============================================
    // Use a capsule-like shape - elongated ellipsoid
    const bodyGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    
    // Stretch into fish body shape
    const bodyPositions = bodyGeometry.attributes.position.array;
    for (let i = 0; i < bodyPositions.length; i += 3) {
        // Stretch along X axis (fish length)
        bodyPositions[i] *= 2.5; // length
        // Slightly flatten Y (height)
        bodyPositions[i + 1] *= 0.7;
        // Keep Z (width) normal
        bodyPositions[i + 2] *= 0.9;
    }
    bodyGeometry.attributes.position.needsUpdate = true;
    bodyGeometry.computeVertexNormals();
    
    const body = new THREE.Mesh(bodyGeometry, material);
    body.position.x = 0;
    group.add(body);

    // ============================================
    // TAIL FIN
    // ============================================
    const tailGeometry = new THREE.ConeGeometry(0.12, 0.3, 6);
    tailGeometry.rotateZ(-Math.PI / 2);
    
    // Flatten the tail
    const tailPositions = tailGeometry.attributes.position.array;
    for (let i = 0; i < tailPositions.length; i += 3) {
        tailPositions[i + 1] *= 0.3; // flatten vertically
    }
    tailGeometry.attributes.position.needsUpdate = true;
    tailGeometry.computeVertexNormals();
    
    const tail = new THREE.Mesh(tailGeometry, material);
    tail.position.x = -0.4;
    group.add(tail);

    // ============================================
    // DORSAL FIN (top fin)
    // ============================================
    const dorsalGeometry = new THREE.ConeGeometry(0.06, 0.25, 4);
    dorsalGeometry.rotateX(Math.PI / 2);
    const dorsal = new THREE.Mesh(dorsalGeometry, material);
    dorsal.position.set(0, 0.2, 0);
    group.add(dorsal);

    // ============================================
    // PECTORAL FINS (side fins)
    // ============================================
    const finGeometry = new THREE.ConeGeometry(0.04, 0.15, 4);
    finGeometry.rotateZ(Math.PI / 2);
    
    // Left pectoral fin
    const leftFin = new THREE.Mesh(finGeometry, material);
    leftFin.position.set(0.2, 0.1, 0.15);
    leftFin.rotation.z = -Math.PI / 4;
    group.add(leftFin);
    
    // Right pectoral fin
    const rightFin = new THREE.Mesh(finGeometry, material);
    rightFin.position.set(0.2, 0.1, -0.15);
    rightFin.rotation.z = Math.PI / 4;
    group.add(rightFin);

    // ============================================
    // PELVIC FINS (bottom fins)
    // ============================================
    const pelvicGeometry = new THREE.ConeGeometry(0.035, 0.12, 4);
    pelvicGeometry.rotateZ(Math.PI / 2);
    
    const leftPelvic = new THREE.Mesh(pelvicGeometry, material);
    leftPelvic.position.set(0.1, -0.1, 0.12);
    leftPelvic.rotation.z = -Math.PI / 6;
    group.add(leftPelvic);
    
    const rightPelvic = new THREE.Mesh(pelvicGeometry, material);
    rightPelvic.position.set(0.1, -0.1, -0.12);
    rightPelvic.rotation.z = Math.PI / 6;
    group.add(rightPelvic);

    // ============================================
    // EYE
    // ============================================
    const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1
    });
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0.35, 0.05, 0.12);
    
    // Pupil
    const pupilGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.position.set(0.005, 0, 0);
    eye.add(pupil);
    
    group.add(eye);

    // Rotate so fish faces forward (+Z)
    group.rotation.y = Math.PI / 2;

    return group;
}

/**
 * Create fish with random variant
 */
export function createRandomFish(baseColor) {
    const variant = Math.floor(Math.random() * 3);
    return createFishModel(baseColor, variant);
}

