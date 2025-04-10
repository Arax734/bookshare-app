"use client";

import "../globals.css";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useNotifications } from "../contexts/NotificationsContext";

export default function ContactsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    pendingInvites,
    setPendingInvites,
    acceptedContactsCount,
    setAcceptedContactsCount,
  } = useNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchPendingInvites = async () => {
      const q = query(
        collection(db, "userContacts"),
        where("contactId", "==", user.uid),
        where("status", "==", "pending")
      );

      const querySnapshot = await getDocs(q);
      setPendingInvites(querySnapshot.size);
    };

    fetchPendingInvites();
  }, [user, setPendingInvites]);

  useEffect(() => {
    if (!user) return;

    const fetchAcceptedContacts = async () => {
      const q1 = query(
        collection(db, "userContacts"),
        where("userId", "==", user.uid),
        where("status", "==", "accepted")
      );
      const q2 = query(
        collection(db, "userContacts"),
        where("contactId", "==", user.uid),
        where("status", "==", "accepted")
      );

      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
      ]);

      setAcceptedContactsCount(snapshot1.size + snapshot2.size);
    };

    fetchAcceptedContacts();
  }, [user, setAcceptedContactsCount]);

  if (!mounted) {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-[var(--background)] p-4 sm:p-6">
        <div className="w-full mx-auto">
          {/* Responsive layout that changes from column to row based on screen size */}
          <div className="flex flex-col md:flex-row">
            {/* Mobile navigation (visible only on small screens) */}
            <div className="md:hidden mb-4">
              <div className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] overflow-x-auto">
                <nav className="flex p-1">
                  <Link
                    href="/contacts"
                    className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-colors flex-1 whitespace-nowrap relative ${
                      pathname === "/contacts"
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span className="text-xs">Kontakty</span>
                    {acceptedContactsCount > 0 && mounted && (
                      <div className="absolute -right-1 -top-0.5 bg-green-500 font-bold text-white text-[11px] leading-none rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                        {acceptedContactsCount}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/contacts/invites"
                    className={`flex items-center justify-center gap-1 p-2 mx-1 rounded-lg transition-colors flex-1 whitespace-nowrap relative ${
                      pathname === "/contacts/invites"
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    <span className="text-xs">Zaproszenia</span>

                    {pendingInvites > 0 && mounted && (
                      <div className="absolute -right-1 -top-0.5 bg-red-500 font-bold text-white text-[11px] leading-none rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                        {pendingInvites}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/contacts/search"
                    className={`flex items-center justify-center gap-1 p-2 rounded-lg transition-colors flex-1 whitespace-nowrap ${
                      pathname === "/contacts/search"
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span className="text-xs">Szukaj</span>
                  </Link>
                </nav>
              </div>
            </div>

            {/* Desktop sidebar (hidden on mobile) */}
            <div className="hidden md:block md:w-60 lg:w-72 shrink-0">
              <div className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] sticky top-24">
                <nav className="flex flex-col p-1">
                  {/* Same as your original sidebar links */}
                  <Link
                    href="/contacts"
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors relative ${
                      pathname === "/contacts"
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span>Twoje kontakty</span>
                    {acceptedContactsCount > 0 && mounted && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {acceptedContactsCount}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/contacts/invites"
                    className={`flex items-center gap-3 p-3 mt-1 rounded-lg transition-colors relative ${
                      pathname === "/contacts/invites"
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    <span>Zaproszenia</span>
                    {pendingInvites > 0 && mounted && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {pendingInvites}
                      </div>
                    )}
                  </Link>

                  <Link
                    href="/contacts/search"
                    className={`flex items-center gap-3 p-3 mt-1 rounded-lg transition-colors ${
                      pathname === "/contacts/search"
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>Wyszukaj znajomych</span>
                  </Link>
                </nav>
              </div>
            </div>

            {/* Main content area - add responsive padding */}
            <div className="flex-1 md:pl-6">{children}</div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
