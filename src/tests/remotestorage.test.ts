import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState: {
  privateFileData: unknown
  storedSettingsJson: string | null
} = {
  privateFileData: null,
  storedSettingsJson: null,
}

vi.mock('remotestoragejs', () => {
  class RemoteStorageMock {
    backend = 'dropbox'
    remote = { token: 'test-token' }
    access = { claim: vi.fn() }
    caching = { enable: vi.fn() }

    setApiKeys = vi.fn()
    setSyncInterval = vi.fn()
    connect = vi.fn()
    disconnect = vi.fn()
    on = vi.fn()
    authorize = vi.fn((options?: unknown) => options)

    scope(path: string) {
      if (path.startsWith('/loam/')) {
        return {
          getFile: vi.fn(async () => ({ data: mockState.privateFileData })),
          storeFile: vi.fn(async (_mime: string, targetPath: string, content: string) => {
            if (targetPath === 'settings/garden.json') {
              mockState.storedSettingsJson = content
            }
          }),
          getListing: vi.fn(async () => ({})),
          getItemURL: vi.fn(() => null),
        }
      }
      return {
        getFile: vi.fn(async () => ({ data: null })),
        storeFile: vi.fn(async () => undefined),
        getListing: vi.fn(async () => ({})),
        getItemURL: vi.fn(() => null),
        remove: vi.fn(async () => undefined),
      }
    }
  }

  return { default: RemoteStorageMock }
})

describe('remotestorage dropbox fixes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    mockState.privateFileData = null
    mockState.storedSettingsJson = null
  })

  it('stores garden settings when existing settings are already an object', async () => {
    mockState.privateFileData = { existing: 'value' }
    const mod = await import('../lib/remotestorage')

    await mod.storeGardenSetting('title', 'My Garden')

    expect(mockState.storedSettingsJson).toBeTruthy()
    expect(JSON.parse(mockState.storedSettingsJson as string)).toEqual({
      existing: 'value',
      title: 'My Garden',
    })
  })

  it('reads garden settings when settings file data is already an object', async () => {
    mockState.privateFileData = { title: 'Garden From Object' }
    const mod = await import('../lib/remotestorage')

    await expect(mod.pullGardenSetting('title')).resolves.toBe('Garden From Object')
  })

  it('remembers dropbox root prefix after successful fallback', async () => {
    const createPaths: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const body = init?.body ? (JSON.parse(String(init.body)) as { path?: string }) : {}

      if (url.includes('/2/sharing/create_shared_link_with_settings')) {
        const path = body.path ?? ''
        createPaths.push(path)
        if (path.startsWith('/public/')) {
          return new Response(JSON.stringify({ error_summary: 'path/not_found/..' }), { status: 409 })
        }
        return new Response(JSON.stringify({ url: 'https://www.dropbox.com/s/abc/index.json?dl=0' }), { status: 200 })
      }

      if (url.includes('/2/sharing/list_shared_links')) {
        return new Response(JSON.stringify({ error_summary: 'path/not_found/..' }), { status: 409 })
      }

      return new Response('{}', { status: 500 })
    }))

    const mod = await import('../lib/remotestorage')
    await mod.resolvePublicIndexUrl()
    await mod.resolvePublicIndexUrl()

    expect(createPaths).toEqual([
      '/public/loam/index.json',
      '/remotestorage/public/loam/index.json',
      '/remotestorage/public/loam/index.json',
    ])
  })
})
