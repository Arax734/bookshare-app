"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { ArrowDownIcon } from "./svg-icons/ArrowDownIcon";
import { UserCircleIcon } from "./svg-icons/UserCircleIcon";
import { LogoutIcon } from "./svg-icons/LogoutIcon";
import { SettingsIcon } from "./svg-icons/SettingsIcon";
import { MenuIcon } from "./svg-icons/MenuIcon";
import { CloseIcon } from "./svg-icons/CloseIcon";
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
  const defaultAvatar = "/images/default-avatar.png";
  const { pendingInvites, setPendingInvites } = useNotifications();
  // Add mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add useEffect to handle body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [mobileMenuOpen]);

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
      }, 200);
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
      await fetch("/api/auth/session", {
        method: "DELETE",
      });
      router.push("/login");
    } catch (error) {
      console.error("Błąd wylogowania:", error);
    }
  };

  const showSkeleton = isLoading || !user;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 shadow bg-secondary"
      id="mainNav"
    >
      {/* Logo - adjust position for mobile */}
      <div className="absolute left-3 sm:left-6 md:left-10 top-1/2 -translate-y-1/2">
        <a href="/home" className="flex items-center space-x-3">
          <Image
            src="/bookshare-logo-text.svg"
            alt="BookShare"
            width={105}
            height={75}
            className="max-sm:hidden m-1"
          />
          <Image
            src="/bookshare-logo2.svg"
            alt="BookShare"
            width={42}
            height={42}
            className="hidden max-sm:block m-1"
          />
        </a>
      </div>

      {/* Desktop Navigation - hidden on mobile */}
      <div className="flex justify-center items-center h-full">
        <div className="hidden md:flex items-center h-full space-x-4">
          <div className="relative h-5/6">
            <a
              href="/home"
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-[var(--primaryColorHover)] hover:bg-[var(--secondaryColorLight)]  transition-all duration-200"
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
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-[var(--primaryColorHover)] hover:bg-[var(--secondaryColorLight)]  transition-all duration-200"
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
  px-4 py-1.5 rounded-full text-sm whitespace-nowrap shadow-lg opacity-0
  animate-[tooltipAppear_0.2s_ease-out_forwards]"
              >
                Biblioteka
              </div>
            )}
          </div>

          <div className="relative h-5/6">
            <a
              href={user ? `/bookshelf` : "/login"}
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-[var(--primaryColorHover)] hover:bg-[var(--secondaryColorLight)]  transition-all duration-200"
              onMouseEnter={() => setActiveTooltip("bookshelf")}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 512 512"
                fill="currentColor"
              >
                <g>
                  <path d="M259.031,156.638c-0.009-8.693-0.009-16.24,1.061-23.4l-6.258,7.169 c-10.95,12.627-38.637,20.788-61.835,18.237c-23.215-2.561-33.138-14.859-22.179-27.494l82.473-86.306 c1.601-1.684,2.055-4.161,1.138-6.301c-0.91-2.123-3.016-3.521-5.341-3.521h-13.283c-3.892,0-7.614,1.55-10.336,4.33 l-71.548,72.499c-14.681,15.365-13.999,23.898-13.999,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.758,37.417,48.964,39.96 c23.207,2.57,54.996-5.61,65.946-18.228l7.287-8.474c-1.306-4.228-2.089-8.642-2.089-13.258V156.638z" />
                  <path d="M120.113,156.638c-0.009-8.693-0.009-16.24,1.062-23.4l-6.267,7.169 c-10.95,12.627-38.629,20.788-61.835,18.237c-23.207-2.561-33.138-14.859-22.179-27.494l82.481-86.306 c1.591-1.684,2.054-4.161,1.137-6.301c-0.91-2.123-3.016-3.521-5.34-3.521H95.879c-3.883,0-7.597,1.55-10.326,4.33l-71.548,72.499 c-14.682,15.365-14,23.898-14,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.75,37.417,48.965,39.96 c23.197,2.57,54.988-5.61,65.938-18.228l7.303-8.474c-1.314-4.228-2.098-8.642-2.098-13.258V156.638z" />
                  <path d="M506.197,35.022h-14.379c-4.195,0-8.188,1.82-10.951,4.978l-87.51,100.406 c-10.95,12.627-38.638,20.788-61.835,18.237c-23.215-2.561-33.137-14.859-22.179-27.494l82.473-86.306 c1.601-1.684,2.055-4.161,1.145-6.301c-0.918-2.123-3.024-3.521-5.34-3.521H374.33c-3.883,0-7.607,1.55-10.336,4.33l-71.548,72.499 c-14.682,15.365-13.999,23.898-13.999,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.758,37.417,48.964,39.96 c23.214,2.57,54.996-5.61,65.946-18.228L501.454,332.72c6.806-7.918,10.546-17.992,10.546-28.42V40.826 C512,37.625,509.397,35.022,506.197,35.022z" />
                </g>
              </svg>
            </a>
            {delayedTooltip === "bookshelf" && (
              <div
                className="absolute -bottom-10 left-1/2 bg-[var(--foreground)] text-[var(--background)] 
      px-4 py-1.5 rounded-full text-sm whitespace-nowrap shadow-lg opacity-0
      animate-[tooltipAppear_0.2s_ease-out_forwards]"
              >
                Moja półka
              </div>
            )}
          </div>
          <div className="relative h-5/6">
            <a
              href="/contacts"
              className="rounded-xl flex items-center justify-center h-full px-6 text-foreground hover:text-[var(--primaryColorHover)] hover:bg-[var(--secondaryColorLight)] transition-all duration-200 relative"
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

      {/* Right side elements - adjust for mobile */}
      <div className="absolute right-3 sm:right-6 md:right-10 top-1/2 -translate-y-1/2 flex items-center">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="text-foreground hover:text-[var(--primaryColorHover)] transition-colors duration-200 p-1.5 md:p-2 mr-2 md:mr-5 rounded-full hover:bg-[var(--secondaryColorLight)]"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <MoonIcon className="h-6 w-6 md:h-7 md:w-7 transition-all duration-200 hover:rotate-12" />
          ) : (
            <SunIcon className="h-6 w-6 md:h-7 md:w-7 transition-all duration-200 hover:rotate-90" />
          )}
        </button>

        {/* Mobile menu toggle - only visible on mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[var(--foreground)] p-1.5 rounded-full hover:bg-[var(--secondaryColorLight)] transition-colors mr-2"
          aria-label="Toggle mobile menu"
        >
          <MenuIcon className="h-6 w-6" />
        </button>

        {/* User profile - adjusted for mobile */}
        <div className="relative">
          {showSkeleton ? (
            <div className="flex items-center space-x-2 sm:space-x-3 bg-[var(--primaryColor)] h-9 md:h-11 rounded-full px-2 sm:px-3 md:px-4 py-2 animate-pulse">
              <div className="w-16 md:w-24 h-5 bg-[var(--gray-300)] rounded-full hidden sm:block" />
              <div className="relative w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full overflow-hidden">
                <div className="w-full h-full bg-[var(--gray-300)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-[var(--gray-400)] border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            </div>
          ) : (
            <button
              ref={buttonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hidden md:flex items-center space-x-2 sm:space-x-3 hover:bg-[var(--primaryColorHover)] bg-[var(--primaryColor)] h-9 md:h-11 rounded-full px-2 sm:px-3 md:px-4 py-2 transition-colors duration-200"
            >
              <span className="text-white text-sm md:text-base hidden sm:block">
                {userData?.displayName || user?.displayName || "Użytkownik"}
              </span>
              <div className="relative w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full overflow-hidden">
                <Image
                  src={userData?.photoURL || defaultAvatar}
                  alt="Profile"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 640px) 24px, (max-width: 768px) 28px, 32px"
                  quality={100}
                  loading="eager"
                />
              </div>
              <div className="absolute right-2 md:right-3 bottom-1 flex items-center justify-center bg-gray-200 rounded-full w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 sm:flex">
                <ArrowDownIcon width={8} height={8} fill="var(--text-black)" />
              </div>
            </button>
          )}

          {/* User dropdown menu - same as before */}
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
                className="flex items-center px-4 py-3 text-sm text-[var(--gray-700)] hover:bg-[var(--menuColorHover)] transition-colors duration-200 ease-in-out"
              >
                <UserCircleIcon width={20} height={20} className="mr-3" />
                <span className="font-medium">Profil</span>
              </a>
              <a
                href="/settings"
                className="flex items-center px-4 py-3 text-sm text-[var(--gray-700)] hover:bg-[var(--menuColorHover)] transition-colors duration-200 ease-in-out"
              >
                <SettingsIcon width={20} height={20} className="mr-3" />
                <span className="font-medium">Ustawienia</span>
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-sm text-[var(--gray-700)] hover:bg-[var(--menuColorHover)] transition-colors duration-200 ease-in-out"
              >
                <LogoutIcon width={20} height={20} className="mr-3" />
                <span className="font-medium">Wyloguj się</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay - darkens the background when menu is open */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 z-40 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Panel - slides in from right */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-72 bg-[var(--card-background)] shadow-xl md:hidden z-50 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        } overflow-y-auto`}
      >
        {/* Mobile Menu Header */}
        <div className="p-4 border-b border-[var(--gray-100)] flex justify-between items-center">
          <h2 className="text-lg font-medium text-[var(--foreground)]">Menu</h2>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-[var(--foreground)] p-1.5 rounded-lg hover:bg-[var(--gray-100)]"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {/* User Profile Section in Mobile Menu */}
        {user && (
          <div className="p-4 border-b border-[var(--gray-100)]">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={userData?.photoURL || defaultAvatar}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div>
                <div className="font-medium text-[var(--foreground)]">
                  {userData?.displayName || user?.displayName || "Użytkownik"}
                </div>
                <div className="text-xs text-[var(--gray-500)]">
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation Links */}
        <div className="p-4 space-y-3">
          <a
            href="/home"
            className="flex items-center space-x-3 text-[var(--foreground)] p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="var(--foreground)"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="font-medium">Główna</span>
          </a>

          <a
            href="/library"
            className="flex items-center space-x-3 text-[var(--foreground)] p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="var(--foreground)"
            >
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            <span className="font-medium">Biblioteka</span>
          </a>

          <a
            href={user ? `/bookshelf` : "/login"}
            className="flex items-center space-x-3 text-[var(--foreground)] p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 512 512"
              fill="var(--foreground)"
            >
              <g>
                <path d="M259.031,156.638c-0.009-8.693-0.009-16.24,1.061-23.4l-6.258,7.169 c-10.95,12.627-38.637,20.788-61.835,18.237c-23.215-2.561-33.138-14.859-22.179-27.494l82.473-86.306 c1.601-1.684,2.055-4.161,1.138-6.301c-0.91-2.123-3.016-3.521-5.341-3.521h-13.283c-3.892,0-7.614,1.55-10.336,4.33 l-71.548,72.499c-14.681,15.365-13.999,23.898-13.999,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.758,37.417,48.964,39.96 c23.207,2.57,54.996-5.61,65.946-18.228l7.287-8.474c-1.306-4.228-2.089-8.642-2.089-13.258V156.638z" />
                <path d="M120.113,156.638c-0.009-8.693-0.009-16.24,1.062-23.4l-6.267,7.169 c-10.95,12.627-38.629,20.788-61.835,18.237c-23.207-2.561-33.138-14.859-22.179-27.494l82.481-86.306 c1.591-1.684,2.054-4.161,1.137-6.301c-0.91-2.123-3.016-3.521-5.34-3.521H95.879c-3.883,0-7.597,1.55-10.326,4.33l-71.548,72.499 c-14.682,15.365-14,23.898-14,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.75,37.417,48.965,39.96 c23.197,2.57,54.988-5.61,65.938-18.228l7.303-8.474c-1.314-4.228-2.098-8.642-2.098-13.258V156.638z" />
                <path d="M506.197,35.022h-14.379c-4.195,0-8.188,1.82-10.951,4.978l-87.51,100.406 c-10.95,12.627-38.638,20.788-61.835,18.237c-23.215-2.561-33.137-14.859-22.179-27.494l82.473-86.306 c1.601-1.684,2.055-4.161,1.145-6.301c-0.918-2.123-3.024-3.521-5.34-3.521H374.33c-3.883,0-7.607,1.55-10.336,4.33l-71.548,72.499 c-14.682,15.365-13.999,23.898-13.999,47.802c0,17.066,0,276.892,0,276.892c0,20.494,25.758,37.417,48.964,39.96 c23.214,2.57,54.996-5.61,65.946-18.228L501.454,332.72c6.806-7.918,10.546-17.992,10.546-28.42V40.826 C512,37.625,509.397,35.022,506.197,35.022z" />
              </g>
            </svg>
            <span className="font-medium">Moja półka</span>
          </a>

          <a
            href="/contacts"
            className="flex items-center space-x-3 text-[var(--foreground)] p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors relative"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="var(--foreground)"
            >
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <span className="font-medium">Kontakty</span>
            {pendingInvites > 0 && (
              <div className="absolute left-7 top-2 bg-[var(--danger)] text-[var(--danger-text)] text-xs font-medium w-4 h-4 rounded-full flex items-center justify-center">
                {pendingInvites}
              </div>
            )}
          </a>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--gray-100)] my-2"></div>

        {/* Account Actions */}
        <div className="p-4 space-y-3">
          {user && (
            <>
              <a
                href={`/users/${user.uid}`}
                className="flex items-center space-x-3 text-[var(--foreground)] p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserCircleIcon width={20} height={20} />
                <span className="font-medium">Profil</span>
              </a>
              <a
                href="/settings"
                className="flex items-center space-x-3 text-[var(--foreground)] p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <SettingsIcon width={20} height={20} />
                <span className="font-medium">Ustawienia</span>
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full space-x-3 text-[var(--foreground)] p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors text-left"
              >
                <LogoutIcon width={20} height={20} />
                <span className="font-medium">Wyloguj się</span>
              </button>
            </>
          )}

          {/* Theme toggle in mobile menu */}
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--gray-100)] transition-colors">
            <span className="font-medium text-[var(--foreground)]">
              Tryb ciemny
            </span>
            <button
              onClick={toggleTheme}
              className="text-[var(--foreground)] hover:text-[var(--primaryColorHover)] p-1 rounded-full"
            >
              {theme === "light" ? (
                <MoonIcon className="h-6 w-6" />
              ) : (
                <SunIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
