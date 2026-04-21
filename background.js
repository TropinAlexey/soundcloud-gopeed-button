// Service worker — handles Gopeed REST API calls
//
// Flow:
//   1. POST /api/v1/resolve  → runs gopeed extensions, returns resolved files with proper names
//   2. POST /api/v1/tasks    → create task with req + opts.name to preserve filename

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_TASK') {
    handleCreateTask(message.url).then(sendResponse);
    return true; // keep channel open for async response
  }
});

async function handleCreateTask(url) {
  try {
    const { gopeedPort, gopeedToken } = await chrome.storage.sync.get({
      gopeedPort: '9999',
      gopeedToken: '',
    });

    const base = `http://localhost:${gopeedPort}/api/v1`;
    const headers = { 'Content-Type': 'application/json' };
    if (gopeedToken) headers['X-Api-Token'] = gopeedToken;

    // Step 1: resolve — triggers gopeed extensions, returns named files
    const resolveRes = await fetch(`${base}/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ req: { url } }),
    });

    if (!resolveRes.ok) {
      const text = await resolveRes.text().catch(() => '');
      return { ok: false, error: `Resolve failed HTTP ${resolveRes.status}: ${text}` };
    }

    const resolveData = await resolveRes.json();
    const rid = resolveData?.data?.id;
    const res = resolveData?.data?.res;

    if (rid) {
      // Normal case: create from resolve id (preserves all metadata)
      const createRes = await fetch(`${base}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rid }),
      });
      if (!createRes.ok) {
        const text = await createRes.text().catch(() => '');
        return { ok: false, error: `Create task failed HTTP ${createRes.status}: ${text}` };
      }
      return { ok: true };
    }

    if (!res?.files?.length) {
      return { ok: false, error: `No files in resolve response: ${JSON.stringify(resolveData)}` };
    }

    if (res.files.length === 1) {
      // Single track — pass opts.name so Gopeed uses our filename instead of the CDN one
      const file = res.files[0];
      const createRes = await fetch(`${base}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          req: file.req,
          opts: { name: file.name },
        }),
      });
      if (!createRes.ok) {
        const text = await createRes.text().catch(() => '');
        return { ok: false, error: `Create task failed HTTP ${createRes.status}: ${text}` };
      }
      return { ok: true };
    }

    // Playlist — create tasks one by one to preserve individual filenames
    for (const file of res.files) {
      const createRes = await fetch(`${base}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          req: file.req,
          opts: { name: file.name },
        }),
      });
      if (!createRes.ok) {
        console.warn(`[Gopeed] Failed to create task for ${file.name}`);
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
