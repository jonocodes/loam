import { useEffect, useRef } from 'react'
import Widget from 'remotestorage-widget'
import { rs } from '../lib/remotestorage'

export function ConnectWidget() {
  const attached = useRef(false)

  useEffect(() => {
    if (attached.current) return
    attached.current = true
    const widget = new Widget(rs)
    widget.attach()
  }, [])

  return null
}
