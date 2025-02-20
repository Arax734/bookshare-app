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
    <main className="container mx-auto px-4 py-8 bg-[var(--background)]">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          Ustawienia profilu
        </h1>

        {/* General Settings Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-foreground">
            Ustawienia ogólne
          </h2>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-md">
              <Image
                src={user?.photoURL || "/default-avatar.png"}
                alt="Profile"
                fill
                className="object-cover shadow"
              />
            </div>
            <button className="px-4 py-2 text-sm bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-full transition-colors duration-200 shadow-sm hover:shadow">
              Zmień zdjęcie
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-600)] mb-1">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  placeholder={user?.displayName || ""}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-600)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-600)] mb-1">
                  Numer telefonu
                </label>
                <input
                  type="tel"
                  defaultValue={user?.phoneNumber || ""}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-600)] mb-1">
                  Bio
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)]"
                  placeholder="Napisz coś o sobie..."
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-xl transition-colors duration-200 shadow-sm hover:shadow"
                >
                  Zapisz zmiany
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Security Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">
            Bezpieczeństwo
          </h2>
          <div className="space-y-4">
            <button className="w-full px-4 py-3 text-left text-white bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] rounded-xl transition-colors duration-200 shadow-sm hover:shadow flex items-center justify-between">
              <span>Zmień hasło</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button className="w-full px-4 py-3 text-left text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors duration-200 shadow-sm hover:shadow flex items-center justify-between group">
              <span>Usuń konto</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
