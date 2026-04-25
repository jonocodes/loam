import { useEffect, useState } from 'react'
import { MarkdownViewer } from './MarkdownViewer'

interface Props {
  encodedUrl: string
}

export function MarkdownRenderView({ encodedUrl }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const url = (() => {
    try {
      return decodeURIComponent(encodedUrl)
    } catch {
      return null
    }
  })()

  useEffect(() => {
    if (!url) return
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then(setContent)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [url])

  if (!url) {
    return <p className="mx-auto max-w-3xl p-6 text-red-600">Invalid URL encoding.</p>
  }

  if (error) {
    return <p className="mx-auto max-w-3xl p-6 text-red-600">Failed to load: {error}</p>
  }

  if (content === null) {
    return <p className="mx-auto max-w-3xl p-6 text-slate-500">Loading…</p>
  }

  return (
    <article className="mx-auto max-w-3xl p-6">
      <MarkdownViewer value={content} />
    </article>
  )
}
