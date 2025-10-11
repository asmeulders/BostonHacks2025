// Study Focus Assistant — Popup UI

/* ---------------- Element helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
const on = (sel, evt, fn) => { const el = $(sel); if (el) el.addEventListener(evt, fn); };

function formatHost(url) { try { return new URL(url).hostname; } catch { return url; } }
function showMessage(text) {
  const msg = $('#message');
  if (!msg) return;
  msg.textContent = text;
  msg.style.background = '#e7f5e7';
  msg.style.padding = '5px';
  msg.style.margin = '5px 0';
  setTimeout(() => (msg.textContent = ''), 1800);
}

/* ---------------- Background comms ---------------- */
async function sendMsg(payload) {
  try { return await chrome.runtime.sendMessage(payload); }
  catch (e) { console.warn('BG not reachable:', e); return null; }
}

async function getState() {
  try { return await sendMsg({ type: 'GET_STATE' }); }
  catch { return null; }
}

/* ---------------- Status rendering ---------------- */
function setStatus(text) {
  const el = $('#sessionStatus');
  if (el) el.textContent = text;
}

async function refreshStatus() {
  const s = await getState();
  if (!s) { setStatus('Background not ready'); return; }
  const txt = s.sessionActive ? (s.phase || 'FOCUS') : 'IDLE';
  setStatus(txt);
}

/* ---------------- Sliders (existing UI) ---------------- */
function initSliders() {
  const workSlider = $('#workRange');
  const workTime = $('#work-time');
  if (workSlider && workTime) {
    workTime.textContent = workSlider.value;
    workSlider.addEventListener('input', (e) => workTime.textContent = e.target.value);
  }

  const restSlider = $('#restRange');
  const restTime = $('#rest-time');
  if (restSlider && restTime) {
    restTime.textContent = restSlider.value;
    restSlider.addEventListener('input', (e) => restTime.textContent = e.target.value);
  }
}

/* ---------------- Current tab + domain list (existing UI) ---------------- */
async function loadCurrentTab() {
  const cur = $('#currentTab');
  if (!cur) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) cur.innerHTML = `<strong>${formatHost(tab.url)}</strong>`;
}

async function loadWorkDomains() {
  const box = $('#workDomains');
  if (!box) return;
  const res = await sendMsg({ action: 'getWorkDomains' });
  const domains = res?.domains || [];
  if (domains.length === 0) {
    box.innerHTML = '<em>None yet</em>';
    return;
  }
  box.innerHTML = domains.map(d =>
    `<div>${d} <button data-remove="${d}">X</button></div>`
  ).join('');
  box.querySelectorAll('button[data-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await sendMsg({ action: 'removeWorkDomain', domain: btn.getAttribute('data-remove') });
      await loadWorkDomains();
      showMessage('Removed');
    });
  });
}

/* ---------------- Mode & Intercept controls ---------------- */
async function initializeModeControls() {
  const modeEl = $('#modeSelect');
  const interceptEl = $('#interceptToggle');
  if (!modeEl || !interceptEl) return;

  // Load initial values from storage; default mode=normal, intercept=true
  try {
    const { mode, interceptEnabled } = await chrome.storage.local.get(['mode', 'interceptEnabled']);
    modeEl.value = mode ?? 'normal';
    interceptEl.checked = interceptEnabled !== false;
  } catch (e) {
    modeEl.value = 'normal';
    interceptEl.checked = true;
  }

  // When selecting Focused, background will set lockdown baseline (current tab's domain)
  modeEl.addEventListener('change', async (e) => {
    const newMode = e.target.value;
    const res = await sendMsg({ type: 'TOGGLE_MODE', mode: newMode });
    if (res?.success) showMessage(`Mode: ${newMode}`);
    await refreshStatus();
  });

  // Toggle intercept
  interceptEl.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    const res = await sendMsg({ type: 'SET_INTERCEPT', enabled });
    if (res?.success) showMessage(`Tab prompts ${enabled ? 'enabled' : 'disabled'}`);
  });
}

/* ---------------- Start / Stop buttons ---------------- */
function initSessionButtons() {
  on('#startSession', 'click', async () => {
    const res = await sendMsg({ type: 'START_SESSION' });
    if (res?.success) showMessage('Session started');
    await refreshStatus();
  });

  on('#stopSession', 'click', async () => {
    const res = await sendMsg({ type: 'STOP_SESSION' });
    if (res?.success) showMessage('Session stopped');
    await refreshStatus();
  });

  // Keep status in sync if background changes elsewhere
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.sessionActive || changes.phase) refreshStatus();
  });
}

/* ---------------- Existing quick actions ---------------- */
function initQuickActions() {
  on('#addCurrentDomain', 'click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    const domain = formatHost(tab.url);
    await sendMsg({ action: 'addWorkDomain', domain });
    await loadWorkDomains();
    showMessage(`Added: ${domain}`);
  });

  on('#manualAdd', 'click', async () => {
    const input = $('#domainInput');
    if (!input) return;
    const domain = input.value.trim();
    if (!domain) return;
    await sendMsg({ action: 'addWorkDomain', domain });
    input.value = '';
    await loadWorkDomains();
    showMessage(`Added: ${domain}`);
  });

  on('#testTrigger', 'click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    // Try messaging content script first (if present)
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'showDistractionAlert', domain: formatHost(tab.url) });
      showMessage('Test overlay triggered');
    } catch {
      // fallback: legacy injection if you still use it
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['distraction-alert/distraction-popup.js'] });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (d) => { if (typeof showDistractionAlert === 'function') showDistractionAlert(d); },
          args: [formatHost(tab.url)]
        });
        showMessage('Test popup triggered!');
      } catch (e) {
        showMessage('Failed to trigger test popup');
        console.warn(e);
      }
    }
  });

  on('#clearAll', 'click', async () => {
    const res = await sendMsg({ action: 'getWorkDomains' });
    const domains = res?.domains || [];
    for (const d of domains) await sendMsg({ action: 'removeWorkDomain', domain: d });
    await loadWorkDomains();
    showMessage('Cleared all domains');
  });
}

/* ---------------- Boot ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  initSliders();
  await loadCurrentTab();
  await loadWorkDomains();
  await initializeModeControls();
  initSessionButtons();
  await refreshStatus();
});
