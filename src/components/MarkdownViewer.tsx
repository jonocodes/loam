import hljs from 'highlight.js'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import { useMemo } from 'react'
import 'highlight.js/styles/github.css'
import { navigate } from '../lib/navigate'

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
)

interface Props {
  value: string
}

function handleClick(e: React.MouseEvent<HTMLDivElement>) {
  const anchor = (e.target as HTMLElement).closest('a')
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href || href.includes('://') || href.startsWith('/') || href.startsWith('#') || href.startsWith('mailto:'))
    return
  e.preventDefault()
  const url = new URL(href, window.location.href)
  navigate(`${url.pathname}${url.search}${url.hash}`)
}

export function MarkdownViewer({ value }: Props) {
  const html = useMemo(() => marked.parse(value) as string, [value])

  return (
    <div
      className="markdown-body leading-relaxed text-slate-900"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  )
}
