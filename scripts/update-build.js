#!/usr/bin/env node
// Auto-update build number based on git commit count

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
    let buildNumber;
    
    // Try to get git commit count (works locally)
    try {
        buildNumber = execSync('git rev-list --count HEAD', { 
            encoding: 'utf8',
            cwd: resolve(__dirname, '..')
        }).trim();
    } catch (gitError) {
        // If git fails (e.g., on Vercel), try to read from existing config
        const configPath = resolve(__dirname, '../src/config.js');
        const configContent = readFileSync(configPath, 'utf8');
        const match = configContent.match(/export const BUILD_NUMBER = (\d+);/);
        
        if (match) {
            // Increment existing build number
            buildNumber = String(parseInt(match[1]) + 1);
            console.log(`⚠️ Git not available, incrementing from existing: ${buildNumber}`);
        } else {
            // Fallback to 1
            buildNumber = '1';
            console.log(`⚠️ Git not available, using fallback: ${buildNumber}`);
        }
    }
    
    // Read config file
    const configPath = resolve(__dirname, '../src/config.js');
    let configContent = readFileSync(configPath, 'utf8');
    
    // Update BUILD_NUMBER
    configContent = configContent.replace(
        /export const BUILD_NUMBER = \d+;/,
        `export const BUILD_NUMBER = ${buildNumber};`
    );
    
    // Write back
    writeFileSync(configPath, configContent, 'utf8');
    
    console.log(`✅ Updated BUILD_NUMBER to ${buildNumber}`);
} catch (error) {
    console.error('❌ Failed to update build number:', error.message);
    // Don't exit on error - let build continue with existing number
    console.log('⚠️ Continuing build with existing BUILD_NUMBER');
}

