const grid  = document.getElementById('nav');
const panel = document.getElementById('panel');
const home  = document.getElementById('home_0');

function openPage(name) {
    // point iframe at an internal extension page
    panel.src = chrome.runtime.getURL(`pages/${name}.html`);
    // toggle visibility
    grid.style.display = 'none';
    panel.hidden = false;
    // remember view (optional)
    chrome.storage?.local.set({ currentView: name });
    location.hash = name;
}

function showHome() {
    panel.hidden = true;
    panel.src = 'about:blank';
    grid.style.display = 'flex';
    chrome.storage?.local.remove('currentView');
    location.hash = '';
}

grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    openPage(btn.dataset.view);
});

home.addEventListener('click', showHome);

// restore last view (or hash)
(async () => {
    const fromHash = location.hash?.replace('#', '');
    const stored   = (await chrome.storage?.local.get('currentView'))?.currentView;
    const name = fromHash || stored;
    if (name) openPage(name);
})();

// Looking up the google
const searchInput = document.getElementById('searchInput');
const searchBtn   = document.getElementById('searchBtn');

function openGoogleSearch() {
    const q = (searchInput?.value || '').trim();
    if (!q) return;
    const url = 'https://www.google.com/search?q=' + encodeURIComponent(q);

    // Prefer chrome.tabs for extensions:
    if (chrome?.tabs?.create) {
        chrome.tabs.create({ url });
    } else {
        // Fallback
        window.open(url, '_blank');
    }
}

// Click on the icon button
searchBtn?.addEventListener('click', openGoogleSearch);

// Press Enter inside the input
searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openGoogleSearch();
});

// Allow internal pages (like page4.html) to request closing the panel
window.addEventListener('message', (e) => {
    try {
        // only accept messages from our own extension pages
        const isExt = typeof e.origin === 'string' && e.origin.startsWith('chrome-extension://');
        if (!isExt) return;

        if (e.data && e.data.type === 'closePanel') {
            showHome(); // hides iframe, shows grid
        }
    } catch {}
});


