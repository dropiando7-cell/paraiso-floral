import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone()
    const host = request.headers.get('host') || ''
    const isMainDomain = host === 'bioelectronicahn.com' || host === 'www.bioelectronicahn.com'
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')

    // Update the Supabase session first to know auth status
    const { supabase, supabaseResponse } = await updateSession(request)
    const { data: { user } } = await supabase.auth.getUser()

    // Determine if the path is a public landing path.
    // On localhost, the root path '/' is only public if the user is not authenticated.
    const isPublicPath =
        (url.pathname === '/' && (isMainDomain || !user)) ||
        url.pathname.startsWith('/landing') ||
        url.pathname.startsWith('/productos') ||
        url.pathname === '/servicios' ||
        url.pathname === '/contacto' ||
        url.pathname === '/nosotros';

    if (isMainDomain) {
        // Redirect ERP system routes to the operational subdomain
        const isSystemPath = 
            url.pathname.startsWith('/login') ||
            url.pathname.startsWith('/auth') ||
            url.pathname.startsWith('/api') ||
            url.pathname.startsWith('/print') ||
            url.pathname.startsWith('/c/') ||
            url.pathname.startsWith('/ficha-tecnica') ||
            url.pathname.startsWith('/pos-kiosko') ||
            url.pathname.startsWith('/nuevo-dash') ||
            url.pathname.startsWith('/inventario') ||
            url.pathname.startsWith('/rentas') ||
            url.pathname.startsWith('/facturas') ||
            url.pathname.startsWith('/cierre-caja') ||
            url.pathname.startsWith('/contactos') ||
            url.pathname.startsWith('/calendario') ||
            url.pathname.startsWith('/graficas')

        if (isSystemPath) {
            return NextResponse.redirect(`https://sistema.bioelectronicahn.com${url.pathname}${url.search}`)
        }
    }

    if (isMainDomain || (isLocalhost && isPublicPath)) {
        // Query maintenance mode dynamically using Supabase (compatible with Edge runtime)
        let isMaintenance = true;
        let isSuperAdmin = false;
        try {
            // Get maintenance mode
            const { data: settingData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'maintenance_mode')
                .single();
            if (settingData) {
                isMaintenance = settingData.value === 'true';
            }

            // Get logged in user role to bypass maintenance (if cookies/session exists)
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('email', user.email)
                    .single();
                if (profile) {
                    // Allow any authenticated system user to bypass maintenance mode to preview the site
                    isSuperAdmin = true;
                }
            }
        } catch (e) {
            console.error('Error querying maintenance_mode in middleware:', e);
        }

        if (isMaintenance && !isSuperAdmin) {
            // Internal rewrite to the landing under-construction page
            if (url.pathname !== '/landing') {
                url.pathname = '/landing'
                return NextResponse.rewrite(url)
            }
            return NextResponse.next()
        } else {
            // Rewrite public paths to their respective /landing endpoints
            if (isPublicPath) {
                const rewritePath = url.pathname === '/' ? '/landing' : (url.pathname.startsWith('/landing') ? url.pathname : `/landing${url.pathname}`);
                if (url.pathname !== rewritePath) {
                    url.pathname = rewritePath;
                    return NextResponse.rewrite(url);
                }
            } else if (isMainDomain) {
                // If it is not a system path and not a known public path, redirect to root
                url.pathname = '/';
                return NextResponse.redirect(url);
            }
            return NextResponse.next()
        }
    } else {
        // Redirect public/landing requests on the operational domain to the main public domain (except local testing)
        if (isPublicPath && !isLocalhost) {
            const targetPath = url.pathname === '/landing' ? '/' : url.pathname;
            return NextResponse.redirect(`https://bioelectronicahn.com${targetPath}${url.search}`);
        }
    }

    // Session is already updated at the top of the middleware

    // 1. Redirect unauthenticated users to /login if they attempt to access protected routes
    // For now, everything except /login and static assets is protected.
    const isPublicRoute =
        url.pathname.startsWith('/login') ||
        url.pathname.startsWith('/auth/callback') ||
        url.pathname.startsWith('/auth/mfa') ||
        url.pathname.startsWith('/api/checkin/pass') ||
        url.pathname.startsWith('/api/checkin/pendientes') ||
        url.pathname.startsWith('/api/checkin/completar') ||
        url.pathname.startsWith('/api/impresion') ||
        url.pathname.startsWith('/print') ||
        url.pathname.startsWith('/c/') ||
        url.pathname.startsWith('/aprobar-presupuesto') ||
        url.pathname.startsWith('/api/soporte/firmar-presupuesto')

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
