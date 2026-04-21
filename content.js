// Injected into soundcloud.com — adds a native-looking "Download" button
// into .sc-button-group.sc-button-group-medium, before the "More" button.

const BUTTON_ID = 'gopeed-dl-btn';

// Override only color — everything else comes from SoundCloud's own sc-button styles
const CSS = `
#${BUTTON_ID} {
  color: #ff5500 !important;
  border-color: #ff5500 !important;
}
#${BUTTON_ID}:hover {
  background-color: #ff5500 !important;
  color: #fff !important;
  border-color: #ff5500 !important;
}
#${BUTTON_ID}.gpd-loading {
  opacity: 0.55;
  pointer-events: none;
}
#${BUTTON_ID}.gpd-success {
  color: #2ecc71 !important;
  border-color: #2ecc71 !important;
}
#${BUTTON_ID}.gpd-error {
  color: #e74c3c !important;
  border-color: #e74c3c !important;
}
`;

function injectStyles() {
  if (document.getElementById('gopeed-styles')) return;
  const style = document.createElement('style');
  style.id = 'gopeed-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

function createButton() {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  // Reuse SoundCloud's own button classes so size/shape/font match perfectly
  btn.className = 'sc-button sc-button-secondary sc-button-medium';
  btn.title = 'Download via Gopeed';
  btn.innerHTML = '<span class="sc-button-label">Download</span>';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const url = getCleanUrl();
    if (!url) return;

    setState('loading', 'Loading…');

    try {
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_TASK', url });

      if (response?.ok) {
        setState('success', '✓ Sent to Gopeed');
        setTimeout(resetState, 3000);
      } else {
        setState('error', '✗ Error');
        setTimeout(resetState, 3500);
        console.error('[Gopeed]', response?.error);
      }
    } catch (err) {
      setState('error', '✗ Error');
      setTimeout(resetState, 3500);
      console.error('[Gopeed]', err);
    }
  });

  function setState(cls, label) {
    btn.className = `sc-button sc-button-secondary sc-button-medium gpd-${cls}`;
    btn.querySelector('.sc-button-label').textContent = label;
  }

  function resetState() {
    btn.className = 'sc-button sc-button-secondary sc-button-medium';
    btn.querySelector('.sc-button-label').textContent = 'Download';
  }

  return btn;
}

function getCleanUrl() {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function isDownloadablePage() {
  const segments = location.pathname.split('/').filter(Boolean);
  return segments.length >= 2;
}

// ── Injection ─────────────────────────────────────────────────────────────────

function tryInjectButton() {
  if (!isDownloadablePage()) return;
  if (document.getElementById(BUTTON_ID)) return;

  // The exact group the user identified
  const group = document.querySelector('.sc-button-group.sc-button-group-medium');
  if (!group) return;

  injectStyles();

  const btn = createButton();

  // Insert before the "More" button if present, otherwise append
  const moreBtn = group.querySelector('.sc-button-more');
  if (moreBtn) {
    group.insertBefore(btn, moreBtn);
  } else {
    group.appendChild(btn);
  }
}

// ── SPA navigation watcher ────────────────────────────────────────────────────

let lastUrl = location.href;

const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Wait for React to render the new page
    setTimeout(tryInjectButton, 800);
  }

  if (!document.getElementById(BUTTON_ID)) {
    tryInjectButton();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

setTimeout(tryInjectButton, 1000);
