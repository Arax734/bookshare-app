"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/app/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";
import { doc } from "firebase/firestore";

interface UserSearchResult {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  pendingInvite?: PendingInvite;
  isPending?: boolean;
}

interface PendingInvite {
  id: string;
  userId: string;
  status: "pending";
}

export default function Search() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const defaultAvatar = "/images/default-avatar.png";

  const searchUsers = async (searchText: string) => {
    if (!user || !searchText.trim() || searchText.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const queryLower = searchText.toLowerCase();

      // Get pending invites and contacts setup
      const sentInvitesQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", user.uid),
        where("status", "==", "pending")
      );
      const sentInvitesSnapshot = await getDocs(sentInvitesQuery);
      const sentInvites = new Set(
        sentInvitesSnapshot.docs.map((doc) => doc.data().contactId)
      );

      const pendingInvitesQuery = query(
        collection(db, "userContacts"),
        where("contactId", "==", user.uid),
        where("status", "==", "pending")
      );
      const pendingInvitesSnapshot = await getDocs(pendingInvitesQuery);
      const pendingInvites = new Map(
        pendingInvitesSnapshot.docs.map((doc) => [
          doc.data().userId,
          { id: doc.id, ...doc.data() },
        ])
      );

      // Fetch all users for full search capability
      const usersSnapshot = await getDocs(collection(db, "users"));
      const results = new Map<
        string,
        UserSearchResult & { pendingInvite?: PendingInvite }
      >();

      // Filter users manually to allow partial matching of names
      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        const docId = doc.id;

        if (docId === user.uid) return; // Skip current user

        const displayName = userData.displayName?.toLowerCase() || "";
        const email = userData.email?.toLowerCase() || "";
        const phoneNumber = userData.phoneNumber?.toLowerCase() || "";

        // Check if any field contains the search query
        if (
          displayName.includes(queryLower) ||
          email.includes(queryLower) ||
          phoneNumber.includes(queryLower)
        ) {
          results.set(docId, {
            id: docId,
            ...userData,
            pendingInvite: pendingInvites.get(docId),
            isPending: sentInvites.has(docId),
          } as UserSearchResult & { pendingInvite?: PendingInvite });
        }
      });

      setSearchResults(Array.from(results.values()));
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const addContact = async (contactEmail: string) => {
    if (!user) return;

    try {
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", contactEmail)
      );

      const userSnapshot = await getDocs(usersQuery);
      if (userSnapshot.empty) {
        throw new Error("Użytkownik o podanym adresie email nie istnieje");
      }

      const existingContactQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", user.uid),
        where("contactId", "==", userSnapshot.docs[0].id)
      );

      const existingContact = await getDocs(existingContactQuery);
      if (!existingContact.empty) {
        throw new Error("Ten użytkownik jest już w Twoich kontaktach");
      }

      await addDoc(collection(db, "userContacts"), {
        userId: user.uid,
        contactId: userSnapshot.docs[0].id,
        createdAt: Timestamp.now(),
        status: "pending",
      });

      setSearchResults((prevResults) =>
        prevResults.map((result) =>
          result.email === contactEmail
            ? { ...result, isPending: true }
            : result
        )
      );
    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };

  const acceptInvite = async (inviteId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "userContacts", inviteId), {
        status: "accepted",
      });

      setSearchResults((prevResults) =>
        prevResults.filter((result) => result.pendingInvite?.id !== inviteId)
      );
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl space-y-4 sm:space-y-6">
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Szukaj użytkowników po emailu, imieniu lub numerze telefonu..."
              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
            />
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="bg-[var(--card-background)] rounded-lg shadow-sm border border-[var(--gray-200)]">
            <h3 className="text-[var(--gray-800)] font-semibold p-2 sm:p-4 border-b border-[var(--gray-200)] text-sm sm:text-base">
              Wyniki wyszukiwania
            </h3>
            <div className="divide-y divide-[var(--gray-200)]">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-2 sm:p-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 sm:gap-3"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 w-full xs:w-auto">
                    <Link
                      href={`/users/${result.id}`}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={result.photoURL || defaultAvatar}
                          alt={result.displayName}
                          fill
                          sizes="(max-width: 640px) 32px, 40px"
                          className="object-cover"
                          loading="eager"
                          quality={100}
                        />
                      </div>
                    </Link>
                    <div>
                      <Link
                        href={`/users/${result.id}`}
                        className="font-medium text-[var(--gray-800)] hover:text-[var(--primaryColor)] transition-colors text-sm sm:text-base"
                      >
                        {result.displayName}
                      </Link>
                      <p className="text-xs sm:text-sm text-[var(--gray-500)] pointer-events-none">
                        <span className="text-[var(--gray-500)]">
                          {result.email}
                        </span>
                      </p>
                    </div>
                  </div>
                  {result.pendingInvite ? (
                    <button
                      onClick={() =>
                        result.pendingInvite &&
                        acceptInvite(result.pendingInvite.id)
                      }
                      className="w-full xs:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm"
                    >
                      Zaakceptuj zaproszenie
                    </button>
                  ) : (
                    <button
                      onClick={() => addContact(result.email)}
                      disabled={result.isPending}
                      className={`w-full xs:w-auto px-3 sm:px-4 py-1.5 sm:py-2 ${
                        result.isPending
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)]"
                      } text-white rounded-lg transition-colors text-xs sm:text-sm`}
                    >
                      {result.isPending
                        ? "Zaproszenie wysłane"
                        : "Dodaj do kontaktów"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isSearching && (
          <div className="text-center py-3 sm:py-4">
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-[var(--primaryColor)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}
