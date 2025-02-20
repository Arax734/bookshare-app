"use client";

import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useState, useEffect } from "react";

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
      <main className="container mx-auto px-4 py-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8 animate-pulse">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <div className="w-32 h-32 rounded-2xl bg-gray-200"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
          {/* Add similar loading skeletons for other cards */}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Profile Image */}
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={user?.photoURL || defaultAvatar}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold text-gray-800">
                {user?.displayName || "Użytkownik"}
              </h1>
              <p className="text-gray-500 mt-1">
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
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            Dane kontaktowe
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Email
              </label>
              <p className="mt-1 text-gray-800">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                Telefon
              </label>
              <p className="mt-1 text-gray-800">
                {user?.phoneNumber || "Nie podano"}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Statystyki</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-[var(--primaryColor)]">0</p>
              <p className="text-sm text-gray-500">Książek</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-[var(--primaryColor)]">0</p>
              <p className="text-sm text-gray-500">Recenzji</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-[var(--primaryColor)]">0</p>
              <p className="text-sm text-gray-500">Obserwujących</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-[var(--primaryColor)]">0</p>
              <p className="text-sm text-gray-500">Obserwowanych</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
