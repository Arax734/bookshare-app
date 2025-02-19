"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import { ArrowDownIcon } from "./svg-icons/ArrowDownIcon";

export default function Navbar() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <nav className="flex justify-between items-center bg-[var(--secondaryColor)] p-2 px-10">
      <div>
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
      </div>

      <div className="relative">
        <button
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

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Profil
              </a>
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Ustawienia
              </a>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Wyloguj się
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
