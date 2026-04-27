declare const __BUILD_TIME__: string

declare module 'remotestorage-widget' {
  import type RemoteStorage from 'remotestoragejs'

  export default class Widget {
    constructor(rs: RemoteStorage, options?: Record<string, unknown>)
    attach(elementId?: string): void
  }
}
