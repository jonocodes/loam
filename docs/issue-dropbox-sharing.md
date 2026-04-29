Here’s a clear internal doc you can use/share with your team:

---

# Dropbox API Scopes Issue with `remotestorage.js`

## Summary

When using Dropbox via `remotestorage.js`, certain API features (like creating public/shared links) may fail due to **missing OAuth scopes**, even if those scopes are enabled in the Dropbox App Console.

This happens because:

* `remotestorage.js` **hardcodes a limited set of Dropbox scopes**
* Dropbox tokens **do not automatically update when scopes change**
* The OAuth flow must explicitly request all required scopes

---

## Symptoms

* API calls fail with errors like:

```json
{
  ".tag": "missing_scope",
  "required_scope": "sharing.write"
}
```

* Features like:

  * Creating shared links
  * Managing sharing settings
    do not work

* Inspecting `/oauth2/authorize` shows scopes like:

```txt
account_info.read files.content.read files.content.write files.metadata.read files.metadata.write
```

but **missing**:

```txt
sharing.read sharing.write
```

---

## Root Cause

### 1. `remotestorage.js` hardcodes Dropbox scopes

The library defines scopes internally:

```txt
account_info.read
files.content.read
files.content.write
files.metadata.read
files.metadata.write
```

It does **not include sharing scopes**.

---

### 2. Dropbox scopes are fixed at authorization time

Once a user authorizes your app:

* The token is minted with a fixed set of scopes
* Adding scopes later in the App Console does **nothing**
* Existing tokens cannot be upgraded

👉 Users must re-authorize with the new scopes.

---

### 3. Scopes are requested during `/authorize`, not `/token`

Dropbox determines scopes during:

```txt
/oauth2/authorize
```

NOT during:

```txt
/oauth2/token
```

---

## Required Scopes for Sharing

To create public links:

```txt
sharing.read
sharing.write
```

Typically combined with:

```txt
files.metadata.read
files.content.read
files.content.write
```

---

## Workarounds

### Option 1: Monkey-patch `remotestorage.js` (Recommended)

You can inject additional scopes without modifying `node_modules`.

```js
const EXTRA_DROPBOX_SCOPES = "sharing.read sharing.write";

const originalAuthorize = remoteStorage.authorize.bind(remoteStorage);

remoteStorage.authorize = function patchedAuthorize(options) {
  if (options.authURL?.includes("dropbox.com/oauth2/authorize")) {
    const scopes = new Set(
      `${options.scope || ""} ${EXTRA_DROPBOX_SCOPES}`.trim().split(/\s+/)
    );

    options = {
      ...options,
      scope: Array.from(scopes).join(" ")
    };
  }

  return originalAuthorize(options);
};
```

Then force re-auth:

```js
remoteStorage.disconnect();
remoteStorage.reconnect();
```

---

### Option 2: Separate OAuth Flow for Sharing

Run your own Dropbox OAuth flow (outside `remotestorage.js`) with:

```txt
sharing.read sharing.write
```

Use that token only for sharing APIs.

Pros:

* Clean separation
* No patching

Cons:

* Two tokens to manage

---

### Option 3: Backend Proxy for Sharing

* Frontend uses `remotestorage.js` for file ops
* Backend handles Dropbox OAuth with full scopes
* Backend creates shared links

Pros:

* More control
* Better security (tokens not in frontend)

Cons:

* Requires backend

---

### Option 4: Fork or Upstream Fix

Modify `remotestorage.js` to support configurable scopes.

Best long-term solution, but requires:

* Maintaining a fork OR
* Contributing upstream

---

## Required Reauthorization

After fixing scopes, users MUST reauthorize:

Options:

* Add to OAuth URL:

```txt
force_reapprove=true
```

* OR manually:

  * Dropbox → Settings → Connected Apps → Remove app

---

## Debugging Checklist

1. Check `/authorize` request:

   * Does it include `sharing.write`?

2. Check Dropbox App Console:

   * Are sharing scopes enabled?

3. Confirm reauthorization happened:

   * Old tokens will not update

4. Look at API error:

   * `missing_scope` tells you exactly what's missing

---

## Key Takeaways

* Dropbox scopes are **opt-in and immutable per token**
* `remotestorage.js` **does not request sharing scopes by default**
* You must **modify the authorize request or run a separate OAuth flow**
* **Reauthorization is always required after scope changes**

---

If you want, I can help turn this into a clean PR against `remotestorage.js` so you don’t need the patch long-term.
