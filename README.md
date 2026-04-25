# Loam

Loam is your minimal blog/[digital garden](https://maggieappleton.com/garden-history). You own all the data. No hosting needed. See it here: [https://loam.dgt.is](https://loam.dgt.is)

## What makes this app different

This app is [local first](https://lofi.so/), [unhosted](https://unhosted.org/), yet publicly sharable via the [remoteStorage protocol](https://remotestorage.io/).

* No database running on a server (e.g. WordPress) that could be shut down at any moment
* No static site generator (e.g. Jekyll + GitHub) requiring a server and local dev tools
* No proprietary schema owned by a SaaS (e.g. Blogger, Squarespace) you can't migrate off
* No self-hosting required (e.g. Ghost, Writefreely) with ongoing maintenance

All you need is a storage account — remoteStorage, Dropbox, or Google Drive. The app is entirely browser-side with no backend.

For more space and control you can host your own remoteStorage server, like [armadietto](https://remotestorage.io/servers.html).

[See Jono's personal digital garden as an example](https://garden.dgt.is).


## Status

- remoteStorage: working, tested on 5apps.com
- Dropbox: implemented, CORS-friendly shared links
- Google Drive: implemented, folder-level public permissions


## Quick start

```bash
bun install
bun run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).


## Routes

| Path | Description |
|---|---|
| `/` | Landing page (or public garden home if `/.well-known/loam.json` is present) |
| `/write` | Editor |
| `/p/{freetext}/{scheme:token}` | Public garden home page |
| `/p/{freetext}/{scheme:token}/{slug}` | Public post page |
| `/p/{slug}` | Public post page (well-known/masked domain mode) |
| `/public/{slug}` | Public post page (query param: `?index=<url>`) |
| `/render/{url-encoded-markdown-url}` | Fetch and render any markdown file by URL |

The `{token}` is an encoded index URL. The `{freetext}` prefix is ignored by the router and exists for human readability (e.g. `/p/yourname/e2:aHR0cH…`). If no URL prefix is set in Settings, `garden` is used as the default. `{scheme}` is the encoding — `e2` is base64 URL-safe (default), `e1` is plain URL encoding.


## Domain masking

You can serve your garden from a custom domain (e.g. `garden.example.com`) without exposing the storage URL in the address bar. The app checks `/.well-known/loam.json` on startup and uses the `indexUrl` from it if present.

Serve the file from your reverse proxy — example Caddy config:

```
handle /.well-known/loam.json {
  header Content-Type application/json
  respond `{"indexUrl":"https://storage.5apps.com/youruser/public/loam/index.json"}` 200
}

reverse_proxy localhost:82 {
  header_up Host loam.dgt.is
}
```

With this in place:
- `garden.example.com/` → public garden home
- `garden.example.com/p/{slug}` → individual post
- The storage URL never appears in the browser address bar


## Editor features

- remoteStorage/Dropbox/Google Drive connect via widget
- Post list with draft/published/unpublished status
- Markdown editor with live styling (CodeMirror)
- Auto title/excerpt parsing from markdown
- Editable slug field (auto-generated from title on first save)
- Actions: Save, Publish, Unpublish, Delete
- Settings page: site title, tagline, URL prefix, rebuild index
- JSON Feed (`feed.json`) generated alongside `index.json`
- Works offline — drafts are stored locally and sync when connected


## Settings

Accessible at `/write` via the Settings tab.

| Setting | Description |
|---|---|
| Site title | Displayed on the public home page and used as the HTML `<title>` |
| Tagline | Subtitle shown below the title on the public home page |
| URL prefix | Human-readable segment added before the encoded token in public URLs |
| URL encoding | `e2` (base64, default) or `e1` (plain URL encoding) |

Settings are stored in `settings/garden.json` (private) and also written into the public `index.json`.


## Storage layout

```
/loam/                            ← private remoteStorage module
  meta/<slug>.json                ← post metadata
  settings/garden.json            ← site settings

/public/loam/                     ← public remoteStorage scope
  index.json                      ← published post listing
  feed.json                       ← JSON Feed 1.1
  posts/<slug>.md                 ← post markdown
```


## Post slug format

Posts use date-prefixed slugs as their primary identifier:

- Format: `YYYY-MM-DD-title-slug`
- Example: `2026-04-25-getting-started`
- The date comes from `publishedAt`, not the creation date
- Collisions get a numeric suffix: `2026-04-25-getting-started-2`
- Slugs can be edited in the form; changing a slug renames the underlying files


## Schema

The public `index.json` format is formally specified with a JSON Schema:

- **[schema/index.json](schema/index.json)** — full JSON Schema (2020-12)
- **[schema/example-index.json](schema/example-index.json)** — annotated example

To regenerate the schema files after changing `src/lib/schema.ts`:

```bash
npm run generate-schema
```

### `index.json` structure

```json
{
  "version": 1,
  "title": "My Garden",
  "tagline": "Notes from the field",
  "urlPrefix": "yourname",
  "urlEncoding": "e2",
  "updatedAt": "2026-04-25T12:00:00Z",
  "posts": [
    {
      "slug": "2026-04-25-getting-started",
      "date": "2026-04-25",
      "title": "Getting Started",
      "excerpt": "A short summary",
      "tags": ["intro"],
      "publishedAt": "2026-04-25T11:00:00Z",
      "updatedAt": "2026-04-25T12:00:00Z",
      "contentUrl": "https://<storage-host>/public/loam/posts/2026-04-25-getting-started.md"
    }
  ]
}
```

Optional post fields: `tags` (array of strings), `mediaType` (defaults to `text/markdown`).


## Post state machine

```
draft ──Publish──> published
published ──Unpublish──> unpublished
unpublished ──Publish──> published
draft|published|unpublished ──Delete──> deleted
```


## Rebuild index

Rebuild scans all `meta/*.json` records, keeps those with `status === "published"` and an existing markdown file, and rewrites `index.json` and `feed.json` from scratch. Use this after editing files outside the app. Title, tagline, and URL prefix are preserved from the existing index.


## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_RS_MODULE` | `loam` | remoteStorage module name and private scope |
| `VITE_PUBLIC_DIR` | same as `VITE_RS_MODULE` | Public scope directory name |
| `VITE_DROPBOX_APP_KEY` | — | Enables Dropbox backend |
| `VITE_GOOGLE_CLIENT_ID` | — | Enables Google Drive backend |


## 401 troubleshooting

If you get `401` errors reading or writing:

- The app claims the `loam` module by default. Make sure your remoteStorage token grants access to it.
- If your data lives under a different public directory, set `VITE_PUBLIC_DIR=<your-dir>`.
- If your module name should differ, set `VITE_RS_MODULE=<your-module>`.
- Reconnect via the remoteStorage widget after changing env vars.


## Core invariant

The index is the only way readers discover posts. A post can exist as files without appearing publicly until it is published and the index is updated.
