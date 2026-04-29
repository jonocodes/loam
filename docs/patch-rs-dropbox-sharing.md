Yes — I’d propose an upstream PR that adds configurable Dropbox scopes.

### PR goal

Add optional config like:

```js
remoteStorage.setApiKeys({
  dropbox: {
    appKey: "your-app-key",
    scopes: [
      "account_info.read",
      "files.metadata.read",
      "files.metadata.write",
      "files.content.read",
      "files.content.write",
      "sharing.read",
      "sharing.write"
    ]
  }
});
```

Keep existing API working:

```js
remoteStorage.setApiKeys({
  dropbox: "your-app-key"
});
```

### Why this fits upstream

The current docs tell users to configure Dropbox with `setApiKeys({ dropbox: 'your-app-key' })`, and list only file/account scopes — no sharing scopes. ([remotestorage.io][1]) Dropbox itself says scopes determine which API calls are allowed, and endpoint-required scopes are documented per endpoint. ([Dropbox Developers][2])

### Suggested PR description

```md
Allow configuring Dropbox OAuth scopes

Dropbox-backed apps may need additional Dropbox scopes beyond the default
file/account scopes, for example `sharing.write` to create shared links.

This change keeps the existing `setApiKeys({ dropbox: "app-key" })` API
compatible, while also allowing:

setApiKeys({
  dropbox: {
    appKey: "app-key",
    scopes: ["...", "sharing.write"]
  }
})

When no custom scopes are supplied, the existing default scopes are used.
```

### Implementation shape

In `src/dropbox.ts`, change the hardcoded scope constant into defaults:

```ts
const DEFAULT_OAUTH_SCOPES = [
  "account_info.read",
  "files.content.read",
  "files.content.write",
  "files.metadata.read",
  "files.metadata.write"
];
```

Then wherever Dropbox reads the configured key, support both string and object:

```ts
type DropboxApiKeyConfig =
  | string
  | {
      appKey: string;
      scopes?: string[];
    };

function normalizeDropboxConfig(config: DropboxApiKeyConfig) {
  if (typeof config === "string") {
    return {
      appKey: config,
      scopes: DEFAULT_OAUTH_SCOPES
    };
  }

  return {
    appKey: config.appKey,
    scopes: config.scopes || DEFAULT_OAUTH_SCOPES
  };
}
```

And pass:

```ts
scope: scopes.join(" ")
```

instead of the fixed scope string.

### Docs change

Update the Dropbox docs to show:

```js
remoteStorage.setApiKeys({
  dropbox: {
    appKey: "your-app-key",
    scopes: [
      "account_info.read",
      "files.metadata.read",
      "files.metadata.write",
      "files.content.read",
      "files.content.write",
      "sharing.read",
      "sharing.write"
    ]
  }
});
```

Also add a note: users must reauthorize after scope changes.

This should be a small, backwards-compatible PR.

[1]: https://remotestorage.io/rs.js/docs/dropbox-and-google-drive.html "Offering Dropbox and Google Drive storage options | remoteStorage.js"
[2]: https://developers.dropbox.com/oauth-guide?utm_source=chatgpt.com "OAuth Guide - Dropbox"
