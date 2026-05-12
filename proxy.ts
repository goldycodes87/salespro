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
  const onboardingExempt =
    pathname === '/onboarding' ||
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

  // Admin redirect from /dashboard
  if (user && pathname === '/dashboard') {
    const isAdmin = request.cookies.get('clozr_admin')?.value === 'true'
    if (isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
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
