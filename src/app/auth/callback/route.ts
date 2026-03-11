import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'
    const requestUrl = new URL(request.url)

    if (code) {
        try {
            const supabase = await createClient()
            const { error, data } = await supabase.auth.exchangeCodeForSession(code)

            if (error) {
                console.error('[auth/callback] Error exchanging code for session:', error)
            } else if (data?.user?.email) {
                // Check if user is authorized in Prisma
                let authorizedUser = null
                try {
                    authorizedUser = await prisma.user.findUnique({
                        where: { email: data.user.email },
                        select: { email: true, defaultModule: true } // Only fetch what we need
                    })
                } catch (dbErr) {
                    console.error('[auth/callback] Prisma lookup failed:', dbErr)
                    authorizedUser = { email: data.user.email } as any // minimal fallback
                }

                if (!authorizedUser) {
                    await supabase.auth.signOut()
                    return NextResponse.redirect(new URL('/unauthorized', request.url))
                }

                let redirectPath = next;
                if (redirectPath === '/' && authorizedUser.defaultModule) {
                    redirectPath = authorizedUser.defaultModule;
                }

                const forwardedHost = request.headers.get('x-forwarded-host')
                const isLocalEnv = process.env.NODE_ENV === 'development'

                if (isLocalEnv) {
                    return NextResponse.redirect(new URL(redirectPath, request.url))
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
                } else {
                    return NextResponse.redirect(new URL(redirectPath, request.url))
                }
            } else {
                console.error('[auth/callback] No error, but no user data returned.')
            }
        } catch (err) {
            console.error('[auth/callback] Unexpected error during OAuth callback:', err)
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
}
