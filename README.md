# SoundCloud → Gopeed (Chrome Extension)

Adds a native **Download** button on SoundCloud track and playlist pages. One click sends the URL to [Gopeed](https://gopeed.com) for downloading.

## Requirements

1. [Gopeed](https://gopeed.com) installed and running, with its local API enabled (**Gopeed 2.0+ ships with the API off** — see below)
2. [gopeed-extension-soundcloud](https://github.com/TropinAlexey/gopeed-extension-soundcloud) installed inside Gopeed

### Gopeed 2.0+: enable the API

Since v2.0, desktop Gopeed no longer starts its local HTTP API by default, and settings from 1.x are not carried over on upgrade. The button talks to Gopeed only through this API, so without it every click fails with "Gopeed not running".

1. Open Gopeed → **Settings** → **API**.
2. Turn the API **on**. Keep the defaults: network `tcp`, address `127.0.0.1:9999`, empty token.
3. If you set a token or another port, enter the same values in this extension's popup.

Check: `curl http://127.0.0.1:9999/api/v1/info` should return JSON.

Most SoundCloud tracks are now HLS-only. They download only on Gopeed **v2.0.0-beta.3 or newer** with gopeed-extension-soundcloud **1.1.0+**.

## Installation

The extension is published to the Chrome Web Store. Install it manually:
[SoundCloud → Gopeed chrome extension](https://chromewebstore.google.com/detail/dibaaanimijeognedjonhifkigceppbh)

## How it works

The button appears in the action toolbar on every SoundCloud track or playlist page (next to Share, Copy Link, etc.).

When clicked:
1. The extension calls Gopeed's local API `POST localhost:9999/api/v1/resolve` — this triggers the `gopeed-extension-soundcloud` which resolves the SoundCloud URL into an actual audio stream
2. Then calls `POST localhost:9999/api/v1/tasks/batch` to start the download (playlists go into a subfolder named after the playlist)

The downloaded file is named `artist - Title.m4a` (AAC, HLS) or `.mp3` (progressive), depending on what SoundCloud serves and the quality setting of the Gopeed extension.
Example: `unonycmusic - SFV Acid - Dirty Martini.m4a`

## Settings (popup)

Click the extension icon in the Chrome toolbar to open settings.

| Setting | Default | Description |
|---|---|---|
| **Gopeed API port** | `9999` | Gopeed's built-in local API port. Change only if you've changed it in Gopeed → Settings → API → Port. |
| **API token** | *(empty)* | Leave empty for a local Gopeed install without auth. Set only if you enabled token protection in Gopeed → Settings → API → Token. |

## Troubleshooting

**Button doesn't appear** — Refresh the SoundCloud page. If still missing, check that the extension is enabled in `chrome://extensions`.

**"Extension context invalidated"** — Refresh the SoundCloud page. This happens after reloading the extension.

Errors are shown on the button (hover it for the full reason) and as a system notification.

**"✗ Gopeed not running"** — Nothing answers on the API port. Start Gopeed. If it is already running, make sure the API is enabled (Gopeed 2.0+ has it off by default — see [Gopeed 2.0+: enable the API](#gopeed-20-enable-the-api)) and that the port matches in Gopeed → Settings → API and in this extension's popup.

**"✗ Bad API token"** — Gopeed has an API token set. Enter the same token in this extension's popup.

**"✗ Gopeed extension"** — The [gopeed-extension-soundcloud](https://github.com/TropinAlexey/gopeed-extension-soundcloud) extension is not installed in Gopeed, is outdated, or failed on this track. Install/update it in Gopeed → Extensions and check Gopeed's `logs/extension.log`. Keep only one SoundCloud extension installed — duplicates run on every link.
