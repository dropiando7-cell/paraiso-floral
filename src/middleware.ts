import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone()
    const host = request.headers.get('host') || ''
    const isSystemDomain = host === 'sistema.bioelectronicahn.com'
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')

    // Update the Supabase session first to know auth status
    const { supabase, supabaseResponse } = await updateSession(request)
    const { data: { user } } = await supabase.auth.getUser()

    // Helper to return redirect/rewrite responses with updated Supabase cookies
    const returnResponse = (res: NextResponse) => {
        supabaseResponse.cookies.getAll().forEach(cookie => {
            res.cookies.set(cookie)
        })
        return res
    }

    // Determine if the path is a public website path
    const isPublicPath =
        (url.pathname === '/' && !((isSystemDomain || isLocalhost) && user)) ||
        url.pathname.startsWith('/landing') ||
        url.pathname.startsWith('/productos') ||
        url.pathname === '/servicios' ||
        url.pathname === '/contacto' ||
        url.pathname === '/nosotros' ||
        url.pathname === '/bio' ||
        url.pathname.startsWith('/bio/');

    // 1. DOMAIN ENFORCEMENT (PRODUCTION ONLY)
    if (!isLocalhost) {
        // A. System/Protected Routes and Login MUST only be served on sistema.bioelectronicahn.com
        const isSystemRoute = !isPublicPath || url.pathname.startsWith('/login') || url.pathname.startsWith('/auth');
        
        if (isSystemRoute && !isSystemDomain) {
            // Redirect to sistema.bioelectronicahn.com
            return returnResponse(NextResponse.redirect(`https://sistema.bioelectronicahn.com${url.pathname}${url.search}`))
        }

        // B. Public Landing Routes on the System Domain:
        // If the user is NOT logged in, redirect them to the main domain.
        // If the user IS logged in, let them view the public pages on the system domain so they retain their session!
        if (isPublicPath && isSystemDomain && !user) {
            const targetPath = url.pathname === '/landing' ? '/' : url.pathname;
            return returnResponse(NextResponse.redirect(`https://bioelectronicahn.com${targetPath}${url.search}`))
        }
    }

    // 2. ROOT PATH REDIRECTS FOR SYSTEM DOMAIN / LOCALHOST
    if (url.pathname === '/') {
        if (!user && (isSystemDomain || isLocalhost)) {
            // Unauthenticated users on the system domain go to login
            url.pathname = '/login'
            return returnResponse(NextResponse.redirect(url))
        }
    }

    // 3. LOGIN PATH REDIRECT FOR LOGGED-IN USERS
    if (user && url.pathname.startsWith('/login')) {
        url.pathname = '/'
        return returnResponse(NextResponse.redirect(url))
    }

    // 4. MAINTENANCE MODE & PUBLIC PATH REWRITES
    if (isPublicPath) {
        let isMaintenance = true;
        let isSuperAdmin = false;
        try {
            const { data: settingData } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'maintenance_mode')
                .single();
            if (settingData) {
                isMaintenance = settingData.value === 'true';
            }

            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('email', user.email)
                    .single();
                if (profile) {
                    isSuperAdmin = true;
                }
            }
        } catch (e) {
            console.error('Error querying maintenance_mode in middleware:', e);
        }

        if (isMaintenance && !isSuperAdmin) {
            if (url.pathname !== '/landing') {
                url.pathname = '/landing'
                return returnResponse(NextResponse.rewrite(url))
            }
            return supabaseResponse
        } else {
            // Rewrite public paths to /landing internally (Next.js structure)
            const isBio = url.pathname === '/bio' || url.pathname.startsWith('/bio/');
            const rewritePath = isBio 
                ? url.pathname 
                : (url.pathname === '/' ? '/landing' : (url.pathname.startsWith('/landing') ? url.pathname : `/landing${url.pathname}`));
            if (url.pathname !== rewritePath) {
                url.pathname = rewritePath;
                return returnResponse(NextResponse.rewrite(url));
            }
            return supabaseResponse
        }
    }

    // 5. PROTECTED ROUTE ENFORCEMENT
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
        url.pathname.startsWith('/api/soporte/firmar-presupuesto') ||
        url.pathname.startsWith('/t/') ||
        url.pathname.startsWith('/api/tarjetas/') ||
        url.pathname.startsWith('/api/tarjeta/') ||
        isPublicPath; // Public paths are accessible

    if (!user && !isPublicRoute) {
        url.pathname = '/login'
        return returnResponse(NextResponse.redirect(url))
    }

    // 6. MFA Enforcement (AAL2 Check)
    const isPrefetch = request.headers.get('x-middleware-prefetch') === '1' || request.headers.get('purpose') === 'prefetch';
    if (user && !isPrefetch && !url.pathname.startsWith('/auth/mfa') && !url.pathname.startsWith('/auth/callback')) {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const { data: mfaData } = await supabase.auth.mfa.listFactors();
            const hasVerifiedTotp = mfaData?.all?.some(
                (factor) => factor.factor_type === 'totp' && factor.status === 'verified'
            );

            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (hasVerifiedTotp && aalData?.currentLevel === 'aal1') {
                url.pathname = '/auth/mfa';
                return returnResponse(NextResponse.redirect(url));
            }
        }
    }

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
        '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
