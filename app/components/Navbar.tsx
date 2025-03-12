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

export default function Navbar() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();

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

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Błąd wylogowania:", error);
    }
  };

  const defaultAvatar = "/images/default-avatar.png";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 shadow flex justify-between items-center bg-secondary p-2 px-10">
      <a href="/home" className="flex items-center space-x-3">
        <Image
          src="/bookshare-logo-text.svg"
          alt="BookShare"
          width={150}
          height={75}
          className="max-[500px]:hidden"
        />
        <Image
          src="/bookshare-logo2.svg"
          alt="BookShare"
          width={72}
          height={72}
          className="hidden max-[500px]:block"
        />
      </a>

      <div className="hidden md:flex items-center space-x-6">
        <a
          href="/home"
          className="text-foreground hover:text-primary flex items-center space-x-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 transition-all duration-200"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="font-medium transition-all duration-200">
            Główna
          </span>
        </a>
        <a
          href="/library"
          className="text-foreground hover:text-primary flex items-center space-x-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 transition-all duration-200"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
          <span className="font-medium transition-all duration-200">
            Biblioteka
          </span>
        </a>
        <a
          href="/exchange"
          className="text-foreground hover:text-primary flex items-center space-x-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 transition-all duration-200"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
          </svg>
          <span className="font-medium transition-all duration-200">
            Wymiana
          </span>
        </a>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className="text-foreground hover:text-primary transition-all duration-200 p-2 rounded-full hover:bg-[var(--secondaryColorLight)] dark:hover:bg-gray-700"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <MoonIcon className="h-7 w-7 transition-all duration-200 hover:rotate-12" />
          ) : (
            <SunIcon className="h-7 w-7 transition-all duration-200 hover:rotate-90" />
          )}
        </button>

        <div className="relative">
          {isLoading ? (
            <div className="flex items-center space-x-3 bg-[var(--primaryColor)] rounded-full px-4 py-2 animate-pulse">
              <div className="w-24 h-6 bg-[var(--gray-300)] rounded-full" />
              <div className="relative w-9 h-9 rounded-full overflow-hidden">
                <div className="w-full h-full bg-[var(--gray-300)]" />
              </div>
              <div className="absolute right-3 bottom-2 flex items-center justify-center">
                <div className="w-4 h-4 bg-[var(--gray-300)] rounded-full" />
              </div>
            </div>
          ) : (
            <button
              ref={buttonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-3 hover:bg-[var(--primaryColorLight)] bg-[var(--primaryColor)] rounded-full px-4 py-2 transition-colors duration-200"
            >
              <span className="text-white">
                {user?.displayName || "Użytkownik"}
              </span>
              <div className="relative w-9 h-9 rounded-full overflow-hidden">
                <Image
                  src={user?.photoURL || defaultAvatar}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute right-3 bottom-2 flex items-center justify-center bg-gray-200 rounded-full w-4 h-4">
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
    </nav>
  );
}
