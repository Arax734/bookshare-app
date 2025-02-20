"use client";

import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export default function Profile() {
  const { user } = useAuth();
  const defaultAvatar = "/images/default-avatar.png";

  return (
    <main className="container mx-auto px-4 py-8 bg-[var(--background)]">
      <div className="max-w-2xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 text-foreground">
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
              <h1 className="text-2xl font-bold text-[var(--gray-800)]">
                {user?.displayName || "Użytkownik"}
              </h1>
              <p className="text-(var(--gray-500)] mt-1">
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
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 text-[var(--foreground)]">
          <h2 className="text-xl font-bold mb-4">Dane kontaktowe</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--gray-500)] dark:text-gray-400">
                Email
              </label>
              <p className="mt-1">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--gray-500)]">
                Telefon
              </label>
              <p className="mt-1 text-[var(--gray-800)]">
                {user?.phoneNumber || "Nie podano"}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 text-foreground">
          <h2 className="text-xl font-bold mb-4">Statystyki</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[var(--secondaryColorLight)] rounded-xl">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-[var(--gray-800)] dark:text-[var(--gray-300)]">
                Książek
              </p>
            </div>
            <div className="text-center p-4 bg-[var(--secondaryColorLight)] rounded-xl">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-[var(--gray-800)] dark:text-[var(--gray-300)]">
                Recenzji
              </p>
            </div>
            <div className="text-center p-4 bg-[var(--secondaryColorLight)] rounded-xl">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-[var(--gray-800)] dark:text-[var(--gray-300)]">
                Obserwujących
              </p>
            </div>
            <div className="text-center p-4 bg-[var(--secondaryColorLight)] rounded-xl">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-sm text-[var(--gray-800)] dark:text-[var(--gray-300)]">
                Obserwowanych
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
