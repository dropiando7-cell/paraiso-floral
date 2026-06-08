import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const host = request.headers.get('host') || ''
    const cookieOptions: any = { path: '/' }
    if (host.endsWith('bioelectronicahn.com')) {
        cookieOptions.domain = '.bioelectronicahn.com'
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, { ...options, ...cookieOptions })
                    )
                },
            },
            cookieOptions,
        }
    )

    // refresh session if expired
    await supabase.auth.getUser()

    // Migrate host-only cookies to cross-subdomain cookies (.bioelectronicahn.com)
    if (host.endsWith('bioelectronicahn.com')) {
        const allCookies = request.cookies.getAll();
        allCookies.forEach(cookie => {
            if (cookie.name.startsWith('sb-')) {
                supabaseResponse.cookies.set(cookie.name, cookie.value, {
                    path: '/',
                    domain: '.bioelectronicahn.com',
                    sameSite: 'lax',
                    secure: true,
                });
            }
        });
    }

    return { supabase, supabaseResponse }
}
