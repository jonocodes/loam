import type { ReactNode } from 'react'
import { LandingView } from '../components/LandingView'
import { MarkdownRenderView } from '../components/MarkdownRenderView'
import { PublicIndexView } from '../components/PublicIndexView'
import { PublicPostView } from '../components/PublicPostView'
import { decodeIndexToken } from './indexToken'

interface RouteMatch {
  render: () => ReactNode
}

export function matchRoute(pathname: string, search: string, wellKnownIndexUrl: string | null | undefined): RouteMatch {
  if (pathname === '/') {
    const params = new URLSearchParams(search)
    const indexQueryUrl = params.get('index')
    const resolvedIndexUrl = indexQueryUrl ?? (wellKnownIndexUrl !== undefined ? wellKnownIndexUrl : null)

    if (resolvedIndexUrl) {
      return { render: () => <PublicIndexView indexUrl={resolvedIndexUrl} /> }
    }

    if (wellKnownIndexUrl === undefined) {
      return { render: () => null }
    }

    return { render: () => <LandingView /> }
  }

  if (pathname.startsWith('/render/')) {
    const encodedUrl = pathname.slice('/render/'.length)
    return {
      render: () => <MarkdownRenderView encodedUrl={encodedUrl} />,
    }
  }

  if (pathname.startsWith('/public/')) {
    const postSlug = pathname.split('/').filter(Boolean)[1]
    if (!postSlug) {
      return {
        render: () => <p className="mx-auto max-w-3xl p-6 text-red-600">Missing post slug in URL.</p>,
      }
    }
    return {
      render: () => <PublicPostView postSlug={postSlug} />,
    }
  }

  if (pathname.startsWith('/p/')) {
    const parts = pathname.split('/').filter(Boolean)

    if (parts.length === 2) {
      if (wellKnownIndexUrl === undefined) {
        return { render: () => null }
      }
      if (wellKnownIndexUrl) {
        return {
          render: () => <PublicPostView postSlug={parts[1]} indexUrl={wellKnownIndexUrl} indexBasePath="/" />,
        }
      }
      return { render: () => <LandingView /> }
    }

    const encodedPart = parts[2]
    const postSlug = parts[3]
    const indexUrl = encodedPart ? decodeIndexToken(encodedPart) : null

    if (encodedPart && !indexUrl) {
      return {
        render: () => (
          <p className="mx-auto max-w-3xl p-6 text-red-600">"{encodedPart}" does not decode to an index URL</p>
        ),
      }
    }

    const indexBasePath = `/p/${parts[1]}/${encodedPart ?? ''}`

    if (postSlug) {
      return {
        render: () => (
          <PublicPostView postSlug={postSlug} indexUrl={indexUrl ?? undefined} indexBasePath={indexBasePath} />
        ),
      }
    }

    return {
      render: () => <PublicIndexView indexUrl={indexUrl ?? undefined} indexBasePath={indexBasePath} />,
    }
  }

  if (pathname !== '/write') {
    return { render: () => <LandingView /> }
  }

  return { render: () => null }
}
