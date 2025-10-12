// Setup script to configure Gemini API key
// Usage: node setup.js

const readline = require('readline');
const fs = require('fs');
const path = require('path');

async function setupApiKey() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('🔑 Study Focus Assistant Setup');
    console.log('Get your free Gemini API key from: https://makersuite.google.com/app/apikey\n');

    // Check if .env file exists and has API key
    const envPath = path.join(__dirname, '.env');
    let existingKey = '';
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.+)/);
        if (match && match[1]) {
            existingKey = match[1];
            console.log(`Found existing API key in .env: ${existingKey.substring(0, 10)}...`);
        }
    }

    const useExisting = existingKey && await new Promise(resolve => {
        rl.question('Use existing API key from .env? (y/n): ', answer => {
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });

    let apiKey;
    if (useExisting) {
        apiKey = existingKey;
    } else {
        apiKey = await new Promise(resolve => {
            rl.question('Enter your Gemini API key: ', resolve);
        });
    }

    if (apiKey.trim()) {
        // Update .env file
        const envContent = `GEMINI_API_KEY=${apiKey.trim()}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log('✅ API key saved to .env');

        // Clear config.json (no longer storing API key there)
        const configPath = path.join(__dirname, 'config.json');
        const config = {
            geminiApiKey: ""
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✅ config.json cleared (API key now in .env)');

        console.log('\n📋 Next steps:');
        console.log('1. Load your extension in Chrome (chrome://extensions/)');
        console.log('2. The extension will automatically load the API key from .env when running in development');
        console.log('3. For production, you\'ll need to configure the API key in the extension settings');
        console.log('📝 Note: The API key is now stored in .env and excluded from git for security.');
    } else {
        console.log('❌ No API key provided. Setup cancelled.');
    }

    rl.close();
}

setupApiKey().catch(console.error);