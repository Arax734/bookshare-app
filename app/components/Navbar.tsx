"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { ArrowDownIcon } from "./svg-icons/ArrowDownIcon";
import { UserCircleIcon } from "./svg-icons/UserCircleIcon";
import { LogoutIcon } from "./svg-icons/LogoutIcon";
import { SettingsIcon } from "./svg-icons/SettingsIcon";

export default function Navbar() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    <nav className="shadow flex justify-between items-center bg-[var(--secondaryColor)] p-2 px-10">
      <a href="/home" className="flex items-center space-x-3">
        <Image
          src="/bookshare-logo-text.svg"
          alt="BookShare"
          width={150}
          height={50}
        />
        <Image
          className="hidden"
          src="/bookshare-logo.svg"
          alt="BookShare"
          width={150}
          height={150}
        />
      </a>

      <div className="relative">
        {!isLoading && (
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
          className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-lg bg-white ring-1 ring-black/5 overflow-hidden transition-all duration-200 ease-in-out origin-top ${
            isMenuOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="py-1">
            <a
              href="/profile"
              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition-colors duration-200 ease-in-out"
            >
              <UserCircleIcon width={20} height={20} className="mr-3" />
              <span className="font-medium">Profil</span>
            </a>
            <a
              href="/settings"
              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition-colors duration-200 ease-in-out"
            >
              <SettingsIcon width={20} height={20} className="mr-3" />
              <span className="font-medium">Ustawienia</span>
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition-colors duration-200 ease-in-out"
            >
              <LogoutIcon width={20} height={20} className="mr-3" />
              <span className="font-medium">Wyloguj się</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
