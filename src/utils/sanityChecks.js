// ============================================
// SANITY CHECKS & SELF-TESTING
// ============================================

import { CONFIG } from '../config.js';
import { getTerrainHeight } from './terrain.js';

let testLog = [];
let stats = {
    fps: 0,
    stepsPerSecond: 0,
    agentsAlive: 0,
    deaths: 0,
    coconutsAvailable: 0,
    errors: [],
    warnings: []
};

/**
 * Log a test result
 */
export function logTest(message, type = 'info') {
    const entry = { message, type, time: Date.now() };
    testLog.push(entry);
    
    // Keep log manageable
    if (testLog.length > 100) testLog.shift();
    
    // Console output
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[SanityCheck] ${prefix} ${message}`);
    
    // Update DOM
    updateTestLogDOM();
}

/**
 * Update the debug overlay in DOM
 */
function updateTestLogDOM() {
    const logEl = document.getElementById('test-log');
    if (!logEl) return;
    
    const recent = testLog.slice(-15);
    logEl.innerHTML = '<h3>🧪 Self-Tests</h3>' + recent.map(entry => {
        const cls = entry.type === 'error' ? 'error' : entry.type === 'warning' ? 'warning' : entry.type === 'success' ? 'success' : '';
        return `<div class="${cls}">${entry.message}</div>`;
    }).join('');
}

/**
 * Update stats display
 */
export function updateStats(data) {
    Object.assign(stats, data);
    
    // Update DOM elements
    const elements = {
        'stat-fps': `${stats.fps.toFixed(0)}`,
        'stat-steps': `${stats.stepsPerSecond.toFixed(0)}`,
        'stat-agents': `${stats.agentsAlive}`,
        'stat-deaths': `${stats.deaths}`,
        'stat-time': getTimeOfDayName(CONFIG.timeOfDay),
        'stat-coconuts': `${stats.coconutsAvailable}`
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

function getTimeOfDayName(t) {
    if (t < 0.15) return '🌅 Sunrise';
    if (t < 0.35) return '🌤️ Morning';
    if (t < 0.65) return '☀️ Midday';
    if (t < 0.85) return '🌇 Afternoon';
    return '🌅 Sunset';
}

/**
 * Check if an object is properly grounded on terrain
 */
export function checkGrounded(object, name, baseOffsetY = 0) {
    if (!object || !object.position) return true;
    
    const terrainHeight = getTerrainHeight(object.position.x, object.position.z);
    const objectY = object.position.y - baseOffsetY;
    const diff = objectY - terrainHeight;
    
    if (diff > CONFIG.floatingThreshold) {
        logTest(`${name} is floating ${diff.toFixed(2)}m above terrain`, 'warning');
        return false;
    }
    
    if (diff < -CONFIG.sinkingThreshold) {
        logTest(`${name} is sunk ${Math.abs(diff).toFixed(2)}m into terrain`, 'warning');
        return false;
    }
    
    return true;
}

/**
 * Check agent state validity
 */
export function checkAgentState(agent) {
    let valid = true;
    
    // Check for NaN/Infinity
    if (!Number.isFinite(agent.hunger)) {
        logTest(`Agent ${agent.id} has invalid hunger: ${agent.hunger}`, 'error');
        agent.hunger = 0.5;
        valid = false;
    }
    
    if (!Number.isFinite(agent.energy)) {
        logTest(`Agent ${agent.id} has invalid energy: ${agent.energy}`, 'error');
        agent.energy = 0.5;
        valid = false;
    }
    
    // Check bounds
    if (agent.hunger < 0 || agent.hunger > 1) {
        logTest(`Agent ${agent.id} hunger out of bounds: ${agent.hunger.toFixed(2)}`, 'warning');
        agent.hunger = Math.max(0, Math.min(1, agent.hunger));
    }
    
    if (agent.energy < 0 || agent.energy > 1) {
        logTest(`Agent ${agent.id} energy out of bounds: ${agent.energy.toFixed(2)}`, 'warning');
        agent.energy = Math.max(0, Math.min(1, agent.energy));
    }
    
    // Check position
    const pos = agent.mesh?.position;
    if (pos && (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z))) {
        logTest(`Agent ${agent.id} has invalid position`, 'error');
        valid = false;
    }
    
    return valid;
}

/**
 * Run comprehensive sanity checks
 */
export function runSanityChecks(scene, agents, trees) {
    logTest('Running sanity checks...', 'info');
    let passed = 0;
    let failed = 0;
    
    // Check trees are grounded
    trees.forEach((treeData, i) => {
        if (treeData.mesh) {
            const name = `Tree ${i} (${treeData.mesh.userData.treeType || 'unknown'})`;
            if (checkGrounded(treeData.mesh, name, -0.8)) {
                passed++;
            } else {
                failed++;
            }
        }
    });
    
    // Check agents are grounded
    agents.forEach(agent => {
        if (agent.alive && agent.mesh) {
            if (checkGrounded(agent.mesh, `Agent ${agent.id}`, 0)) {
                passed++;
            } else {
                failed++;
            }
            
            // Check state
            if (checkAgentState(agent)) {
                passed++;
            } else {
                failed++;
            }
        }
    });
    
    // Check rocks
    scene.traverse(obj => {
        if (obj.userData?.isRock) {
            const scale = obj.scale.x;
            if (checkGrounded(obj, 'Rock', -scale * 0.4)) {
                passed++;
            } else {
                failed++;
            }
        }
    });
    
    // Summary
    if (failed === 0) {
        logTest(`All ${passed} checks passed!`, 'success');
    } else {
        logTest(`${failed} of ${passed + failed} checks failed`, 'error');
    }
    
    return { passed, failed };
}

/**
 * Run simulation speed test
 */
export function runSpeedTest(stepFunction, speeds = [1, 10, 20, 50]) {
    logTest(`Speed test starting: ${speeds.join('x, ')}x`, 'info');
    
    const results = {};
    
    speeds.forEach(speed => {
        const iterations = Math.min(speed * 10, 200);
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            stepFunction(1 / 20); // Fixed timestep
        }
        
        const elapsed = performance.now() - startTime;
        const stepsPerSecond = (iterations / elapsed) * 1000;
        results[`${speed}x`] = stepsPerSecond;
        
        logTest(`${speed}x: ${stepsPerSecond.toFixed(0)} steps/s (${iterations} iters in ${elapsed.toFixed(0)}ms)`, 
            stepsPerSecond >= speed * 20 ? 'success' : 'warning');
    });
    
    return results;
}

/**
 * Get test log
 */
export function getTestLog() {
    return [...testLog];
}

/**
 * Clear test log
 */
export function clearTestLog() {
    testLog = [];
    updateTestLogDOM();
}

