import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const cookieOptions = { path: '/' }

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions,
        }
    )
}
