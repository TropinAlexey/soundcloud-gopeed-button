# SoundCloud → Gopeed (Chrome Extension)

Adds a native **Download** button on SoundCloud track and playlist pages. One click sends the URL to [Gopeed](https://gopeed.com) for downloading.

## Requirements

1. [Gopeed](https://gopeed.com) installed and running
2. [gopeed-extension-soundcloud](https://github.com/TropinAlexey/gopeed-extension-soundcloud) installed inside Gopeed

## Installation

The extension is published to the Chrome Web Store. Install it manually:
[SoundCloud → Gopeed chrome extension](https://chromewebstore.google.com/detail/dibaaanimijeognedjonhifkigceppbh)

## How it works

The button appears in the action toolbar on every SoundCloud track or playlist page (next to Share, Copy Link, etc.).

When clicked:
1. The extension calls Gopeed's local API `POST localhost:9999/api/v1/resolve` — this triggers the `gopeed-extension-soundcloud` which resolves the SoundCloud URL into an actual audio stream
2. Then calls `POST localhost:9999/api/v1/tasks` to start the download

The downloaded file is named `permalink - Title.mp3`  
Example: `nick-budoff-yin-lo-tsop-dr-feat-gedz.mp3`

## Settings (popup)

Click the extension icon in the Chrome toolbar to open settings.

| Setting | Default | Description |
|---|---|---|
| **Gopeed API port** | `9999` | Gopeed's built-in local API port. Change only if you've changed it in Gopeed → Settings → API → Port. |
| **API token** | *(empty)* | Leave empty for a local Gopeed install without auth. Set only if you enabled token protection in Gopeed → Settings → API → Token. |

## Troubleshooting

**Button doesn't appear** — Refresh the SoundCloud page. If still missing, check that the extension is enabled in `chrome://extensions`.

**"Extension context invalidated"** — Refresh the SoundCloud page. This happens after reloading the extension.

**"Failed to fetch"** — Gopeed is not running or the API is not accessible. Make sure Gopeed is open and the port is correct.

**Downloaded file is HTML, not audio** — The `gopeed-extension-soundcloud` extension is not installed or not updated inside Gopeed.
