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
      <main className="container mx-auto px-4 py-8 bg-[var(--background)] transition-all duration-200">
        <div className="max-w-2xl mx-auto">
          {/* Profile Header Card Skeleton */}
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 animate-pulse">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Profile Image Skeleton */}
              <div className="w-32 h-32 rounded-2xl bg-[var(--gray-200)]" />
              {/* Profile Info Skeleton */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="h-8 w-48 bg-[var(--gray-200)] rounded-lg mx-auto md:mx-0" />
                <div className="h-5 w-36 bg-[var(--gray-200)] rounded mx-auto md:mx-0" />
              </div>
            </div>
          </div>

          {/* Contact Information Card Skeleton */}
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 animate-pulse">
            <div className="h-7 w-40 bg-[var(--gray-200)] rounded mb-4" />
            <div className="space-y-4">
              <div>
                <div className="h-5 w-20 bg-[var(--gray-200)] rounded mb-2" />
                <div className="h-6 w-48 bg-[var(--gray-200)] rounded" />
              </div>
              <div>
                <div className="h-5 w-24 bg-[var(--gray-200)] rounded mb-2" />
                <div className="h-6 w-32 bg-[var(--gray-200)] rounded" />
              </div>
            </div>
          </div>

          {/* Statistics Card Skeleton */}
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 animate-pulse">
            <div className="h-7 w-32 bg-[var(--gray-200)] rounded mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-21 bg-[var(--gray-200)] rounded-xl">
                  <div className="h-8 w-12 bg-[var(--gray-200)] rounded mb-2 mx-auto" />
                  <div className="h-5 w-24 bg-[var(--gray-200)] rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto px-4 py-8 bg-[var(--background)] w-full h-full transition-all duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 text-[var(--foreground)] transition-all duration-200">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Profile Image */}
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-lg transition-shadow duration-200">
              <Image
                src={user?.photoURL || defaultAvatar}
                alt="Profile"
                fill
                className="object-cover"
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

        {/* Contact Information Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 text-[var(--foreground)] transition-all duration-200">
          <h2 className="text-xl font-bold mb-4">Dane kontaktowe</h2>
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

        {/* Statistics Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 text-[var(--foreground)] transition-all duration-200">
          <h2 className="text-xl font-bold mb-4">Statystyki</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Książek", "Recenzji", "Obserwujących", "Obserwowanych"].map(
              (label) => (
                <div
                  key={label}
                  className="text-center p-4 bg-[var(--secondaryColorLight)] rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 hover:cursor-pointer"
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
    </main>
  );
}
