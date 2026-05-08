# Follow-up: upstream improvements to remoteStorage.js

This document captures potential future improvements to [remotestorage.js](https://github.com/jonocodes/remotestorage.js/tree/fix/dropbox-getitemurl) that go beyond the current branch but could simplify loam further if implemented.

## Current branch status

Branch `fix/dropbox-getitemurl` on [jonocodes/remotestorage.js](https://github.com/jonocodes/remotestorage.js/tree/fix/dropbox-getitemurl) is 3 commits ahead of upstream `2.0.0-beta.9`:

1. **`feat: implement async getItemURL for Dropbox backend`** — Makes `BaseClient.getItemURL` async (`Promise<string | undefined>`), implements it on `DropboxClient` with cache-first strategy via `_itemRefs`, falls back to `share()` API call. Adds `sharing.write` to OAuth scope.

2. **`docs: update Dropbox class header`** — Removes stale "known issue" note about `getItemURL` being unavailable.

3. **`test: fix async handling and add missing cases`** — Updates baseclient-suite tests to await the now-async method, adds tests for `!connected` and delegation to `remote.getItemURL`.

This branch is not yet merged upstream.

---

## What loam can simplify now (after branch lands upstream)

### `patchAuthorizeScopes()` — can be removed

**Location:** `src/lib/remotestorage.ts` lines 39–64

Loam patches `rs.authorize` to add `sharing.read` and `sharing.write` to Dropbox OAuth scopes, and `drive` scope to Google Drive.

**Reason it can be removed:** The upstream branch adds `sharing.write` to `OAUTH_SCOPE` in `src/dropbox.ts`:
```ts
const OAUTH_SCOPE = 'account_info.read files.content.read files.content.write files.metadata.read files.metadata.write sharing.write';
```

Once loam updates to the new rs.js version, this monkey-patch becomes redundant. The `sharing.read` scope can also be removed from `EXTRA_DROPBOX_SCOPES` since it will already be included via `hookIt` → `connectOAuth` → default scopes.

**Note:** `EXTRA_GOOGLE_DRIVE_SCOPES` (`https://www.googleapis.com/auth/drive`) may still be needed — verify whether upstream's Google Drive backend includes this scope by default.

### `scopedItemUrl()` — must become async

**Location:** `src/lib/remotestorage.ts` lines 82–89

```ts
function scopedItemUrl(client: { getItemURL(path: string): unknown }, path: string): string | null {
  try {
    const url = client.getItemURL(path)
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}
```

**What must change:** Since `BaseClient.getItemURL` is now `async`, callers must await it. The wrapper should become:

```ts
async function scopedItemUrl(client: { getItemURL(path: string): Promise<string | undefined> }, path: string): Promise<string | null> {
  try {
    const url = await client.getItemURL(path)
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}
```

And all call sites (`itemUrl`, `getGardenSettingsUrl`) would become `async`.

---

## What should stay in loam (not upstreamable or not yet)

### `resolvePublicFileUrl()` — Dropbox path variant handling

**Location:** `src/lib/remotestorage.ts` lines 447–466

Loam calls Dropbox sharing APIs directly with custom path handling. The upstream `getItemURL` returns a URL but does not handle path variants.

**Why it stays:** Loam needs to try both `/public/<PUBLIC_DIR>/...` and `/remotestorage/public/<PUBLIC_DIR>/...` paths, remembering which variant succeeded for subsequent calls. The upstream `share()` method only works with one path at a time.

### `createDropboxSharedLink()` — 409 fallback and error recovery

**Location:** `src/lib/remotestorage.ts` lines 287–372

When `create_shared_link_with_settings` returns `409 shared_link_already_exists`, loam falls back to `list_shared_links` to retrieve the existing URL rather than failing.

**Why it stays:** The upstream `share()` method does not implement this recovery pattern. If it did, loam could rely on `getItemURL` alone and remove this entire function.

### `dropboxToDirectUrl()` — URL conversion

**Location:** `src/lib/remotestorage.ts` lines 374–376

```ts
function dropboxToDirectUrl(url: string): string {
  return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=0$/, '')
}
```

Converts shared links to direct download URLs (`dl.dropboxusercontent.com`).

**Why it stays:** Upstream `getItemURL` returns the raw Dropbox shared link. This conversion is loam-specific behavior.

### `checkDropboxSharingAccess()` — preflight check

**Location:** `src/lib/remotestorage.ts` lines 201–269

Runs on Settings load to surface token/scope issues early. Handles `409 malformed_path` by retrying `list_shared_links` without a path.

**Why it stays:** This is app-specific UI logic. However, the pathless retry pattern is a generally useful probe that could be a utility method in rs.js.

### `getDropboxPathCandidates()` and `rememberDropboxPathVariant()` — path variant tracking

**Location:** `src/lib/remotestorage.ts` lines 95–142

Tracks which Dropbox root path variant (`/public/...` vs `/remotestorage/public/...`) succeeded so subsequent calls skip the loser.

**Why it stays:** Upstream does not track this state. If upstream added path variant caching to `DropboxClient`, this could be removed.

---

## Potential follow-up PRs to upstream

If you want to drive further simplification, here are the candidate PRs:

### PR 1: Path variant caching on `DropboxClient`

**Problem:** Loam must try multiple path variants (`/public/...` vs `/remotestorage/public/...`) on every `getItemURL` call because upstream doesn't track which variant succeeded.

**Solution:** Add a `DropboxClient._rootVariant` field that stores `'public'` or `'remotestorage'` after the first successful `share()` call. Subsequent `getItemURL` calls use that variant directly without retrying.

**Files affected upstream:** `src/dropbox.ts` — add `_rootVariant: 'public' | 'remotestorage' | null` to `DropboxClient`, set it in `share()` on success, check it in `getItemURL`.

**Benefit to loam:** `createDropboxSharedLink` could call `dropbox.getItemURL()` instead of re-implementing the path logic, and `getDropboxPathCandidates` / `rememberDropboxPathVariant` could be removed.

### PR 2: 409 recovery in `share()`

**Problem:** When `create_shared_link_with_settings` returns `409 shared_link_already_exists`, loam manually calls `list_shared_links` to recover the existing URL.

**Solution:** `share()` in `src/dropbox.ts` handles this internally — on `409 shared_link_already_exists` with no embedded metadata, call `list_shared_links` and return the existing URL.

**Files affected upstream:** `src/dropbox.ts` — in `share()`, after the `409` check, add a fallback `list_shared_links` call and use its URL.

**Benefit to loam:** `createDropboxSharedLink` simplifies to just calling `dropbox.getItemURL()`. The 409-specific handling can be removed.

### PR 3: Direct URL conversion in `getItemURL`

**Problem:** Dropbox returns `www.dropbox.com/s/...` links; loam converts them to `dl.dropboxusercontent.com/...` for better download UX.

**Solution:** `getItemURL` in `src/dropbox.ts` applies the same transformation before caching and returning the URL.

**Files affected upstream:** `src/dropbox.ts` — in `getItemURL`, after getting the URL from `share()` or `_itemRefs`, pass through `dropboxToDirectUrl()`.

**Benefit to loam:** `dropboxToDirectUrl()` can be removed.

### PR 4: Optional sharing preflight utility

**Problem:** Apps need to verify sharing scopes work before triggering a sync that depends on shared links.

**Solution:** Add `DropboxClient.prototype.checkSharingAccess(): Promise<string | null>` that probes `list_shared_links` and returns an error message string or `null` on success. Handles the pathless retry for `malformed_path`.

**Files affected upstream:** `src/dropbox.ts` — add `checkSharingAccess()` method.

**Benefit to loam:** `checkDropboxSharingAccess()` becomes a thin wrapper or can be removed if the utility is comprehensive enough.

---

## Summary

| Item | Status | Notes |
|------|--------|-------|
| `patchAuthorizeScopes` | Can be removed after upstream | Remove scope-merging monkey-patch once rs.js includes `sharing.write` |
| `scopedItemUrl` | Must become async | Update to `await` the now-async `getItemURL` |
| `getDropboxPathCandidates` / `rememberDropboxPathVariant` | Could be upstreamed | Candidate PR #1 |
| `createDropboxSharedLink` (409 fallback) | Could be upstreamed | Candidate PR #2 |
| `dropboxToDirectUrl` | Could be upstreamed | Candidate PR #3 |
| `checkDropboxSharingAccess` | Partially upstreamable | Candidate PR #4 for the pathless retry pattern |
| `resolvePublicFileUrl` (Dropbox branch) | Needs custom code | Path variant handling not in upstream |