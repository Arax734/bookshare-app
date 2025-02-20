"use client";

import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";

interface LoadingWrapperProps {
  children: React.ReactNode;
  loadingComponent: React.ReactNode;
}

export default function LoadingWrapper({
  children,
  loadingComponent,
}: LoadingWrapperProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return loadingComponent;
  }

  return children;
}
