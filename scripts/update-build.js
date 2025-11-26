#!/usr/bin/env node
// Auto-update build number based on git commit count
// This script never fails the build - it always continues even on errors

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This function will never throw - it always returns a valid build number
function getBuildNumber() {
    const configPath = resolve(__dirname, '../src/config.js');
    
    // First, try to read existing build number
    let existingBuildNumber = null;
    try {
        if (existsSync(configPath)) {
            const configContent = readFileSync(configPath, 'utf8');
            const match = configContent.match(/export const BUILD_NUMBER = (\d+);/);
            if (match) {
                existingBuildNumber = parseInt(match[1]);
            }
        }
    } catch (e) {
        // Ignore read errors
    }
    
    // Try to get git commit count
    try {
        const buildNumber = execSync('git rev-list --count HEAD', { 
            encoding: 'utf8',
            cwd: resolve(__dirname, '..'),
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        
        if (buildNumber && !isNaN(parseInt(buildNumber))) {
            return buildNumber;
        }
    } catch (gitError) {
        // Git not available - use increment or fallback
    }
    
    // If git failed, increment existing or use timestamp-based fallback
    if (existingBuildNumber !== null) {
        return String(existingBuildNumber + 1);
    }
    
    // Last resort: use timestamp-based number (will be unique per build)
    return String(Math.floor(Date.now() / 1000) % 100000);
}

// Main execution - wrapped to never fail
try {
    const buildNumber = getBuildNumber();
    const configPath = resolve(__dirname, '../src/config.js');
    
    try {
        let configContent = readFileSync(configPath, 'utf8');
        configContent = configContent.replace(
            /export const BUILD_NUMBER = \d+;/,
            `export const BUILD_NUMBER = ${buildNumber};`
        );
        writeFileSync(configPath, configContent, 'utf8');
        console.log(`✅ Updated BUILD_NUMBER to ${buildNumber}`);
    } catch (writeError) {
        console.log(`⚠️ Could not update BUILD_NUMBER, using existing value: ${writeError.message}`);
    }
} catch (error) {
    // This should never happen, but just in case
    console.log(`⚠️ Build number script encountered error, continuing anyway: ${error.message}`);
}

// Always exit successfully - never fail the build
process.exit(0);

