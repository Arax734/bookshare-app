"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import ContactsLoadingSpinner from "../components/ContactsLoadingSpinner";

interface UserContact {
  id?: string;
  userId: string;
  contactId: string;
  createdAt: Timestamp;
  status: "pending" | "accepted";
  isReverse?: boolean;
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
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const defaultAvatar = "/images/default-avatar.png";

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const contactsAsUserQuery = query(
          collection(db, "userContacts"),
          where("userId", "==", user.uid)
        );

        const contactsAsContactQuery = query(
          collection(db, "userContacts"),
          where("contactId", "==", user.uid),
          where("status", "==", "accepted")
        );

        const [userQuerySnapshot, contactQuerySnapshot] = await Promise.all([
          getDocs(contactsAsUserQuery),
          getDocs(contactsAsContactQuery),
        ]);

        const contactsData = [
          ...userQuerySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
          ...contactQuerySnapshot.docs.map((doc) => ({
            id: doc.id,
            isReverse: true,
            userId: doc.data().contactId,
            contactId: doc.data().userId,
            ...doc.data(),
          })),
        ] as UserContact[];

        const contactsWithUserData = await Promise.all(
          contactsData.map(async (contact) => {
            const userIdToFetch = contact.isReverse
              ? contact.userId
              : contact.contactId;
            const userDocRef = doc(db, "users", userIdToFetch);
            const userDocSnap = await getDoc(userDocRef);
            const userData = userDocSnap.data();

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
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [user]);

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
    } catch (error) {
      console.error("Error adding contact:", error);
    }
  };

  // Update the contact card render function
  const renderContactCard = (contact: ExtendedUserContact) => (
    <div
      key={contact.id}
      className="bg-[var(--card-background)] rounded-lg border border-[var(--gray-200)] p-2 sm:p-3 shadow hover:shadow-md transition-shadow relative"
    >
      {contact.status === "pending" && (
        <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
          <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[var(--pending-bg)] text-[var(--pending-text)]">
            Oczekujące
          </span>
        </div>
      )}
      <div className="flex flex-col items-center text-center">
        <Link
          href={`/users/${
            contact.isReverse ? contact.userId : contact.contactId
          }`}
          className="hover:opacity-80 transition-opacity relative w-12 sm:w-14 h-12 sm:h-14 mb-1 sm:mb-2"
        >
          <Image
            src={contact.contactPhotoURL || defaultAvatar}
            alt={contact.contactDisplayName || ""}
            className="rounded-full object-cover"
            fill
            sizes="(max-width: 640px) 48px, 56px"
            quality={100}
            priority={true}
            loading="eager"
          />
        </Link>
        <div>
          <Link
            href={`/users/${
              contact.isReverse ? contact.userId : contact.contactId
            }`}
            className="font-medium text-[var(--gray-800)] hover:text-[var(--primaryColorLighter)] transition-colors block text-sm sm:text-base mb-0.5"
          >
            {contact.contactDisplayName}
          </Link>
          <p className="text-[10px] sm:text-xs text-[var(--gray-500)]">
            {contact.contactEmail}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl space-y-4 sm:space-y-6">
        <div className="relative">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--gray-800)] mb-2 sm:mb-3">
            Twoje kontakty (
            {contacts.filter((contact) => contact.status === "accepted").length}
            )
          </h2>

          {isLoading ? (
            <ContactsLoadingSpinner />
          ) : (
            <>
              {contacts.length > 0 ? (
                <div className="space-y-6 sm:space-y-8">
                  <div>
                    <h3 className="text-sm sm:text-base font-medium text-[var(--gray-700)] mb-2 sm:mb-3">
                      Zaakceptowane kontakty
                    </h3>
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                      {contacts
                        .filter((contact) => contact.status === "accepted")
                        .map(renderContactCard)}
                    </div>
                  </div>

                  {contacts.some((contact) => contact.status === "pending") && (
                    <div>
                      <h3 className="text-sm sm:text-base font-medium text-[var(--gray-700)] mb-2 sm:mb-3">
                        Oczekujące zaproszenia
                      </h3>
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {contacts
                          .filter((contact) => contact.status === "pending")
                          .map(renderContactCard)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 rounded-lg">
                  <p className="text-[var(--gray-500)] text-sm">
                    Nie masz jeszcze żadnych kontaktów
                  </p>
                  <p className="text-xs text-[var(--gray-400)] mt-2">
                    Użyj{" "}
                    <Link
                      href="/contacts/search"
                      className="text-[var(--primaryColor)] hover:text-[var(--primaryColorLight)] hover:underline transition-colors"
                    >
                      wyszukiwarki
                    </Link>
                    , aby dodać nowe kontakty
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Update the contact card styles for better mobile display */}
        {searchResults.length > 0 && (
          <div className="bg-[var(--card-background)] rounded-lg shadow-sm border border-[var(--gray-200)]">
            <h3 className="text-[var(--gray-800)] font-semibold p-2 sm:p-3 border-b border-[var(--gray-200)] text-sm sm:text-base">
              Wyniki wyszukiwania
            </h3>
            <div className="divide-y divide-[var(--gray-200)]">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-2 sm:p-3 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/users/${result.id}`}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image
                          src={result.photoURL || defaultAvatar}
                          alt={result.displayName}
                          fill
                          sizes="32px"
                          quality={100}
                          className="object-cover"
                          loading="eager"
                        />
                      </div>
                    </Link>
                    <div>
                      <Link
                        href={`/users/${result.id}`}
                        className="font-medium text-[var(--gray-800)] hover:text-[var(--primaryColor)] transition-colors text-sm"
                      >
                        {result.displayName}
                      </Link>
                      <p className="text-xs text-[var(--gray-500)]">
                        {result.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addContact(result.email)}
                    className="px-3 py-1.5 bg-[var(--primaryColor)] text-white rounded-lg hover:bg-[var(--primaryColorLight)] transition-colors text-xs sm:text-sm"
                  >
                    Dodaj do kontaktów
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
