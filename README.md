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


## Features

**Writing**
- Markdown editor with live preview and syntax highlighting (CodeMirror)
- HTML and plain text post formats — toggled per post, file extension updates automatically
- Auto title and excerpt parsing from markdown headings
- Editable slug field, auto-generated from title on first save; renaming renames the underlying files and updates all cross-references in other posts
- Draft / published / unpublished post states
- Tags per post (comma-separated, filterable in sidebar and public index)
- User-defined post types with configurable sidebar order, visibility, and title display
- Picks: mark any post as a pick; up to 5 shown in a curated section on the public index
- Image uploads with inline insertion; stored in your cloud storage

**Publishing**
- One-click publish, unpublish, and delete
- Public `index.json` listing with [JSON Schema](schema/index.json)
- JSON Feed 1.1 (`feed.json`) generated alongside the index
- Rebuild index command — re-scans all metadata and rewrites from scratch

**Storage**
- [remoteStorage](https://remotestorage.io/) (tested on 5apps.com)
- Dropbox (CORS-friendly shared links via the sharing API)
- Google Drive (folder-level public permissions, no per-file calls)
- Works offline — edits are cached locally and sync when reconnected
- Installable as a PWA

**Reading**
- Public garden home and post pages — no login required for readers
- Cross-linking between posts with SPA navigation (relative slug links)
- Multiple content type rendering: markdown, HTML, plain text (inferred from `mediaType` field or file extension)
- Render any markdown file by URL at `/render/{encoded-url}`

**Sharing**
- Encoded index token in public URLs — storage URL is not exposed in the address bar
- Domain masking via `/.well-known/loam.json` — serve your garden from a custom domain with clean URLs
- URL-param mode (`?index=<url>`) for embedding in existing sites


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


## Docker

Build and run with default settings (remoteStorage only):

```bash
docker compose up
```

Open `http://localhost:8080`.

To enable Dropbox or Google Drive, pass the API keys as build-time args:

```bash
docker build \
  --build-arg VITE_DROPBOX_APP_KEY=your_key \
  --build-arg VITE_GOOGLE_CLIENT_ID=your_client_id \
  -t loam .
```

> Note: `VITE_*` variables are embedded at build time by Vite, not at runtime. Add them as `ARG` + `ENV` in the Dockerfile if needed, or bake a `.env` file into the image before `bun run build`.


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

# same server
reverse_proxy localhost:82 {
  header_up Host loam.dgt.is
}

# different server — Caddy verifies the upstream cert automatically
# reverse_proxy https://loam.dgt.is
```

With this in place:
- `garden.example.com/` → public garden home
- `garden.example.com/p/{slug}` → individual post
- The storage URL never appears in the browser address bar



## Post organization

### Post types

Post types are user-defined labels (e.g. `posts`, `pages`, `notes`). Each type can be configured in Settings:

| Option | Description |
|---|---|
| Name | The type label — used in the sidebar and as the `?type=` filter parameter |
| Default | New posts are assigned this type automatically |
| Sidebar | Whether this type appears as a section in the sidebar |
| Hide title | Show posts of this type without a section heading (useful for pages integrated into the nav) |

Post types are stored in `index.json` so the public site respects the same order and visibility. Posts with an unrecognized type fall back to the default type in the sidebar.

### Picks

Any post can be marked as a **pick** (`★ pick` checkbox in the editor). Up to 5 picks appear as a curated section at the top of the public index, above the type sections. Useful for surfacing favorite or evergreen posts.

### Home page

A single post can be designated as the home page in Settings. When set, visitors arriving at the public garden root are redirected to that post. The index is still accessible at all times via the "All posts" link.

## Settings

Accessible at `/write` via the Settings tab.

| Setting | Description |
|---|---|
| Site title | Displayed on the public home page and used as the HTML `<title>` |
| Tagline | Subtitle shown below the title on the public home page |
| Home page | Post to show when visitors arrive at the root URL; defaults to the index |
| URL prefix | Human-readable segment added before the encoded token in public URLs |
| URL encoding | `e2` (base64, default) or `e1` (plain URL encoding) |
| Post types | Ordered list of post types with sidebar and display options |

Settings are stored in `settings/garden.json` (private) and also written into the public `index.json`.


## Storage layout

```
/loam/                            ← private remoteStorage module
  meta/<slug>.json                ← post metadata
  settings/garden.json            ← site settings

/public/loam/                     ← public remoteStorage scope
  index.json                      ← published post listing
  feed.json                       ← JSON Feed 1.1
  posts/<slug>.md                 ← post content (.md / .html / .txt)
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
  "homeSlug": "2026-04-25-welcome",
  "urlPrefix": "yourname",
  "urlEncoding": "e2",
  "postTypes": [
    { "name": "posts", "showInSidebar": true, "isDefault": true, "hideTitle": false },
    { "name": "pages", "showInSidebar": true, "isDefault": false, "hideTitle": false }
  ],
  "updatedAt": "2026-04-25T12:00:00Z",
  "posts": [
    {
      "slug": "2026-04-25-getting-started",
      "title": "Getting Started",
      "excerpt": "A short summary",
      "tags": ["intro"],
      "postType": "posts",
      "favorite": false,
      "publishedAt": "2026-04-25T11:00:00Z",
      "updatedAt": "2026-04-25T12:00:00Z",
      "contentUrl": "https://<storage-host>/public/loam/posts/2026-04-25-getting-started.md"
    }
  ]
}
```

Optional index fields: `tagline`, `homeSlug`, `urlPrefix`, `urlEncoding`, `postTypes`.

Optional post fields: `tags` (array of strings), `postType` (string), `favorite` (boolean), `mediaType` (defaults to `text/markdown`).


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
