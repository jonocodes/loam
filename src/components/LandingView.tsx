import { navigate } from '../lib/navigate'

export function LandingView() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:p-12 font-sans text-slate-900">
      <h1 className="text-3xl font-semibold md:text-4xl">Loam</h1>
      <p className="mt-4 text-lg text-slate-600">
        Loam is a place to write and share thoughts at your own pace, with full ownership of your content. See an{' '}
        <a href="https://garden.dgt.is" className="text-blue-500 underline" target="_blank" rel="noopener">
          example blog here
        </a>
        . Learn more about{' '}
        <a href="https://github.com/jonocodes/loam" className="text-blue-500 underline" target="_blank" rel="noopener">
          how Loam works here
        </a>
        .
      </p>
      <a
        className="mt-8 inline-block rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        href="/write"
        onClick={(e) => {
          e.preventDefault()
          navigate('/write')
        }}
      >
        Open editor
      </a>
    </main>
  )
}
