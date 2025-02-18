"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Get current path
      const path = window.location.pathname;

      if (user) {
        // User is logged in
        if (path === "/" || path === "/login") {
          router.push("/home");
        }
      } else {
        // User is not logged in
        if (path !== "/" && path !== "/login") {
          router.push("/login");
        }
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return <>{children}</>;
};
