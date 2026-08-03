import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = new Set(['/login', '/offline'])

function isTechnicalPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/sanctum/') ||
    pathname === '/broadcasting/auth' ||
    pathname === '/sw-v2.js' ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  )
}

function hasSessionCookie(request: NextRequest): boolean {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const configuredName = process.env.AUTH_SESSION_COOKIE || process.env.SESSION_COOKIE
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim())

  if (configuredName) {
    return cookies.some((cookie) => cookie.startsWith(`${configuredName}=`))
  }

  // The backend cookie name is environment-specific. XSRF-TOKEN is readable
  // by JavaScript and is not authentication, so do not use it as the gate.
  return cookies.some((cookie) => {
    const name = cookie.split('=', 1)[0]
    return Boolean(name) && name !== 'XSRF-TOKEN'
  })
}

function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/login', request.url), 307)
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  if (!hasSessionCookie(request)) return false

  const apiTarget = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL
  if (!apiTarget) return false

  try {
    const authUrl = new URL('/api/v1/auth/me', apiTarget).toString()
    const response = await fetch(authUrl, {
      headers: {
        Accept: 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
        Origin: request.nextUrl.origin,
        Referer: request.url,
      },
      cache: 'no-store',
    })

    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('application/json')) {
      return false
    }

    const payload = (await response.json()) as { user?: { id?: number | string } }
    return Boolean(payload.user?.id)
  } catch {
    // Fail closed when the optional production gate is enabled. The login
    // page remains available so the user can recover from an expired session.
    return false
  }
}

export async function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto')?.toLowerCase() === 'http'
  ) {
    const secureUrl = request.nextUrl.clone()
    secureUrl.protocol = 'https:'

    return NextResponse.redirect(secureUrl, 308)
  }

  const pathname = request.nextUrl.pathname
  const authGateEnabled =
    process.env.NEXT_PUBLIC_AUTH_GATE === 'true' &&
    process.env.NEXT_PUBLIC_SAME_ORIGIN_API === 'true'

  if (
    authGateEnabled &&
    request.method === 'GET' &&
    !PUBLIC_PATHS.has(pathname) &&
    !isTechnicalPath(pathname) &&
    !(await hasValidSession(request))
  ) {
    return redirectToLogin(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
