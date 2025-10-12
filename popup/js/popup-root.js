// Listener for messages from inside iframes or child pages to open URLs in the panel iframe
(function() {
  function openInPanel(url) {
    const panel = document.getElementById('panel');
    const nav = document.getElementById('nav');
    if (!panel) return;
    try {
      console.debug('[popup-root] openInPanel:', url);
      // resolve absolute URL so iframe uses a fully-qualified src
      const abs = new URL(url, location.href).href;
      panel.hidden = false;
      panel.src = abs;
      if (nav) nav.style.display = 'none';
    } catch (err) {
      console.debug('[popup-root] openInPanel fallback (invalid url):', url, err);
      // fallback — use raw url
      panel.hidden = false;
      panel.src = url;
      if (nav) nav.style.display = 'none';
    }
  }

  function handleMessage(e) {
    try {
      console.debug('[popup-root] received message:', e && e.data);
      const data = e.data || {};
      if (data && data.type === 'openPanel' && typeof data.url === 'string') {
        openInPanel(data.url);
      } else if (data && data.type === 'closePanel') {
        // allow frames to request closing the panel
        const panel = document.getElementById('panel');
        const nav = document.getElementById('nav');
        if (!panel) return;
        panel.hidden = true;
        panel.src = 'about:blank';
        if (nav) nav.style.display = 'flex';
      }
    } catch (err) {
      console.error('popup-root: failed to handle message', err);
    }
  }

  // Intercept clicks inside the nav grid so anchors load into the panel iframe instead
  function navClickHandler(e) {
    try { console.debug('[popup-root] nav click target:', e.target); } catch (err) {}
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;

    // Resolve absolute URL for decision-making
    let absHref;
    try {
      absHref = new URL(href, location.href);
    } catch (err) {
      return; // malformed href, let default behavior occur
    }

    // If this is an internal extension page (same origin and an .html file), open into panel
    const isSameOrigin = absHref.origin === location.origin;
    const isHtml = absHref.pathname.endsWith('.html');
    if (isSameOrigin && isHtml) {
      e.preventDefault();
      e.stopImmediatePropagation();
      console.debug('[popup-root] intercepting nav click, opening in panel:', absHref.href);
      openInPanel(absHref.href);
    }
  }

  // When an internal page loads in the panel, attach a click handler inside the iframe
  // (only works for same-origin extension pages). This lets "Back" links close the panel.
  function onPanelLoad() {
    const panel = document.getElementById('panel');
    if (!panel) return;
    try {
      console.debug('[popup-root] panel loaded:', panel.src);
      const cw = panel.contentWindow;
      const cd = cw && cw.document;
      if (!cd) return;
      // Inject CSS to make the loaded page fill the iframe and remove default margins
      try {
        const STYLE_ID = 'popup-panel-reset-styles';
        if (cd.head && !cd.getElementById(STYLE_ID)) {
          const style = cd.createElement('style');
          style.id = STYLE_ID;
          style.textContent = `
            /* Reset to make page fit inside the popup iframe */
            html, body { height: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
            *, *:before, *:after { box-sizing: inherit !important; }
            body { overflow: auto !important; -webkit-overflow-scrolling: touch !important; }
            /* Make common container classes fill available space */
            .container, .page-content, main, .screen { height: 100% !important; width: 100% !important; }
            /* Images and iframes inside content should not overflow */
            img, iframe, video { max-width: 100% !important; height: auto !important; }
          `;
          cd.head.appendChild(style);
        }
      } catch (e) {
        // ignore injection failures (cross-origin or no head)
      }

      // Attach delegated click listener for 'Back' / return links inside iframe pages
      // This only works for same-origin pages (we're inside try/catch already)
      cd.addEventListener('click', function(ev) {
        const a = ev.target.closest && ev.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        // If the link points back to the popup root, intercept and close panel
        if (href.includes('popup.html') || href === '../popup.html' || href === 'popup.html') {
          ev.preventDefault();
          panel.hidden = true;
          panel.src = 'about:blank';
          const navEl = document.getElementById('nav');
          if (navEl) navEl.style.display = 'flex';
        }
      }, true);
    } catch (err) {
      // cross-origin or access denied — ignore
    }
  }

  function attachHandlers() {
    const nav = document.getElementById('nav');
  if (nav) nav.addEventListener('click', navClickHandler, true);

    const panel = document.getElementById('panel');
    if (panel) panel.addEventListener('load', onPanelLoad);
    // Home button element (image behind frame)
    const home = document.getElementById('home_0');
    if (home) {
      home.addEventListener('click', () => {
        try {
          const panelEl = document.getElementById('panel');
          const navEl = document.getElementById('nav');
          if (panelEl) {
            panelEl.hidden = true;
            panelEl.src = 'about:blank';
          }
          if (navEl) navEl.style.display = 'flex';
        } catch (err) { console.error('popup-root: home click failed', err); }
      });
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    function performGoogleSearch() {
      const query = searchInput?.value?.trim();
      if (query) {
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        chrome.tabs.create({ url: googleSearchUrl });
      }
    }
    
    // Search button click
    if (searchBtn) {
      searchBtn.addEventListener('click', performGoogleSearch);
    }
    
    // Enter key on search input
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performGoogleSearch();
        }
      });
    }

    // Home key (keyboard) - also close the panel and show nav
    document.addEventListener('keydown', (e) => {
      // Use 'Home' key as requested — Windows/Chromium uses key === 'Home'
      if (e.key === 'Home') {
        const panelEl = document.getElementById('panel');
        const navEl = document.getElementById('nav');
        if (panelEl) {
          panelEl.hidden = true;
          panelEl.src = 'about:blank';
        }
        if (navEl) navEl.style.display = 'flex';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachHandlers);
  } else {
    // DOM already ready — attach immediately
    attachHandlers();
  }

  window.addEventListener('message', handleMessage);
})();
