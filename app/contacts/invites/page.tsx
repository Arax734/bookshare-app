"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { db } from "@/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useNotifications } from "@/app/contexts/NotificationsContext";

interface Invitation {
  id: string;
  userId: string;
  contactId: string;
  createdAt: any;
  status: "pending" | "accepted";
  senderData?: {
    displayName: string;
    email: string;
    photoURL: string | null;
  };
}

export default function Friends() {
  const { user } = useAuth();
  const { refreshPendingInvites, refreshAcceptedContactsCount } =
    useNotifications();
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const defaultAvatar = "/images/default-avatar.png";

  useEffect(() => {
    if (!user) return;

    const fetchInvites = async () => {
      try {
        setIsLoading(true);
        const invitesQuery = query(
          collection(db, "userContacts"),
          where("contactId", "==", user.uid),
          where("status", "==", "pending")
        );

        const querySnapshot = await getDocs(invitesQuery);
        const invitesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invitation[];

        const invitesWithSenderData = await Promise.all(
          invitesData.map(async (invite) => {
            const senderDoc = await getDoc(doc(db, "users", invite.userId));
            const senderData = senderDoc.data();
            return {
              ...invite,
              senderData: {
                displayName: senderData?.displayName || "Użytkownik",
                email: senderData?.email || "",
                photoURL: senderData?.photoURL || null,
              },
            };
          })
        );

        setInvites(invitesWithSenderData);
      } catch (error) {
        console.error("Error fetching invites:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvites();
  }, [user]);

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "userContacts", inviteId), {
        status: "accepted",
      });

      setInvites((prevInvites) =>
        prevInvites.filter((invite) => invite.id !== inviteId)
      );

      refreshPendingInvites();
      refreshAcceptedContactsCount();
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "userContacts", inviteId));

      setInvites((prevInvites) =>
        prevInvites.filter((invite) => invite.id !== inviteId)
      );

      refreshPendingInvites();
    } catch (error) {
      console.error("Error rejecting invite:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl space-y-4 sm:space-y-6">
        <div className="relative">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--gray-800)] mb-2 sm:mb-3">
            Zaproszenia do kontaktów ({invites.length})
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] p-2 sm:p-3 animate-pulse"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full mb-1 sm:mb-2" />
                    <div className="w-24 sm:w-28 h-3 sm:h-4 bg-gray-200 rounded mb-1" />
                    <div className="w-16 sm:w-20 h-2 sm:h-3 bg-gray-200 rounded mb-2" />
                    <div className="flex gap-2 mt-1">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-200 rounded-lg" />
                      <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-200 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {invites.length > 0 ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] p-2 sm:p-3 shadow hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col items-center text-center">
                        <Link
                          href={`/users/${invite.userId}`}
                          className="hover:opacity-80 transition-opacity relative w-12 sm:w-14 h-12 sm:h-14 mb-1 sm:mb-2"
                        >
                          <Image
                            src={invite.senderData?.photoURL || defaultAvatar}
                            alt={invite.senderData?.displayName || ""}
                            className="rounded-full object-cover"
                            fill
                            sizes="(max-width: 640px) 48px, 56px"
                            quality={100}
                            priority={true}
                          />
                        </Link>
                        <div>
                          <Link
                            href={`/users/${invite.userId}`}
                            className="font-medium text-[var(--gray-800)] hover:text-[var(--primaryColorLighter)] transition-colors block text-sm sm:text-base mb-0.5"
                          >
                            {invite.senderData?.displayName}
                          </Link>
                          <p className="text-[10px] sm:text-xs text-[var(--gray-500)] mb-2 sm:mb-3">
                            {invite.senderData?.email}
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleAcceptInvite(invite.id)}
                              className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              title="Akceptuj zaproszenie"
                            >
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRejectInvite(invite.id)}
                              className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Odrzuć zaproszenie"
                            >
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 rounded-lg">
                  <p className="text-[var(--gray-500)] text-sm">
                    Nie masz żadnych oczekujących zaproszeń
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
