import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Check if rep account has been deactivated (skip on API/static routes)
  let isDeactivated = false
  if (
    user &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next/') &&
    pathname !== '/login'
  ) {
    try {
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { cookies: { getAll: () => [], setAll: () => {} } },
      )
      const { data: rep } = await adminSupabase
        .from('reps')
        .select('active')
        .eq('id', user.id)
        .single()
      isDeactivated = rep?.active === false
    } catch {
      // If check fails, don't block access
    }
  }

  if (isDeactivated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('deactivated', '1')
    return NextResponse.redirect(url)
  }

  // Public paths — no auth required
  const publicPaths = ['/', '/login', '/signup']
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/coaches/') ||
    pathname.startsWith('/_next/')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const isAdmin = request.cookies.get('clozr_admin')?.value === 'true'
    const onboarded = request.cookies.get('clozr_onboarded')?.value
    const url = request.nextUrl.clone()
    if (!onboarded) {
      url.pathname = '/onboarding'
    } else if (isAdmin) {
      url.pathname = '/admin'
    } else {
      url.pathname = '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  // Onboarding gate: authenticated but not onboarded
  // Admins bypass this — they may have been provisioned before the onboarding flow existed
  const isAdmin = request.cookies.get('clozr_admin')?.value === 'true'

  const onboardingExempt =
    isAdmin ||
    pathname === '/onboarding' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/coaches/') ||
    pathname.startsWith('/_next/')

  if (user && !onboardingExempt) {
    const onboarded = request.cookies.get('clozr_onboarded')?.value
    if (!onboarded) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
