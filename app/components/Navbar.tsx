"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Błąd wylogowania:", error);
    }
  };

  return (
    <nav className="flex justify-between items-center bg-[var(--secondaryColor)] p-2 px-4">
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

      <button
        onClick={handleLogout}
        className="text-white bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] px-4 py-2 rounded-3xl transition-colors duration-200"
      >
        Wyloguj się
      </button>
    </nav>
  );
}
