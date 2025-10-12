// Quick setup script for Gemini API key
// Run this in the browser console when the extension is loaded

(async function setupGeminiApiKey() {
    const apiKey = ""; // Your current API key
    
    try {
        // Store in Chrome storage
        await chrome.storage.local.set({ geminiApiKey: apiKey });
        console.log('✅ Gemini API key stored in Chrome storage successfully!');
        
        // Verify it's stored
        const result = await chrome.storage.local.get(['geminiApiKey']);
        console.log('🔍 Verification - API key in storage:', result.geminiApiKey ? 'Found' : 'Not found');
        
    } catch (error) {
        console.error('❌ Error setting up API key:', error);
    }
})();