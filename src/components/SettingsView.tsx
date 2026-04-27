import { useEffect, useState } from 'react'
import { rebuildIndex, saveSiteSettings } from '../lib/gardenService'
import { getGardenSettingsUrl, loadPublicIndexUrl, resolvePublicFeedAtomUrl, resolvePublicFeedUrl, pullGardenSetting, pullIndex } from '../lib/remotestorage'
import { encodeIndexToken } from '../lib/indexToken'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'

interface Props {
  onSave?: (urlPrefix: string) => void
}

export function SettingsView({ onSave }: Props = {}) {
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [urlPrefix, setUrlPrefix] = useState('')
  const [urlEncoding, setUrlEncoding] = useState<'e1' | 'e2'>('e2')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [publicIndexUrl, setPublicIndexUrl] = useState<string | null>(null)
  const [publicFeedUrl, setPublicFeedUrl] = useState<string | null>(null)
  const [publicFeedAtomUrl, setPublicFeedAtomUrl] = useState<string | null>(null)
  const gardenSettingsUrl = getGardenSettingsUrl()

  useEffect(() => {
    void Promise.all([
      pullGardenSetting('title').catch(() => null),
      pullGardenSetting('tagline').catch(() => null),
      pullIndex().catch(() => null),
      loadPublicIndexUrl().catch(() => null),
      resolvePublicFeedUrl().catch(() => null),
      resolvePublicFeedAtomUrl().catch(() => null),
    ]).then(([t, tl, index, indexUrl, feedUrl, atomUrl]) => {
      if (t) setTitle(t)
      if (tl) setTagline(tl)
      if (index?.urlPrefix) setUrlPrefix(index.urlPrefix)
      if (index?.urlEncoding) setUrlEncoding(index.urlEncoding)
      setPublicIndexUrl(indexUrl ?? null)
      setPublicFeedUrl(feedUrl ?? null)
      setPublicFeedAtomUrl(atomUrl ?? null)
    })
  }, [])

  async function handleSave(): Promise<void> {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await saveSiteSettings(title, tagline, urlPrefix, urlEncoding)
      if (title) document.title = title
      onSave?.(urlPrefix)
      setMessage('Settings saved')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRebuild(): Promise<void> {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await rebuildIndex()
      setMessage('Index rebuilt')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Site Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Garden" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Tagline</span>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short description of your site" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">URL prefix</span>
          <Input value={urlPrefix} onChange={(e) => setUrlPrefix(e.target.value)} placeholder="yourname" />
          <span className="text-xs text-slate-500">Appears in public URLs: /p/<em>yourname</em>/…</span>
        </label>
        <fieldset className="grid gap-1 text-sm">
          <span className="font-medium">URL encoding</span>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2">
              <input type="radio" name="urlEncoding" value="e2" checked={urlEncoding === 'e2'} onChange={() => setUrlEncoding('e2')} />
              <span>e2 — Base64 URL-safe <span className="text-slate-500">(default)</span></span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="urlEncoding" value="e1" checked={urlEncoding === 'e1'} onChange={() => setUrlEncoding('e1')} />
              <span>e1 — Plain URL encoding</span>
            </label>
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void handleSave()}>Save settings</Button>
          <Button disabled={busy} variant="outline" onClick={() => void handleRebuild()}>Rebuild index</Button>
        </div>
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {publicIndexUrl ? (() => {
          const token = encodeIndexToken(publicIndexUrl, urlEncoding)
          const siteUrl = `${window.location.origin}/p/${urlPrefix || 'garden'}/${token}`
          const maskedUrl = `${window.location.origin}/?index=${encodeURIComponent(publicIndexUrl)}`
          return (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Your public site</p>
                <a
                  className="break-all text-sm font-medium text-slate-900 underline underline-offset-4"
                  href={siteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {siteUrl}
                </a>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">URL-param version (for domain masking)</p>
                <a
                  className="break-all text-sm text-slate-700 underline underline-offset-4"
                  href={maskedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {maskedUrl}
                </a>
              </div>
            </div>
          )
        })() : null}
        <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
          Powered by <a className="underline underline-offset-4 hover:text-slate-600" href="https://github.com/jonocodes/loam" target="_blank" rel="noreferrer">Loam</a>
        </div>
        {publicIndexUrl || publicFeedUrl || publicFeedAtomUrl || gardenSettingsUrl ? (
          <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm">
            {publicIndexUrl ? (
              <a className="underline underline-offset-4" href={publicIndexUrl} target="_blank" rel="noreferrer">Open index.json</a>
            ) : null}
            {publicFeedUrl ? (
              <a className="underline underline-offset-4" href={publicFeedUrl} target="_blank" rel="noreferrer">Open feed.json</a>
            ) : null}
            {publicFeedAtomUrl ? (
              <a className="underline underline-offset-4" href={publicFeedAtomUrl} target="_blank" rel="noreferrer">Open feed.atom</a>
            ) : null}
            {gardenSettingsUrl ? (
              <a className="underline underline-offset-4" href={gardenSettingsUrl} target="_blank" rel="noreferrer">Open garden.json</a>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
