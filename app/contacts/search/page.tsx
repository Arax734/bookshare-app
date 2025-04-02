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

      const emailQuery = query(
        collection(db, "users"),
        where("email", ">=", queryLower),
        where("email", "<=", queryLower + "\uf8ff")
      );

      const nameQuery = query(
        collection(db, "users"),
        where("displayName", ">=", queryLower),
        where("displayName", "<=", queryLower + "\uf8ff")
      );

      const phoneQuery = query(
        collection(db, "users"),
        where("phoneNumber", ">=", queryLower),
        where("phoneNumber", "<=", queryLower + "\uf8ff")
      );

      const [emailSnapshot, nameSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(emailQuery),
        getDocs(nameQuery),
        getDocs(phoneQuery),
      ]);

      const results = new Map<
        string,
        UserSearchResult & { pendingInvite?: PendingInvite }
      >();

      [
        ...emailSnapshot.docs,
        ...nameSnapshot.docs,
        ...phoneSnapshot.docs,
      ].forEach((doc) => {
        if (!results.has(doc.id) && doc.id !== user?.uid) {
          results.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            pendingInvite: pendingInvites.get(doc.id),
            isPending: sentInvites.has(doc.id),
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
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
              className="pl-10 w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
            />
            <svg
              className="w-5 h-5 text-[var(--gray-400)] absolute left-3 top-1/2 -translate-y-1/2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>
        {searchResults.length > 0 && (
          <div className="bg-[var(--card-background)] rounded-lg shadow-sm border border-[var(--gray-200)]">
            <h3 className="text-[var(--gray-800)] font-semibold p-4 border-b border-[var(--gray-200)]">
              Wyniki wyszukiwania
            </h3>
            <div className="divide-y divide-[var(--gray-200)]">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/users/${result.id}`}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={result.photoURL || defaultAvatar}
                          alt={result.displayName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </Link>
                    <div>
                      <Link
                        href={`/users/${result.id}`}
                        className="font-medium text-[var(--gray-800)] hover:text-[var(--primaryColor)] transition-colors"
                      >
                        {result.displayName}
                      </Link>
                      <p className="text-sm text-[var(--gray-500)]">
                        {result.email}
                      </p>
                    </div>
                  </div>
                  {result.pendingInvite ? (
                    <button
                      onClick={() =>
                        result.pendingInvite &&
                        acceptInvite(result.pendingInvite.id)
                      }
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Zaakceptuj zaproszenie
                    </button>
                  ) : (
                    <button
                      onClick={() => addContact(result.email)}
                      disabled={result.isPending}
                      className={`px-4 py-2 ${
                        result.isPending
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)]"
                      } text-white rounded-lg transition-colors`}
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
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-[var(--primaryColor)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}
