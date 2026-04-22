// Injected into soundcloud.com — adds a native-looking "Download" button
// into every .sc-button-group.sc-button-group-medium on the page.

const CSS = `
.gpd-btn {
  color: #ff5500 !important;
  border-color: #ff5500 !important;
}
.gpd-btn:hover {
  background-color: #ff5500 !important;
  color: #fff !important;
  border-color: #ff5500 !important;
}
.gpd-btn.gpd-loading {
  opacity: 0.55;
  pointer-events: none;
}
.gpd-btn.gpd-success {
  color: #2ecc71 !important;
  border-color: #2ecc71 !important;
}
.gpd-btn.gpd-error {
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

function createButton(trackUrl) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sc-button sc-button-secondary sc-button-medium gpd-btn';
  btn.title = 'Download via Gopeed';
  btn.innerHTML = '<span class="sc-button-label">Download</span>';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setState('loading', 'Loading…');

    try {
      const response = await chrome.runtime.sendMessage({ type: 'CREATE_TASK', url: trackUrl });

      if (response?.ok) {
        setState('success', '✓ Sent to Gopeed');
        setTimeout(resetState, 3000);
      } else {
        setState('error', '✗ Error');
        setTimeout(resetState, 3500);
        console.error('[Gopeed]', response?.error);
      }
    } catch (err) {
      if (err?.message?.includes('Extension context invalidated')) {
        setState('error', '↻ Refresh page');
      } else {
        setState('error', '✗ Error');
        console.error('[Gopeed]', err);
      }
      setTimeout(resetState, 4000);
    }
  });

  function setState(cls, label) {
    btn.className = `sc-button sc-button-secondary sc-button-medium gpd-btn gpd-${cls}`;
    btn.querySelector('.sc-button-label').textContent = label;
  }

  function resetState() {
    btn.className = 'sc-button sc-button-secondary sc-button-medium gpd-btn';
    btn.querySelector('.sc-button-label').textContent = 'Download';
  }

  return btn;
}

function getTrackUrlFromGroup(group) {
  // Walk up to the nearest track container and find its title link
  const container = group.closest(
    '.soundList__item, .trackItem, .sound__body, .streamContext, li'
  );
  if (container) {
    const link = container.querySelector(
      'a.soundTitle__title, a.trackItem__trackTitle, a[href][class*="title"]'
    );
    if (link && link.pathname.split('/').filter(Boolean).length >= 2) {
      return new URL(link.href).origin + link.pathname;
    }
  }
  // Fallback: current page URL (e.g. on a dedicated track page)
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

// ── Injection ─────────────────────────────────────────────────────────────────

function tryInjectButtons() {
  injectStyles();
  // :not([data-gopeed]) skips already-processed groups — no duplicate buttons
  const groups = document.querySelectorAll(
    '.sc-button-group.sc-button-group-medium:not([data-gopeed])'
  );
  for (const group of groups) {
    const trackUrl = getTrackUrlFromGroup(group);
    if (!trackUrl) continue;
    group.setAttribute('data-gopeed', '1');
    const btn = createButton(trackUrl);
    const moreBtn = group.querySelector('.sc-button-more');
    moreBtn ? group.insertBefore(btn, moreBtn) : group.appendChild(btn);
  }
}

// ── SPA navigation watcher ────────────────────────────────────────────────────

let lastUrl = location.href;

const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Wait for React to render the new page
    setTimeout(tryInjectButtons, 800);
  }
  tryInjectButtons();
});

observer.observe(document.body, { childList: true, subtree: true });

setTimeout(tryInjectButtons, 1000);
