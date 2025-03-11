"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export default function Profile() {
  const { user } = useAuth();
  const defaultAvatar = "/images/default-avatar.png";
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primaryColor)]"></div>
      </div>
    );
  }

  return (
    <main className="mx-auto px-4 py-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
            <h2 className="text-xl font-bold">Profil użytkownika</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Profile Image */}
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden">
                <Image
                  src={user?.photoURL || defaultAvatar}
                  alt="Profile"
                  fill
                  className="object-cover shadow-lg transition-shadow duration-200"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left transition-all duration-200">
                <h1 className="text-2xl font-bold text-[var(--gray-800)] transition-colors duration-200">
                  {user?.displayName || "Użytkownik"}
                </h1>
                <p className="text-[var(--gray-500)] text-sm font-medium mt-1 transition-colors duration-200">
                  Dołączył(a):{" "}
                  {user?.metadata.creationTime
                    ? format(
                        new Date(user.metadata.creationTime),
                        "d MMMM yyyy",
                        {
                          locale: pl,
                        }
                      )
                    : "Data niedostępna"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden mt-8 transition-all duration-200">
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
            <h2 className="text-xl font-bold">Dane kontaktowe</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="transition-colors duration-200">
                <label className="block text-sm font-semibold text-[var(--foreground)] transition-colors duration-200">
                  Email
                </label>
                <p className="mt-1 text-[var(--gray-800)] transition-colors duration-200">
                  {user?.email}
                </p>
              </div>
              <div className="transition-colors duration-200">
                <label className="block text-sm font-semibold text-[var(--foreground)] transition-colors duration-200">
                  Telefon
                </label>
                <p className="mt-1 text-[var(--gray-800)] transition-colors duration-200">
                  {user?.phoneNumber || "Nie podano"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden mt-8 transition-all duration-200">
          <div className="bg-gradient-to-r from-[var(--primaryColorLight)] to-[var(--primaryColor)] p-4 text-white">
            <h2 className="text-xl font-bold">Statystyki</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["Książek", "Recenzji", "Obserwujących", "Obserwowanych"].map(
                (label) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center text-center p-4 bg-[var(--secondaryColorLight)] rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 hover:cursor-pointer"
                  >
                    <p className="text-2xl font-bold text-[var(--primaryColor)] transition-colors duration-200">
                      0
                    </p>
                    <p className="text-sm font-semibold text-[var(--gray-800)] transition-colors duration-200">
                      {label}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
