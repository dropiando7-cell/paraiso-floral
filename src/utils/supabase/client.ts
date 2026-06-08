import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const cookieOptions: any = { path: '/' }
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        if (hostname.endsWith('bioelectronicahn.com')) {
            cookieOptions.domain = '.bioelectronicahn.com'
        }
    }

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions,
        }
    )
}
