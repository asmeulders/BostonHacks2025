// Development helper script to load API key from .env into Chrome extension storage
// Run this script when developing the extension locally

const fs = require('fs');
const path = require('path');

function loadEnvToExtension() {
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found. Please run "node setup.js" first.');
        return;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);
    
    if (!match || !match[1]) {
        console.error('❌ GEMINI_API_KEY not found in .env file.');
        return;
    }
    
    const apiKey = match[1].trim();
    
    console.log('🔑 API Key found in .env');
    console.log(`Key preview: ${apiKey.substring(0, 10)}...`);
    console.log('\n📋 To use this API key in your Chrome extension:');
    console.log('1. Load the extension in Chrome (chrome://extensions/)');
    console.log('2. Open the extension popup');
    console.log('3. Go to Settings');
    console.log('4. Enter the API key manually, or the extension will prompt you');
    console.log('\n💡 For development convenience, you can also:');
    console.log('- Temporarily add the key to Chrome storage via browser console');
    console.log('- Use the extension\'s settings page to configure it');
    
    // Create a helper script that can be run in browser console
    const helperScript = `
// Run this in the browser console on any page to set the API key in Chrome storage:
chrome.storage.local.set({ geminiApiKey: '${apiKey}' }).then(() => {
    console.log('✅ API key saved to Chrome storage');
});
    `.trim();
    
    console.log('\n🛠️  Browser Console Helper:');
    console.log('Copy and paste this into your browser console to set the API key:');
    console.log('---');
    console.log(helperScript);
    console.log('---');
}

if (require.main === module) {
    loadEnvToExtension();
}

module.exports = { loadEnvToExtension };