// Distraction Alert Content Script
// Handles showing distraction popups when injected by background script

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'showDistractionAlert':
      showDistractionAlert(message.domain);
      sendResponse({ success: true });
      break;
    
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

// Function to show distraction alert (fallback method when injection fails)
function showDistractionAlert(domain) {
  console.log('Content script: showDistractionAlert called for domain:', domain);
  
  // Check if overlay already exists
  if (document.getElementById('study-focus-overlay')) {
    console.log('Overlay already exists, skipping');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'study-focus-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'RainyHearts', Arial, sans-serif;
    ">
      <div style="
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="color: #333; margin-bottom: 15px;">⚠️ Distraction Alert</h2>
        <p style="color: #666; margin-bottom: 20px;">
          You've switched to <strong>${domain}</strong><br>
          Is this a work-related site?
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="study-focus-yes" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          ">Yes, it's work</button>
          <button id="study-focus-no" style="
            background: #f44336;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          ">No, go back</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listeners
  document.getElementById('study-focus-yes').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'addWorkDomain',
      domain: domain
    });
    overlay.remove();
  });

  document.getElementById('study-focus-no').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'goBack'
    });
    overlay.remove();
  });

  // Auto-remove after 15 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.remove();
    }
  }, 15000);
}

// Utility function to extract domain from current page
function getCurrentDomain() {
  return window.location.hostname;
}

console.log('Distraction Alert content script loaded on:', getCurrentDomain());