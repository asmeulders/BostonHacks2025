// BARE BONES TESTING INTERFACE

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Testing interface loaded');
  await loadTestInterface();
  setupTestListeners();
});

async function loadTestInterface() {
  // Show current tab
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (currentTab && currentTab.url) {
    const domain = extractDomain(currentTab.url);
    document.getElementById('currentTab').innerHTML = `<strong>${domain}</strong>`;
    document.getElementById('addCurrentDomain').setAttribute('data-domain', domain);
  }

  // Show work domains
  const response = await chrome.runtime.sendMessage({ action: 'getWorkDomains' });
  if (response && response.domains) {
    const domainsHtml = response.domains.length === 0 ? 
      '<em>None yet</em>' : 
      response.domains.map(domain => `
        <div>${domain} <button onclick="removeDomain('${domain}')">X</button></div>
      `).join('');
    document.getElementById('workDomains').innerHTML = domainsHtml;
  }
}

function setupTestListeners() {
  // Add current domain
  document.getElementById('addCurrentDomain').addEventListener('click', async () => {
    const domain = document.getElementById('addCurrentDomain').getAttribute('data-domain');
    await addDomain(domain);
    showMessage(`Added: ${domain}`);
    await loadTestInterface();
  });

  // Manual add
  document.getElementById('manualAdd').addEventListener('click', async () => {
    const domain = document.getElementById('domainInput').value.trim();
    if (domain) {
      await addDomain(domain);
      document.getElementById('domainInput').value = '';
      showMessage(`Added: ${domain}`);
      await loadTestInterface();
    }
  });

  // Test trigger (force show popup on current tab)
  document.getElementById('testTrigger').addEventListener('click', async () => {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab) {
      const domain = extractDomain(currentTab.url);
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: showTestPopup,
        args: [domain]
      });
      showMessage('Test popup triggered!');
    }
  });

  // Clear all
  document.getElementById('clearAll').addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getWorkDomains' });
    if (response && response.domains) {
      for (const domain of response.domains) {
        await chrome.runtime.sendMessage({ action: 'removeWorkDomain', domain });
      }
    }
    showMessage('Cleared all domains');
    await loadTestInterface();
  });
}

// Test popup function
function showTestPopup(domain) {
  if (document.getElementById('study-focus-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'study-focus-overlay';
  overlay.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.8); z-index: 999999; display: flex; justify-content: center; align-items: center; font-family: Arial, sans-serif;">
      <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; text-align: center;">
        <h2>⚠️ TEST POPUP</h2>
        <p>Domain: <strong>${domain}</strong><br>Is this work-related?</p>
        <button id="study-focus-yes" style="background: green; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px;">YES - Add as Work</button>
        <button id="study-focus-no" style="background: red; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px;">NO - Go Back</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('study-focus-yes').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'addWorkDomain', domain });
    overlay.remove();
  });

  document.getElementById('study-focus-no').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'goBack' });
    overlay.remove();
  });

  setTimeout(() => overlay.remove(), 8000);
}

async function addDomain(domain) {
  await chrome.runtime.sendMessage({ action: 'addWorkDomain', domain });
}

async function removeDomain(domain) {
  await chrome.runtime.sendMessage({ action: 'removeWorkDomain', domain });
  await loadTestInterface();
  showMessage(`Removed: ${domain}`);
}

function showMessage(text) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.style.background = '#e7f5e7';
  msg.style.padding = '5px';
  msg.style.margin = '5px 0';
  setTimeout(() => msg.textContent = '', 2000);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}