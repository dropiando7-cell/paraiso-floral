import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    // Update the Supabase session
    const { supabase, supabaseResponse } = await updateSession(request)

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()

    // 1. Redirect unauthenticated users to /login if they attempt to access protected routes
    // For now, everything except /login and static assets is protected.
    const isPublicRoute =
        url.pathname.startsWith('/login') ||
        url.pathname.startsWith('/auth/callback') ||
        url.pathname.startsWith('/auth/mfa')

    if (!user && !isPublicRoute) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. Redirect authenticated users away from /login
    if (user && url.pathname.startsWith('/login')) {
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // 3. MFA Enforcement (AAL2 Check)
    if (user && !url.pathname.startsWith('/auth/mfa') && !url.pathname.startsWith('/auth/callback')) {
        // Fetch session to check AAL level
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Check if user has enrolled factors
            const { data: mfaData } = await supabase.auth.mfa.listFactors();
            const hasVerifiedTotp = mfaData?.all?.some(
                (factor) => factor.factor_type === 'totp' && factor.status === 'verified'
            );

            // Fetch the Assurance level
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            // If they have MFA enrolled but their current session is only AAL1, force them to verify
            if (hasVerifiedTotp && aalData?.currentLevel === 'aal1') {
                url.pathname = '/auth/mfa';
                return NextResponse.redirect(url);
            }
        }
    }

    // NOTE: For multi-tenant validation, ideally we could check Prisma here,
    // but Prisma doesn't run natively in the Edge Runtime (which Middleware uses).
    // Therefore, fine-grained access control (checking the user's role and organizationId)
    // will be done on a per-layout or per-page basis in the Server Components,
    // or via a separate Edge-compatible fetch if absolutely needed.
    // For the MFA verification flow, we'll check it at the layout level.

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public assets)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
