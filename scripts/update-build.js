#!/usr/bin/env node
// Auto-update build number based on git commit count

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

try {
    // Get git commit count
    const buildNumber = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    
    // Read config file
    const configPath = './src/config.js';
    let configContent = readFileSync(configPath, 'utf8');
    
    // Update BUILD_NUMBER
    configContent = configContent.replace(
        /export const BUILD_NUMBER = \d+;/,
        `export const BUILD_NUMBER = ${buildNumber};`
    );
    
    // Write back
    writeFileSync(configPath, configContent);
    
    console.log(`✅ Updated BUILD_NUMBER to ${buildNumber}`);
} catch (error) {
    console.error('❌ Failed to update build number:', error.message);
    process.exit(1);
}

