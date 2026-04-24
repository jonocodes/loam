import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import { useMemo } from 'react'
import 'highlight.js/styles/github.css'

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  })
)

interface Props {
  value: string
}

export function MarkdownViewer({ value }: Props) {
  const html = useMemo(() => marked.parse(value) as string, [value])

  return (
    <div
      className="markdown-body leading-relaxed text-slate-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
