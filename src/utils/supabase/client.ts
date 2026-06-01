import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    const isProd = host.endsWith('bioelectronicahn.com')
    const cookieOptions = isProd ? { domain: '.bioelectronicahn.com', path: '/' } : undefined

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions,
        }
    )
}
