// Minimal service worker for debugging tab creation
console.log('🔧 Minimal service worker starting up...');

// Set up message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📥 Minimal service worker received message:', request);
  
  if (request.action === 'OPEN_SESSION_COMPLETE_TAB') {
    console.log('🚀 OPEN_SESSION_COMPLETE_TAB received in minimal service worker');
    console.log('📋 Request details:', {
      phase: request.phase,
      message: request.message,
      title: request.title
    });
    
    const url = chrome.runtime.getURL('timer-complete.html') + 
                `?phase=${request.phase}&message=${encodeURIComponent(request.message)}`;
    
    console.log('🔗 Attempting to create tab with URL:', url);
    
    chrome.tabs.create({ url: url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to create tab:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('✅ Successfully created session complete tab:', tab.id);
        sendResponse({ success: true, tabId: tab.id });
      }
    });
    
    return true;
  }
  
  // Handle other messages silently to reduce noise
  if (request.action === 'STOP_ICON_ANIMATION' || 
      request.action === 'SESSION_STARTED' || 
      request.action === 'SESSION_ENDED') {
    console.log('📝 Handled message:', request.action);
    sendResponse({ success: true });
    return true;
  }
  
  // Handle other simple messages without StudyFocusManager for now
  console.log('❓ Unhandled message action:', request.action);
  sendResponse({ success: false, error: 'Action not implemented in minimal worker' });
});

console.log('✅ Minimal service worker setup complete!');