"use client";

import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";

export default function Settings() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Ustawienia profilu</h1>

        <div className="bg-[var(--secondaryColorLight)] rounded-2xl shadow p-6 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative w-20 h-20 rounded-full overflow-hidden">
              <Image
                src={user?.photoURL || "/default-avatar.png"}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
            <button className="px-4 py-2 text-sm bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-full transition-colors duration-200">
              Zmień zdjęcie
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  defaultValue={user?.displayName || ""}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numer telefonu
                </label>
                <input
                  type="tel"
                  defaultValue={user?.phoneNumber || ""}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)]"
                  placeholder="Napisz coś o sobie..."
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-full transition-colors duration-200"
                >
                  Zapisz zmiany
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-[var(--secondaryColorLight)] rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Bezpieczeństwo</h2>
          <div className="space-y-4">
            <button className="w-full px-4 py-2 text-left text-white bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] rounded-xl transition-colors duration-200">
              Zmień hasło
            </button>
            <button className="w-full px-4 py-2 text-left text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors duration-200">
              Usuń konto
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
