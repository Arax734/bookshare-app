"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { ArrowDownIcon } from "./svg-icons/ArrowDownIcon";
import { UserCircleIcon } from "./svg-icons/UserCircleIcon";
import { LogoutIcon } from "./svg-icons/LogoutIcon";
import { SettingsIcon } from "./svg-icons/SettingsIcon";
import { useTheme } from "../contexts/ThemeContext";
import { SunIcon } from "./svg-icons/SunIcon";
import { MoonIcon } from "./svg-icons/MoonIcon";
import {
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useNotifications } from "../contexts/NotificationsContext";

export default function Navbar() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const [userData, setUserData] = useState<{
    displayName?: string;
    photoURL?: string;
  } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [delayedTooltip, setDelayedTooltip] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const defaultAvatar = "/images/default-avatar.png";
  const { pendingInvites, setPendingInvites } = useNotifications();

  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (activeTooltip) {
      timeoutId = setTimeout(() => {
        setDelayedTooltip(activeTooltip);
      }, 200); // 200ms delay before showing tooltip
    } else {
      setDelayedTooltip(null);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeTooltip]);

  useEffect(() => {
    setIsImageLoaded(false);
    setAvatarError(false);
  }, [userData?.photoURL]);

  useEffect(() => {
    const fetchPendingInvites = async () => {
      if (!user) return;

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

  const handleLogout = async () => {
    try {
      await logout();
      // Remove the session cookie
      await fetch("/api/auth/session", {
        method: "DELETE",
      });
      router.push("/login");
    } catch (error) {
      console.error("Błąd wylogowania:", error);
    }
  };

  // Show loading skeleton if loading or no user
  const showSkeleton = isLoading || !user;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 shadow bg-secondary"
      id="mainNav"
    >
      {/* Absolute positioned logo section */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2">
        <a href="/home" className="flex items-center space-x-3">
          <Image
            src="/bookshare-logo-text.svg"
            alt="BookShare"
            width={105}
            height={75}
            className="max-[500px]:hidden m-1"
          />
          <Image
            src="/bookshare-logo2.svg"
            alt="BookShare"
            width={68}
            height={68}
            className="hidden max-[500px]:block m-1"
          />
        </a>
      </div>

      {/* Centered navigation */}
      <div className="flex justify-center items-center h-full">
        <div className="hidden md:flex items-center h-full space-x-4">
          <div className="relative h-5/6">
            <a
              href="/home"
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-primary hover:bg-[var(--secondaryColorLight)] dark:hover:bg-gray-700 transition-all duration-200"
              onMouseEnter={() => setActiveTooltip("home")}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </a>
            {delayedTooltip === "home" && (
              <div
                className="absolute -bottom-10 left-1/2 bg-[var(--foreground)] text-[var(--background)] 
                px-4 py-1.5 rounded-full text-sm whitespace-nowrap shadow-lg opacity-0
                animate-[tooltipAppear_0.2s_ease-out_forwards]"
              >
                Główna
              </div>
            )}
          </div>

          <div className="relative h-5/6">
            <a
              href="/library"
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-primary hover:bg-[var(--secondaryColorLight)] dark:hover:bg-gray-700 transition-all duration-200"
              onMouseEnter={() => setActiveTooltip("library")}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </a>
            {delayedTooltip === "library" && (
              <div
                className="absolute -bottom-10 left-1/2 bg-[var(--foreground)] text-[var(--background)] 
                px-4 py-1.5 rounded-full text-sm whitespace-nowrap shadow opacity-0
                animate-[tooltipAppear_0.2s_ease-out_forwards]"
              >
                Biblioteka
              </div>
            )}
          </div>

          <div className="relative h-5/6">
            <a
              href="/exchange"
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-primary hover:bg-[var(--secondaryColorLight)] dark:hover:bg-gray-700 transition-all duration-200"
              onMouseEnter={() => setActiveTooltip("exchange")}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
              </svg>
            </a>
            {delayedTooltip === "exchange" && (
              <div
                className="absolute -bottom-10 left-1/2 bg-[var(--foreground)] text-[var(--background)] 
                px-4 py-1.5 rounded-full text-sm whitespace-nowrap shadow-lg opacity-0
                animate-[tooltipAppear_0.2s_ease-out_forwards]"
              >
                Wymiana
              </div>
            )}
          </div>

          <div className="relative h-5/6">
            <a
              href="/contacts"
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-primary hover:bg-[var(--secondaryColorLight)] dark:hover:bg-gray-700 transition-all duration-200 relative"
              onMouseEnter={() => setActiveTooltip("contacts")}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {pendingInvites > 0 && (
                <div className="absolute top-6 right-5 bg-red-500 text-white text-xs font-medium w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingInvites}
                </div>
              )}
            </a>
            {delayedTooltip === "contacts" && (
              <div
                className="absolute -bottom-10 left-1/2 bg-[var(--foreground)] text-[var(--background)] 
                px-4 py-1.5 rounded-full text-sm whitespace-nowrap shadow-lg opacity-0
                animate-[tooltipAppear_0.2s_ease-out_forwards]"
              >
                Kontakty
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Absolute positioned right section */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2">
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            className="text-foreground hover:text-primary transition-all duration-200 p-2 mr-5 rounded-full hover:bg-[var(--secondaryColorLight)] dark:hover:bg-gray-700"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <MoonIcon className="h-7 w-7 transition-all duration-200 hover:rotate-12" />
            ) : (
              <SunIcon className="h-7 w-7 transition-all duration-200 hover:rotate-90" />
            )}
          </button>

          <div className="relative">
            {showSkeleton ? (
              <div className="flex items-center space-x-3 bg-[var(--primaryColor)] h-11 rounded-full px-4 py-2 animate-pulse">
                {/* Name placeholder */}
                <div className="w-24 h-5 bg-[var(--gray-300)] rounded-full" />

                {/* Avatar placeholder */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-[var(--gray-300)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-[var(--gray-400)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>

                {/* Arrow placeholder */}
                <div className="absolute right-3 bottom-1 flex items-center justify-center">
                  <div className="w-4 h-4 bg-[var(--gray-300)] rounded-full" />
                </div>
              </div>
            ) : (
              <button
                ref={buttonRef}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-3 hover:bg-[var(--primaryColorLight)] bg-[var(--primaryColor)] h-11 rounded-full px-4 py-2 transition-colors duration-200"
              >
                <span className="text-white text-base">
                  {userData?.displayName || user?.displayName || "Użytkownik"}
                </span>
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={userData?.photoURL || defaultAvatar}
                    alt="Profile"
                    fill
                    className="object-cover"
                    priority
                    sizes="32px"
                    quality={100}
                    loading="eager"
                  />
                </div>
                <div className="absolute right-3 bottom-1 flex items-center justify-center bg-gray-200 rounded-full w-4 h-4">
                  <ArrowDownIcon width={10} height={10} fill="black" />
                </div>
              </button>
            )}

            <div
              ref={menuRef}
              className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-lg bg-[var(--menuColor)] ring-1 ring-black/5 overflow-hidden transition-all duration-200 ease-in-out origin-top ${
                isMenuOpen
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
              }`}
            >
              <div className="py-1">
                <a
                  href={user ? `/users/${user.uid}` : "/login"}
                  className="flex items-center px-4 py-3 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors duration-200 ease-in-out"
                >
                  <UserCircleIcon width={20} height={20} className="mr-3" />
                  <span className="font-medium">Profil</span>
                </a>
                <a
                  href="/settings"
                  className="flex items-center px-4 py-3 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors duration-200 ease-in-out"
                >
                  <SettingsIcon width={20} height={20} className="mr-3" />
                  <span className="font-medium">Ustawienia</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors duration-200 ease-in-out"
                >
                  <LogoutIcon width={20} height={20} className="mr-3" />
                  <span className="font-medium">Wyloguj się</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
