// Distraction Alert Content Script
// Handles showing distraction popups when injected by background script

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔔 Content script received message:', message);
  
  switch (message.action) {
    case 'showDistractionAlert':
      console.log('🚨 Content script showing distraction alert for:', message.domain);
      showDistractionAlert(message.domain);
      sendResponse({ success: true });
      break;
    
    default:
      console.log('❓ Unknown action received:', message.action);
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
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999999;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'RainyHearts', Arial, sans-serif;
      backdrop-filter: blur(5px);
    ">
      <div style="
        background: #f7f3e9;
        padding: 40px;
        border-radius: 15px;
        max-width: 450px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        border: 3px solid #ff6b35;
      ">
        <div style="font-size: 60px; margin-bottom: 20px;">🚫</div>
        <h2 style="color: #2c5530; margin-bottom: 15px; font-size: 28px;">Focus Mode Active!</h2>
        <p style="color: #004e89; margin-bottom: 25px; font-size: 18px; line-height: 1.5;">
          You're trying to visit <strong style="color: #ff6b35;">${domain}</strong><br><br>
          This site isn't in your work domains list.<br>
          Is this related to your current study session?
        </p>
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
          <button id="study-focus-yes" style="
            background: #2c5530;
            color: white;
            border: 3px solid #2c5530;
            padding: 15px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            font-family: 'RainyHearts', Arial, sans-serif;
            font-weight: bold;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='#1a3a1f'" onmouseout="this.style.background='#2c5530'">
            ✅ Yes, it's for work
          </button>
          <button id="study-focus-no" style="
            background: #ff6b35;
            color: white;
            border: 3px solid #ff6b35;
            padding: 15px 25px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            font-family: 'RainyHearts', Arial, sans-serif;
            font-weight: bold;
            transition: all 0.3s ease;
          " onmouseover="this.style.background='#e55a2b'" onmouseout="this.style.background='#ff6b35'">
            🔙 Take me back
          </button>
        </div>
      </div>
    </div>
  `;

  // Block page interaction
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  
  // Prevent all clicks on the page except our overlay
  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // Block all page interactions
  document.addEventListener('click', blockInteraction, true);
  document.addEventListener('keydown', blockInteraction, true);
  document.addEventListener('scroll', blockInteraction, true);
  
  function blockInteraction(e) {
    if (!overlay.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  document.body.appendChild(overlay);

  // Add event listeners
  document.getElementById('study-focus-yes').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'addWorkDomain',
      domain: domain
    });
    // Restore page interaction
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.removeEventListener('click', blockInteraction, true);
    document.removeEventListener('keydown', blockInteraction, true);
    document.removeEventListener('scroll', blockInteraction, true);
    overlay.remove();
  });

  document.getElementById('study-focus-no').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'goBack'
    });
    // Don't restore page interaction since we're leaving
    overlay.remove();
  });

  // Show a countdown instead of auto-removal
  let countdown = 30;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      // Force go back after 30 seconds
      chrome.runtime.sendMessage({
        action: 'goBack'
      });
      overlay.remove();
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// Utility function to extract domain from current page
function getCurrentDomain() {
  return window.location.hostname;
}

console.log('🔧 Distraction Alert content script loaded on:', getCurrentDomain());
console.log('📱 Ready to receive distraction alerts!');