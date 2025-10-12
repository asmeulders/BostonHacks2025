// Build script to copy API key from .env to config.json
// Usage: node build.js

const fs = require('fs');
const path = require('path');

function buildExtension() {
    console.log('🔧 Building extension...');
    
    // Read .env file
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.log('⚠️  No .env file found. Using empty API key in config.json.');
        return;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);
    
    if (!match || !match[1]) {
        console.log('⚠️  No GEMINI_API_KEY found in .env file.');
        return;
    }
    
    const apiKey = match[1].trim();
    
    // Update config.json
    const configPath = path.join(__dirname, 'config.json');
    const config = {
        geminiApiKey: apiKey
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ API key copied from .env to config.json');
    console.log(`🔑 API key: ${apiKey.substring(0, 10)}...`);
}

buildExtension();