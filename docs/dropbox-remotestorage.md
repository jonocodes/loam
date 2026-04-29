# Dropbox + remoteStorage.js notes (Loam)

This document captures what we learned while getting Dropbox working with Loam, including failures, root causes, debugging steps, and the workarounds implemented in code.

## Background: how Loam uses remoteStorage.js

Loam uses `remotestoragejs` with optional Dropbox / Google Drive backends (via `rs.setApiKeys(...)`).

Two different concepts show up repeatedly:

- **App key / client id** (`VITE_DROPBOX_APP_KEY`): public identifier for your Dropbox app. Used to start OAuth.
- **User access token** (often called “Dropbox token” in debugging): per-user bearer token returned after OAuth. Used for Dropbox HTTP API calls as `Authorization: Bearer ...`.

They are not interchangeable.

## Symptom A: Settings page crashed on Dropbox

### Error

`Uncaught Error: getItemURL is not implemented for Dropbox yet`

### Root cause

`remotestoragejs` `BaseClient.getItemURL(...)` is not implemented for the Dropbox backend.

### Upstream tracking

- Issue: https://github.com/remotestorage/remotestorage.js/issues/1052
- Dropbox/GDrive caveats in rs.js docs: https://remotestorage.io/rs.js/docs/dropbox-and-google-drive.html

### Loam impact

`SettingsView` called `getGardenSettingsUrl()` during render, which used `getItemURL` for private settings JSON.

### Fix in Loam

We wrapped `getItemURL` usage in a safe helper (`scopedItemUrl`) so unsupported backends return `null` instead of throwing.

Practical consequence: the “garden.json” dev link may not appear on Dropbox, but the page should not crash.

## Symptom B: “rebuild index” fails with Dropbox sharing API errors

### What rebuild does in Loam

`rebuildIndex()` eventually needs **public URLs** for published artifacts (posts, `index.json`, feeds, media URLs embedded in markdown, etc.).

For Dropbox, Loam resolves public URLs by calling Dropbox **Sharing** APIs (not `getItemURL`).

### Error observed

`Dropbox sharing API error: 401` (earlier debugging also surfaced `missing_scope` for `sharing.read`)

### Root cause (most important)

**App Console permissions ≠ token scopes.**

Dropbox explicitly notes that changing permissions does not automatically update existing tokens. You must re-authorize to mint a token that includes newly added scopes.

We confirmed the live token behavior with curl:

- `POST /2/check/user` succeeded (token valid)
- `POST /2/sharing/list_shared_links` failed with:

```json
{"error":{".tag":"missing_scope","required_scope":"sharing.read"},"error_summary":"missing_scope/"}
```

That means the bearer token Loam was using **did not include `sharing.read`**, even if the App Console UI looked correct.

### Why `sharing.write` exists in our mental model

Dropbox’s App Console copy for scopes is high-level (“view and manage sharing…”), but **OAuth scopes are ultimately defined by which API routes they unlock**.

Loam uses `POST /2/sharing/create_shared_link_with_settings` to create public links. In Dropbox’s HTTP API reference, routes list a **Required scope**; shared-link creation is part of Dropbox’s **sharing** API surface and is treated as a **write** to sharing metadata (you are creating/updating a shared link record for a path), not a plain file read/write.

Separately, listing/reusing existing links uses `POST /2/sharing/list_shared_links`, which is why **`sharing.read` showed up as missing** in the token probe above.

### Remediation checklist

1. In Dropbox App Console → Permissions, ensure both are enabled:
   - `sharing.read`
   - `sharing.write`
2. Click **Submit** (permissions changes are not active until submitted).
3. Revoke old authorization if needed:
   - Dropbox account “Connected apps” / app authorization screen (wording varies)
4. In Loam: disconnect Dropbox, reconnect Dropbox (force a fresh token with updated scopes)
5. Re-run the curl probes below to confirm the token matches expectations

## Debugging recipes (curl)

Replace `$DROPBOX_TOKEN` with the **OAuth access token** copied from DevTools:

Network tab → request to `api.dropboxapi.com` → Request Headers → `Authorization: Bearer ...`

### 1) Token sanity

```bash
curl -sS https://api.dropboxapi.com/2/check/user \
  -H "Authorization: Bearer $DROPBOX_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"query":"loam-scope-check"}'
```

### 2) Sharing read probe (what Loam uses for fallback)

Adjust `/public/loam/` if your `VITE_PUBLIC_DIR` differs from default.

```bash
curl -sS https://api.dropboxapi.com/2/sharing/list_shared_links \
  -H "Authorization: Bearer $DROPBOX_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"path":"/public/loam/","direct_only":true}'
```

### 3) Account probe (note: body must be JSON `null`)

```bash
curl -sS https://api.dropboxapi.com/2/users/get_current_account \
  -H "Authorization: Bearer $DROPBOX_TOKEN" \
  -H "Content-Type: application/json" \
  --data 'null'
```

### Interpreting common failures

- `401` on Dropbox API calls: often stale/invalid token, wrong token copied, or mismatched app authorization state. Reconnect OAuth.
- `missing_scope` with `required_scope: sharing.read`: token lacks read sharing scope; re-auth after enabling `sharing.read`.
- App Console shows scopes checked but curl disagrees: almost always **stale token** or **permissions not submitted**.

## Workarounds implemented in Loam (code)

### 1) Safe `getItemURL` wrapper

Centralized in `src/lib/remotestorage.ts` as `scopedItemUrl(...)` so Dropbox does not throw during Settings render.

### 2) Dropbox public URL resolution

`resolvePublicFileUrl(...)` uses Dropbox sharing APIs to mint/reuse a public URL for files under `/public/<PUBLIC_DIR>/...`.

### 3) More robust shared-link reuse

If `create_shared_link_with_settings` returns a `409` variant without embedded metadata, we fall back to `list_shared_links` to reuse an existing link.

### 4) Settings “preflight” warning

`checkDropboxSharingAccess()` runs on Settings load and surfaces a warning if sharing endpoints fail early (scopes/token issues), instead of only failing on rebuild.

## Security note

OAuth access tokens are secrets. Prefer DevTools copy locally; avoid committing tokens, posting them in issues, or logging them.

## Related upstream issue links (quick reference)

- Dropbox `getItemURL` not implemented: https://github.com/remotestorage/remotestorage.js/issues/1052
- rs.js Dropbox/GDrive limitations doc: https://remotestorage.io/rs.js/docs/dropbox-and-google-drive.html
