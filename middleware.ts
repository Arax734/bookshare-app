import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

// Define protected routes
const protectedRoutes = ["/home", "/library", "/settings"];

export async function middleware(request: NextRequest) {
  // Get Firebase Auth session cookie
  const session = request.cookies.get("firebase-session-token");
  const path = request.nextUrl.pathname;

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );

  if (isProtectedRoute) {
    if (!session?.value) {
      // No session found, redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));

      // Clear any invalid cookies
      response.cookies.delete("firebase-session-token");

      return response;
    }

    try {
      // Allow access to protected route
      return NextResponse.next();
    } catch (error) {
      // Invalid or expired token
      console.error("Auth error:", error);
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("firebase-session-token");
      return response;
    }
  }

  // Not a protected route, allow access
  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/library/:path*", "/settings/:path*"],
};
