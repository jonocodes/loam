import { useEffect, useMemo, useState } from "react";
import { ConnectWidget } from "./components/ConnectWidget";
import { LandingView } from "./components/LandingView";
import { PublicIndexView } from "./components/PublicIndexView";
import { PublicPostView } from "./components/PublicPostView";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { MarkdownRenderView } from "./components/MarkdownRenderView";
import { deletePost, generateSlug, publishPost, unpublishPost } from "./lib/gardenService";
import { SettingsView } from "./components/SettingsView";
import {
  clearCloudSharingCache,
  fetchWellKnownIndexUrl,
  isConnected,
  loadPublicIndexUrl,
  onConnected,
  onDisconnected,
  pullAllPostMeta,
  pullGardenSetting,
  pullIndex,
  pullPostMarkdown,
  removePostMarkdown,
  removePostMeta,
  storePostMarkdown,
  storePostMeta,
} from "./lib/remotestorage";
import { parseMarkdownToPost } from "./lib/markdown";
import { decodeIndexToken, encodeIndexToken } from "./lib/indexToken";
import type { GardenPostMeta } from "./lib/schema";

function sortByUpdatedDescending(items: GardenPostMeta[]): GardenPostMeta[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function App() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);
  const [urlPrefix, setUrlPrefix] = useState('');
  const [connected, setConnected] = useState(isConnected());
  const [view, setView] = useState<"posts" | "settings">("posts");
  const [items, setItems] = useState<GardenPostMeta[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const [slug, setSlug] = useState<string>('');
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [postDate, setPostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<GardenPostMeta["status"]>("draft");

  const [publicIndexUrl, setPublicIndexUrl] = useState<string | null>(null);
  // undefined = still checking, null = not found, string = found
  const [wellKnownIndexUrl, setWellKnownIndexUrl] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshList(): Promise<void> {
    const all = await pullAllPostMeta();
    setItems(sortByUpdatedDescending(all));
  }

  useEffect(() => {
    if (!connected) { setPublicIndexUrl(null); return }
    void loadPublicIndexUrl().then(setPublicIndexUrl).catch(() => setPublicIndexUrl(null))
  }, [connected]);

  useEffect(() => {
    const connectedHandler = () => setConnected(true);
    const disconnectedHandler = () => { setConnected(false); clearCloudSharingCache(); };
    const popStateHandler = () => setPath(window.location.pathname + window.location.search);
    onConnected(connectedHandler);
    onDisconnected(disconnectedHandler);
    window.addEventListener("popstate", popStateHandler);

    void fetchWellKnownIndexUrl().then(setWellKnownIndexUrl);

    void refreshList().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });

    void pullGardenSetting("title").then((t) => {
      if (t) document.title = t;
    });

    void pullIndex().then((index) => {
      if (index?.urlPrefix) setUrlPrefix(index.urlPrefix);
    });

    return () => window.removeEventListener("popstate", popStateHandler);
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;

    const selected = items.find((item) => item.slug === selectedSlug);
    if (!selected) return;

    setSlug(selected.slug);
    setOriginalSlug(selected.slug);
    setTitle(selected.title);
    setExcerpt(selected.excerpt);
    setStatus(selected.status);
    setPostDate(selected.publishedAt ? selected.publishedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setMessage("");
    setError("");

    void pullPostMarkdown(selected.slug)
      .then((content) => setBody(content ?? ""))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [selectedSlug, items]);

  function clearEditor(): void {
    setSelectedSlug(null);
    setSlug('');
    setOriginalSlug(null);
    setTitle("");
    setExcerpt("");
    setBody("");
    setPostDate(new Date().toISOString().slice(0, 10));
    setStatus("draft");
    setError("");
    setMessage("");
  }

  const selectedMeta = useMemo(
    () => items.find((item) => item.slug === (originalSlug ?? slug)) ?? null,
    [items, originalSlug, slug]
  );

  const publicIndexToken = publicIndexUrl ? encodeIndexToken(publicIndexUrl) : null;

  const freePart = urlPrefix || 'garden';
  const indexSegment = publicIndexToken ? `${freePart}/${publicIndexToken}` : null;

  const publicHomePageUrl = indexSegment
    ? `${window.location.origin}/p/${indexSegment}`
    : null;

  const publicPostPageUrl =
    originalSlug && indexSegment
      ? `${window.location.origin}/p/${indexSegment}/${originalSlug}`
      : null;

  const pathname = path.split("?")[0];

  if (pathname === "/") {
    const params = new URLSearchParams(window.location.search);
    const indexQueryUrl = params.get("index");
    const postQuerySlug = params.get("post");
    const resolvedIndexUrl = indexQueryUrl ?? (wellKnownIndexUrl !== undefined ? wellKnownIndexUrl : null);

    if (resolvedIndexUrl) {
      if (postQuerySlug) {
        return <PublicPostView postSlug={postQuerySlug} indexUrl={resolvedIndexUrl} />;
      }
      return <PublicIndexView indexUrl={resolvedIndexUrl} />;
    }

    if (wellKnownIndexUrl === undefined) {
      return null; // briefly blank while checking /.well-known/loam.json
    }

    return <LandingView />;
  }

  if (pathname.startsWith("/render/")) {
    const encodedUrl = pathname.slice("/render/".length);
    return <MarkdownRenderView encodedUrl={encodedUrl} />;
  }

  if (pathname.startsWith("/public/")) {
    const postSlug = pathname.split("/").filter(Boolean)[1];
    if (!postSlug) {
      return <p className="mx-auto max-w-3xl p-6 text-red-600">Missing post slug in URL.</p>;
    }
    return <PublicPostView postSlug={postSlug} />;
  }

  if (pathname.startsWith("/p/")) {
    // Structure: /p/{freetext}/{encoded}[/{postSlug}]
    const parts = pathname.split("/").filter(Boolean);
    const encodedPart = parts[2];
    const postSlug = parts[3];

    const indexUrl = encodedPart ? decodeIndexToken(encodedPart) : null;

    if (encodedPart && !indexUrl) {
      return (
        <p className="mx-auto max-w-3xl p-6 text-red-600">
          "{encodedPart}" does not decode to an index URL
        </p>
      );
    }

    const indexBasePath = `/p/${parts[1]}/${encodedPart ?? ''}`;

    if (postSlug) {
      return (
        <PublicPostView
          postSlug={postSlug}
          indexUrl={indexUrl ?? undefined}
          indexBasePath={indexBasePath}
        />
      );
    }
    return <PublicIndexView indexUrl={indexUrl ?? undefined} indexBasePath={indexBasePath} />;
  }

  if (pathname !== "/write") {
    return <LandingView />;
  }

  async function saveDraft(): Promise<void> {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const now = new Date().toISOString();
      const parsed = parseMarkdownToPost(body);
      const resolvedTitle = title.trim() || parsed.title || "Untitled";
      const resolvedExcerpt = excerpt.trim() || parsed.excerpt;
      const parsedBody = parsed.body;

      const resolvedSlug = slug.trim()
        ? slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
        : await generateSlug(resolvedTitle || 'untitled');

      const slugChanged = originalSlug !== null && resolvedSlug !== originalSlug;

      const createdAt = selectedMeta?.createdAt ?? now;
      const nextStatus = selectedMeta?.status ?? "draft";
      const nextPublishedAt = postDate ? new Date(postDate).toISOString() : (selectedMeta?.publishedAt ?? null);
      const nextDeletedAt = selectedMeta?.deletedAt ?? null;

      const meta: GardenPostMeta = {
        version: 1,
        slug: resolvedSlug,
        title: resolvedTitle,
        excerpt: resolvedExcerpt,
        status: nextStatus,
        createdAt,
        updatedAt: now,
        publishedAt: nextPublishedAt,
        deletedAt: nextDeletedAt,
      };

      if (slugChanged && originalSlug) {
        // Save at new slug, delete old
        await storePostMeta(meta);
        await storePostMarkdown(resolvedSlug, parsedBody);
        await removePostMeta(originalSlug);
        await removePostMarkdown(originalSlug);
        if (nextStatus === 'published') {
          setMessage('Saved. Post was published — republish to update the public site.');
        } else {
          setMessage('Saved');
        }
      } else {
        await storePostMeta(meta);
        await storePostMarkdown(resolvedSlug, parsedBody);
        setMessage('Saved');
      }

      setSlug(resolvedSlug);
      setOriginalSlug(resolvedSlug);
      setTitle(meta.title);
      setExcerpt(meta.excerpt);
      setBody(parsedBody);
      setStatus(meta.status);
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "publish" | "unpublish" | "delete"): Promise<void> {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (!slug && !originalSlug) {
        throw new Error("Select or save a post first");
      }

      const activeSlug = originalSlug ?? slug;

      if (action === "publish") {
        await publishPost(activeSlug);
        setMessage("Post published");
        setStatus("published");
        void loadPublicIndexUrl().then(setPublicIndexUrl);
      } else if (action === "unpublish") {
        await unpublishPost(activeSlug);
        setMessage("Post unpublished");
        setStatus("unpublished");
      } else if (action === "delete") {
        const confirmed = window.confirm("Delete this post markdown and metadata?");
        if (!confirmed) return;
        await deletePost(activeSlug);
        setMessage("Post deleted");
        clearEditor();
      }

      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 font-sans text-slate-900">
      <ConnectWidget />

      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-semibold">Loam</h1>
          <nav className="flex gap-2">
            <Button
              variant={view === "posts" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("posts")}
            >
              Posts
            </Button>
            <Button
              variant={view === "settings" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("settings")}
            >
              Settings
            </Button>
            {publicHomePageUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={publicHomePageUrl} target="_blank" rel="noreferrer">
                  Open public home page
                </a>
              </Button>
            ) : null}
          </nav>
        </div>
        <p>
          Connection status: <strong>{connected ? "Connected" : "Not connected"}</strong>.{" "}
          {connected
            ? "Your posts sync to remote storage."
            : "Use the sync widget in the page corner if you want your site to be public."}
        </p>
      </header>

      {view === "settings" ? <SettingsView onSave={(prefix) => setUrlPrefix(prefix)} /> : null}

      <section
        className={`grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]${view === "settings" ? " hidden" : ""}`}
      >
        <Card>
          <CardHeader>
            <strong>Posts</strong>
            <Button variant="outline" size="sm" onClick={clearEditor}>
              New
            </Button>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? <p className="text-sm text-slate-500">No posts yet.</p> : null}
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.slug}>
                  <Button
                    variant="secondary"
                    className="h-auto w-full justify-start p-3 text-left"
                    onClick={() => setSelectedSlug(item.slug)}
                  >
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-xs text-slate-500">
                        {item.status} · {item.slug}
                      </div>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Slug</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="(autogenerated)"
              />
              <span className="text-xs text-slate-500">URL-friendly identifier. Leave empty to auto-generate from title.</span>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Excerpt</span>
              <Input value={excerpt} onChange={(event) => setExcerpt(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Date</span>
              <Input type="date" value={postDate} onChange={(event) => setPostDate(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Markdown Body</span>
              <MarkdownEditor value={body} onChange={setBody} />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void saveDraft()}>
                Save
              </Button>
              <span title={!connected ? "Connect a remote storage provider to publish" : undefined}>
                <Button disabled={busy || !connected} variant="secondary" onClick={() => void runAction("publish")}>
                  Publish
                </Button>
              </span>
              <span title={!connected ? "Connect a remote storage provider to unpublish" : undefined}>
                <Button
                  disabled={busy || !connected}
                  variant="secondary"
                  onClick={() => void runAction("unpublish")}
                >
                  Unpublish
                </Button>
              </span>
              <Button
                disabled={busy}
                variant="destructive"
                onClick={() => void runAction("delete")}
              >
                Delete
              </Button>
              {publicPostPageUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={publicPostPageUrl} target="_blank" rel="noreferrer">
                    Open public post page
                  </a>
                </Button>
              ) : null}
              <span className="ml-auto text-xs text-slate-500">Status: {status}</span>
            </div>

            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
