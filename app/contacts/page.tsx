"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  or,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import Link from "next/link";

interface UserContact {
  id?: string;
  userId: string;
  contactId: string;
  createdAt: Timestamp;
  status: "pending" | "accepted";
}

interface UserSearchResult {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
}

interface ExtendedUserContact extends UserContact {
  contactPhotoURL?: string;
  contactDisplayName?: string;
  contactEmail?: string;
}

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ExtendedUserContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const defaultAvatar = "/images/default-avatar.png";

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        const contactsQuery = query(
          collection(db, "userContacts"),
          where("userId", "==", user.uid)
        );

        const querySnapshot = await getDocs(contactsQuery);
        const contactsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserContact[];

        // Fetch user data for each contact
        const contactsWithUserData = await Promise.all(
          contactsData.map(async (contact) => {
            const userDoc = await getDocs(
              query(
                collection(db, "users"),
                where("uid", "==", contact.contactId)
              )
            );
            const userData = userDoc.docs[0]?.data();

            return {
              ...contact,
              contactPhotoURL: userData?.photoURL || null,
              contactDisplayName: userData?.displayName || "Użytkownik",
              contactEmail: userData?.email || "Brak emaila",
            };
          })
        );

        setContacts(contactsWithUserData);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    fetchContacts();
  }, [user]);

  const searchUsers = async (searchText: string) => {
    if (!searchText.trim() || searchText.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const queryLower = searchText.toLowerCase();

      // Search by email
      const emailQuery = query(
        collection(db, "users"),
        where("email", ">=", queryLower),
        where("email", "<=", queryLower + "\uf8ff")
      );

      // Search by displayName
      const nameQuery = query(
        collection(db, "users"),
        where("displayName", ">=", queryLower),
        where("displayName", "<=", queryLower + "\uf8ff")
      );

      // Search by phone (if exists)
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

      // Combine and deduplicate results
      const results = new Map<string, UserSearchResult>();

      [
        ...emailSnapshot.docs,
        ...nameSnapshot.docs,
        ...phoneSnapshot.docs,
      ].forEach((doc) => {
        if (!results.has(doc.id) && doc.id !== user?.uid) {
          results.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          } as UserSearchResult);
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
      // Check if user exists
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", contactEmail)
      );

      const userSnapshot = await getDocs(usersQuery);
      if (userSnapshot.empty) {
        throw new Error("Użytkownik o podanym adresie email nie istnieje");
      }

      // Check if contact already exists
      const existingContactQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", user.uid),
        where("contactId", "==", userSnapshot.docs[0].id)
      );

      const existingContact = await getDocs(existingContactQuery);
      if (!existingContact.empty) {
        throw new Error("Ten użytkownik jest już w Twoich kontaktach");
      }

      // Add new contact
      await addDoc(collection(db, "userContacts"), {
        userId: user.uid,
        contactId: userSnapshot.docs[0].id,
        createdAt: Timestamp.now(),
        status: "pending",
      });

      // Refresh contacts list
      const contactsQuery = query(
        collection(db, "userContacts"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(contactsQuery);
      const updatedContacts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserContact[];
      setContacts(updatedContacts);

      // Clear search results
      setSearchResults([]);
      setSearchQuery("");
    } catch (error) {
      console.error("Error adding contact:", error);
      // Here you might want to add proper error handling/notification
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search bar */}
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
              className="w-full px-4 py-2 pl-10 rounded-lg border border-[var(--gray-200)] 
              bg-[var(--background)] text-[var(--foreground)]
              focus:outline-none focus:ring-2 focus:ring-[var(--primaryColor)]"
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

        {/* Contacts list */}
        <div className="bg-[var(--card-background)] rounded-lg shadow-sm border border-[var(--gray-200)]">
          <h3 className="text-[var(--gray-800)] font-semibold p-4 border-b border-[var(--gray-200)]">
            Twoje kontakty ({contacts.length})
          </h3>
          <div className="divide-y divide-[var(--gray-200)]">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Link
                    href={`/users/${contact.contactId}`}
                    className="hover:opacity-80 transition-opacity relative w-10 h-10"
                  >
                    <Image
                      src={contact.contactPhotoURL || defaultAvatar}
                      alt={contact.contactDisplayName || ""}
                      className="rounded-full object-cover"
                      fill
                      sizes="40px"
                    />
                  </Link>
                  <div>
                    <Link
                      href={`/users/${contact.contactId}`}
                      className="font-medium text-[var(--gray-800)] hover:text-[var(--primaryColor)] transition-colors block"
                    >
                      {contact.contactDisplayName}
                    </Link>
                    <p className="text-sm text-[var(--gray-500)]">
                      {contact.contactEmail}
                    </p>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full inline-block mt-1">
                      {contact.status === "pending"
                        ? "Oczekujące"
                        : "Zaakceptowane"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[var(--gray-500)]">
                  Nie masz jeszcze żadnych kontaktów
                </p>
                <p className="text-sm text-[var(--gray-400)] mt-2">
                  Użyj wyszukiwarki powyżej, aby dodać nowe kontakty
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Search results */}
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
                  <button
                    onClick={() => addContact(result.email)}
                    className="px-4 py-2 bg-[var(--primaryColor)] text-white rounded-lg
                     hover:bg-[var(--primaryColorLight)] transition-colors"
                  >
                    Dodaj do kontaktów
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isSearching && (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-[var(--primaryColor)] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
}
