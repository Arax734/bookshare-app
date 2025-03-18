import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected and auth routes
const protectedRoutes = ["/home", "/library", "/settings"];
const authRoutes = ["/login", "/"];

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("firebase-session-token");
  const path = request.nextUrl.pathname;

  // Check if the current path is protected or auth route
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => path === route);

  // Handle protected routes
  if (isProtectedRoute) {
    if (!session?.value) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("firebase-session-token");
      return response;
    }
  }

  // Handle auth routes (login and register)
  if (isAuthRoute && session?.value) {
    // Redirect to home if user is already authenticated
    return NextResponse.redirect(new URL("/home", request.url));
  }

  try {
    return NextResponse.next();
  } catch (error) {
    console.error("Auth error:", error);
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("firebase-session-token");
    return response;
  }
}

export const config = {
  matcher: [
    "/home/:path*",
    "/library/:path*",
    "/settings/:path*",
    "/login",
    "/",
  ],
};
