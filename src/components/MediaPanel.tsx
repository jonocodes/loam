import { useEffect, useRef, useState } from 'react'
import { deleteMedia, loadMediaIndex, uploadMedia } from '../lib/gardenService'
import { getMediaFileAsObjectUrl } from '../lib/remotestorage'
import type { MediaItem } from '../lib/schema'
import { Button } from './ui/button'

interface Props {
  onInsert: (fragment: string, blobUrl?: string, resolvedUrl?: string) => void
}

export function MediaPanel({ onInsert }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blobUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    void loadMediaIndex().then(async (idx) => {
      setItems(idx.items)
      const urls: Record<string, string> = {}
      for (const item of idx.items) {
        const url = await getMediaFileAsObjectUrl(item.contentPath)
        if (url) {
          urls[item.contentPath] = url
          blobUrlsRef.current.add(url)
        }
      }
      setDisplayUrls(urls)
    })

    return () => {
      for (const blobUrl of blobUrlsRef.current) {
        URL.revokeObjectURL(blobUrl)
      }
      blobUrlsRef.current.clear()
    }
  }, [])

  async function handleDelete(item: MediaItem) {
    if (!window.confirm(`Delete "${item.filename}"?`)) return
    setDeleting(item.contentPath)
    setError('')
    try {
      await deleteMedia(item.contentPath)
      setItems((prev) => prev.filter((i) => i.contentPath !== item.contentPath))
      setDisplayUrls((prev) => {
        const next = { ...prev }
        const blobUrl = next[item.contentPath]
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl)
          blobUrlsRef.current.delete(blobUrl)
        }
        delete next[item.contentPath]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  async function handleFiles(files: FileList) {
    setUploading(true)
    setError('')
    try {
      for (const file of files) {
        // Create a blob URL immediately for display before the remote URL resolves
        const blobUrl = URL.createObjectURL(file)
        blobUrlsRef.current.add(blobUrl)
        const item = await uploadMedia(file)
        setItems((prev) => [...prev.filter((i) => i.contentPath !== item.contentPath), item])
        setDisplayUrls((prev) => ({ ...prev, [item.contentPath]: blobUrl }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files)
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : 'Upload image'}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {items.length === 0 && !uploading ? (
        <p className="text-sm text-slate-500">No images yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((item) => (
            <div key={item.contentPath} className="group relative aspect-square">
              <button
                type="button"
                title={`Insert ${item.filename}`}
                className="relative h-full w-full overflow-hidden rounded border border-slate-200 bg-slate-50 hover:border-slate-400"
                onClick={() => {
                  const blobUrl = displayUrls[item.contentPath]
                  const src = blobUrl ?? item.resolvedUrl
                  onInsert(`![${item.filename}](${src})`, blobUrl, item.resolvedUrl)
                }}
              >
                {displayUrls[item.contentPath] ? (
                  <img src={displayUrls[item.contentPath]} alt={item.filename} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-slate-400 break-all">
                    {item.filename}
                  </div>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                  {item.filename}
                </span>
              </button>
              <button
                type="button"
                title="Delete image"
                disabled={deleting === item.contentPath}
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                onClick={() => void handleDelete(item)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
