import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value;
  const { pathname } = request.nextUrl;

  // If there's a user ID, they are "logged in"
  if (userId) {
    // If a logged-in user tries to access the login page, redirect them to their dashboard
    if (pathname === '/') {
      // We can't know the user's role here without a DB call, so we default to dashboard.
      // The dashboard or admin layout will handle the final redirection if needed.
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } else {
    // If there's no user ID and they are trying to access a protected route
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      // Redirect them to the login page
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
