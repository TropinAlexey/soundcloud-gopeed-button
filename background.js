// Service worker — handles Gopeed REST API calls
//
// Flow:
//   1. POST /api/v1/resolve      → runs gopeed extensions, returns resolved files with proper names
//   2. POST /api/v1/tasks/batch  → one task per file, opts.name preserves the filename
//
// Gopeed answers API errors with HTTP 200 and `{code != 0, msg}` — always check `code`.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_TASK') {
    handleCreateTask(message.url).then((result) => {
      if (!result.ok) notifyError(result);
      sendResponse(result);
    });
    return true; // keep channel open for async response
  }
});

class GopeedError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

async function handleCreateTask(url) {
  try {
    const { gopeedPort, gopeedToken } = await chrome.storage.sync.get({
      gopeedPort: '9999',
      gopeedToken: '',
    });
    const api = createApi(gopeedPort, gopeedToken);

    // Step 1: resolve — triggers gopeed extensions, returns named files
    const resolved = await api('POST', '/resolve', { req: { url } });
    const files = resolved?.res?.files || [];

    // A resolve id means no extension handled the URL and Gopeed fell back to plain HTTP —
    // the "file" would be the SoundCloud HTML page, so don't download it.
    if (resolved?.id || files.length === 0 || files.some((f) => !f.req?.url)) {
      throw new GopeedError(
        'no-extension',
        'The SoundCloud extension in Gopeed did not handle this link. Install or update it in ' +
          'Gopeed → Extensions (https://github.com/TropinAlexey/gopeed-extension-soundcloud) and check its logs.'
      );
    }

    // Playlists go into a subfolder named after the playlist, like Gopeed's own UI does
    let path;
    if (files.length > 1 && resolved.res.name) {
      const config = await api('GET', '/config').catch(() => null);
      const folder = sanitize(resolved.res.name);
      if (config?.downloadDir && folder) path = `${config.downloadDir}/${folder}`;
    }

    // Step 2: create all tasks in one request
    await api('POST', '/tasks/batch', {
      reqs: files.map((file) => ({ req: file.req, opts: { name: file.name, ...(path && { path }) } })),
    });

    return { ok: true, count: files.length };
  } catch (err) {
    if (err instanceof GopeedError) return { ok: false, kind: err.kind, error: err.message };
    return { ok: false, kind: 'error', error: err.message };
  }
}

function createApi(port, token) {
  const base = `http://localhost:${port}/api/v1`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Api-Token'] = token;

  return async (method, path, body) => {
    let res;
    try {
      res = await fetch(`${base}${path}`, { method, headers, body: body && JSON.stringify(body) });
    } catch {
      // fetch only throws on network failure — nothing is listening on the port
      throw new GopeedError(
        'offline',
        `Gopeed is not running (nothing on localhost:${port}). Start Gopeed and try again — ` +
          'if it is running, check the API port in Gopeed → Settings → Advanced → API.'
      );
    }
    if (res.status === 401) {
      throw new GopeedError('auth', 'Gopeed rejected the API token. Set the same token as in Gopeed → Settings → API.');
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.code !== 0) {
      throw new GopeedError('error', `Gopeed ${path} failed: ${json?.msg || `HTTP ${res.status}`}`);
    }
    return json.data;
  };
}

// The playlist title is user-controlled on SoundCloud — it must stay a single path segment
// inside downloadDir: no separators, control chars, or a leading dot ("..", ".hidden").
function sanitize(name) {
  return name
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, '-')
    .trim()
    .replace(/^\.+/, '')
    .trim();
}

const NOTIFICATION_TITLES = {
  offline: 'Gopeed is not running',
  auth: 'Gopeed API token rejected',
  'no-extension': 'SoundCloud extension not working',
  error: 'Could not send to Gopeed',
};

function notifyError({ kind, error }) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: NOTIFICATION_TITLES[kind] || NOTIFICATION_TITLES.error,
    message: error || 'Unknown error',
  });
}
