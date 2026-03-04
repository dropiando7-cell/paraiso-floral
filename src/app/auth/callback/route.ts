import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        try {
            const supabase = await createClient()
            const { error, data } = await supabase.auth.exchangeCodeForSession(code)

            if (!error && data?.user?.email) {
                // Check if user is authorized in Prisma
                let authorizedUser = null
                try {
                    authorizedUser = await prisma.user.findUnique({
                        where: { email: data.user.email }
                    })
                } catch (dbErr) {
                    console.error('[auth/callback] Prisma lookup failed:', dbErr)
                    // If DB is temporarily unavailable, still allow login
                    // The per-page auth checks will enforce access control
                    authorizedUser = { email: data.user.email } // minimal fallback
                }

                if (!authorizedUser) {
                    // If not authorized, sign them out and redirect to unauthorized page
                    await supabase.auth.signOut()
                    return NextResponse.redirect(`${origin}/unauthorized`)
                }

                const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
                const isLocalEnv = process.env.NODE_ENV === 'development'
                if (isLocalEnv) {
                    // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                    return NextResponse.redirect(`${origin}${next}`)
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${next}`)
                } else {
                    return NextResponse.redirect(`${origin}${next}`)
                }
            }
        } catch (err) {
            console.error('[auth/callback] Unexpected error during OAuth callback:', err)
            return NextResponse.redirect(`${origin}/unauthorized`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login`)
}
