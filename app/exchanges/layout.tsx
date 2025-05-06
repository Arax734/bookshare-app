"use client";

import "../globals.css";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../contexts/NotificationsContext";

export default function ExchangeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const {
    pendingExchanges: incomingCount,
    refreshPendingExchanges,
    historyExchangesCount: historyCount,
    refreshHistoryExchangesCount,
    outgoingExchangesCount: outgoingCount,
    refreshOutgoingExchangesCount,
  } = useNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchExchangeCounts = async () => {
      try {
        refreshPendingExchanges();
        refreshHistoryExchangesCount();
        refreshOutgoingExchangesCount();
      } catch (error) {
        console.error("Error fetching exchange counts:", error);
      }
    };

    fetchExchangeCounts();
  }, [
    user,
    refreshPendingExchanges,
    refreshHistoryExchangesCount,
    refreshOutgoingExchangesCount,
  ]);

  if (!mounted) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
        <div className="w-full mx-auto">
          <div className="flex flex-col md:flex-row">
            <div className="md:hidden mb-4">
              <div className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] overflow-x-auto">
                <nav className="flex p-1">
                  <Link
                    href="/exchanges"
                    className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-colors flex-1 whitespace-nowrap relative ${
                      pathname === "/exchanges"
                        ? "bg-[var(--primaryColor)] text-white"
                        : "text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                    }`}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    <span className="text-xs">Przychodzące</span>
                    {incomingCount > 0 && mounted && (
                      <div className="absolute -right-1 -top-0.5 bg-red-500 font-bold text-white text-[11px] leading-none rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                        {incomingCount}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/exchanges/outgoing"
                    className={`flex items-center justify-center gap-1 p-2 mx-1 rounded-lg transition-colors flex-1 whitespace-nowrap relative ${
                      pathname === "/exchanges/outgoing"
                        ? "bg-[var(--primaryColor)] text-white"
                        : "text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                    }`}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7h-12m0 0l4-4m-4 4l4 4m0 6h12m0 0l-4-4m4 4l-4 4"
                      />
                    </svg>
                    <span className="text-xs">Wychodzące</span>
                    {outgoingCount > 0 && mounted && (
                      <div className="absolute -right-1 -top-0.5 bg-blue-500 font-bold text-white text-[11px] leading-none rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                        {outgoingCount}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/exchanges/history"
                    className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-colors flex-1 whitespace-nowrap relative ${
                      pathname === "/exchanges/history"
                        ? "bg-[var(--primaryColor)] text-white"
                        : "text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                    }`}
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs">Historia</span>
                    {historyCount > 0 && mounted && (
                      <div className="absolute -right-1 -top-0.5 bg-gray-500 font-bold text-white text-[11px] leading-none rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                        {historyCount}
                      </div>
                    )}
                  </Link>
                </nav>
              </div>
            </div>

            <div className="hidden md:block md:w-60 lg:w-72 shrink-0">
              <div className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] sticky top-24">
                <nav className="flex flex-col p-1">
                  <Link
                    href="/exchanges"
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors relative ${
                      pathname === "/exchanges"
                        ? "bg-[var(--primaryColor)] text-white"
                        : "text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    <span>Przychodzące wymiany</span>
                    {incomingCount > 0 && mounted && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {incomingCount}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/exchanges/outgoing"
                    className={`flex items-center gap-3 p-3 mt-1 rounded-lg transition-colors relative ${
                      pathname === "/exchanges/outgoing"
                        ? "bg-[var(--primaryColor)] text-white"
                        : "text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7h-12m0 0l4-4m-4 4l4 4m0 6h12m0 0l-4-4m4 4l-4 4"
                      />
                    </svg>
                    <span>Wychodzące wymiany</span>
                    {outgoingCount > 0 && mounted && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {outgoingCount}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/exchanges/history"
                    className={`flex items-center gap-3 p-3 mt-1 rounded-lg transition-colors relative ${
                      pathname === "/exchanges/history"
                        ? "bg-[var(--primaryColor)] text-white"
                        : "text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Historia wymian</span>
                    {historyCount > 0 && mounted && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {historyCount}
                      </div>
                    )}
                  </Link>
                </nav>
              </div>
            </div>

            <div className="flex-1 md:pl-6">{children}</div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
