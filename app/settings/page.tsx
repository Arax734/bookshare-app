"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "@/firebase/config";
import Image from "next/image";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/firebase/config";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

interface UserData {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
}

export default function Settings() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithFacebook,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [authMethod, setAuthMethod] = useState<
    "password" | "google" | "facebook" | null
  >(null);
  const defaultAvatar = "/images/default-avatar.png";

  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  const [initialPhoneNumber, setInitialPhoneNumber] = useState("");
  const [initialBio, setInitialBio] = useState("");
  const [isFormChanged, setIsFormChanged] = useState(false);

  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    if (user?.providerData[0]?.providerId) {
      const provider = user.providerData[0].providerId;
      if (provider === "password") setAuthMethod("password");
      else if (provider === "google.com") setAuthMethod("google");
      else if (provider === "facebook.com") setAuthMethod("facebook");
    }
  }, [user]);

  useEffect(() => {
    const message = localStorage.getItem("showSuccessMessage");
    if (message) {
      setSuccessMessage(message);
      localStorage.removeItem("showSuccessMessage");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user || authLoading) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);

          const phone = data.phoneNumber || "";
          const userBio = data.bio || "";
          setPhoneNumber(phone);
          setBio(userBio);
          setInitialPhoneNumber(phone);
          setInitialBio(userBio);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, authLoading]);

  useEffect(() => {
    const hasPhoneChanged = phoneNumber !== initialPhoneNumber;
    const hasBioChanged = bio !== initialBio;
    const hasChanges = hasPhoneChanged || hasBioChanged;

    console.log("Form changes:", {
      hasPhoneChanged,
      hasBioChanged,
      phoneNumber,
      initialPhoneNumber,
      bio,
      initialBio,
    });

    setIsFormChanged(hasChanges);
  }, [phoneNumber, bio, initialPhoneNumber, initialBio]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner />
      </div>
    );
  }

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.length >= 11;
  };

  const formatPhoneForSaving = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, "");

    if (digitsOnly.startsWith("48")) {
      const parts = [
        digitsOnly.slice(0, 2),
        digitsOnly.slice(2, 5),
        digitsOnly.slice(5, 8),
        digitsOnly.slice(8),
      ];
      return parts.join(" ").trim();
    }

    return digitsOnly.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isFormChanged) return;

    if (
      phoneNumber !== initialPhoneNumber &&
      !validatePhoneNumber(phoneNumber)
    ) {
      setError("Wprowadź poprawny numer telefonu");
      return;
    }

    try {
      setIsSaving(true);
      const userDocRef = doc(db, "users", user.uid);
      const updateData: { [key: string]: string } = {};

      if (phoneNumber !== initialPhoneNumber) {
        updateData.phoneNumber = formatPhoneForSaving(phoneNumber);
      }
      if (bio !== initialBio) {
        updateData.bio = bio;
      }

      await updateDoc(userDocRef, updateData);

      localStorage.setItem(
        "showSuccessMessage",
        "Dane zostały zaktualizowane pomyślnie!"
      );
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Wystąpił błąd podczas aktualizacji profilu");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) return;

    try {
      try {
        if (authMethod === "password") {
          const credential = EmailAuthProvider.credential(
            user.email!,
            password
          );
          await reauthenticateWithCredential(user, credential);
        } else {
          const reAuthResult = await (authMethod === "google"
            ? signInWithGoogle()
            : signInWithFacebook());
          if (!reAuthResult) {
            throw new Error("Ponowne uwierzytelnienie nie powiodło się");
          }
        }

        try {
          const imageRef = ref(storage, `avatars/${user.uid}`);
          await deleteObject(imageRef);
        } catch (storageError) {
          console.log("No profile image to delete or already deleted");
        }

        const reviewsQuery = query(
          collection(db, "reviews"),
          where("userId", "==", user.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const deleteReviewsPromises = reviewsSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref)
        );
        await Promise.all(deleteReviewsPromises);

        const userContactsQuery1 = query(
          collection(db, "userContacts"),
          where("userId", "==", user.uid)
        );
        const userContactsQuery2 = query(
          collection(db, "userContacts"),
          where("contactId", "==", user.uid)
        );
        const bookDesire = query(
          collection(db, "bookDesire"),
          where("userId", "==", user.uid)
        );
        const bookFavorites = query(
          collection(db, "bookFavorites"),
          where("userId", "==", user.uid)
        );
        const bookOwnership = query(
          collection(db, "bookOwnership"),
          where("userId", "==", user.uid)
        );

        const [
          contactsSnapshot1,
          contactsSnapshot2,
          bookDesireSnapshot,
          bookFavoritesSnapshot,
          bookOwnershipSnapshot,
        ] = await Promise.all([
          getDocs(userContactsQuery1),
          getDocs(userContactsQuery2),
          getDocs(bookDesire),
          getDocs(bookFavorites),
          getDocs(bookOwnership),
        ]);

        const deleteContactsPromises = [
          ...contactsSnapshot1.docs.map((doc) => deleteDoc(doc.ref)),
          ...contactsSnapshot2.docs.map((doc) => deleteDoc(doc.ref)),
          ...bookDesireSnapshot.docs.map((doc) => deleteDoc(doc.ref)),
          ...bookFavoritesSnapshot.docs.map((doc) => deleteDoc(doc.ref)),
          ...bookOwnershipSnapshot.docs.map((doc) => deleteDoc(doc.ref)),
        ];
        await Promise.all(deleteContactsPromises);

        const userDocRef = doc(db, "users", user.uid);
        await deleteDoc(userDocRef);

        await user.delete();

        await fetch("/api/auth/session", { method: "DELETE" });

        window.location.href = "/";
      } catch (error: any) {
        if (
          error.code === "auth/unauthorized-domain" ||
          error.code === "appcheck/invalid-token"
        ) {
          setError("Błąd weryfikacji. Spróbuj ponownie później.");
          return;
        }
        throw error;
      }
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        setError("Nieprawidłowe hasło");
      } else if (error.code === "auth/requires-recent-login") {
        setError(
          "Wymagane ponowne zalogowanie. Spróbuj zalogować się ponownie."
        );
      } else {
        setError("Wystąpił błąd podczas usuwania konta");
      }
      console.error("Delete account error:", error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setSuccessMessage("");

    if (!user) return;

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Hasła nie są takie same");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Hasło musi mieć co najmniej 6 znaków");
      return;
    }

    try {
      try {
        const credential = EmailAuthProvider.credential(
          user.email!,
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);
      } catch (error: any) {
        if (
          error.code === "auth/unauthorized-domain" ||
          error.code === "appcheck/invalid-token"
        ) {
          setPasswordError("Błąd weryfikacji. Spróbuj ponownie później.");
          return;
        }
        throw error;
      }

      setSuccessMessage("Hasło zostało zmienione pomyślnie!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);

      setIsChangePasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        setPasswordError("Nieprawidłowe obecne hasło");
      } else {
        setPasswordError("Wystąpił błąd podczas zmiany hasła");
        console.error("Password change error:", error);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png"];

    if (file.size > maxSize) {
      setUploadError("Plik jest za duży. Maksymalny rozmiar to 1MB.");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Dozwolone są tylko pliki JPG i PNG.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");

      const imageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);

      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
      });

      const reviewsQuery = query(
        collection(db, "reviews"),
        where("userId", "==", user.uid)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);

      const updateReviewsPromises = reviewsSnapshot.docs.map((reviewDoc) =>
        updateDoc(reviewDoc.ref, {
          userPhotoURL: downloadURL,
        })
      );

      await Promise.all(updateReviewsPromises);

      localStorage.setItem(
        "showSuccessMessage",
        "Zdjęcie profilowe zostało zaktualizowane pomyślnie!"
      );
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile photo:", error);
      setUploadError("Wystąpił błąd podczas aktualizacji zdjęcia profilowego");
    } finally {
      setIsUploading(false);
    }
  };

  const renderAuthenticationSection = () => {
    if (authMethod === "password") {
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Potwierdź hasło
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-[border] duration-200 text-sm"
            required
          />
        </div>
      );
    }

    return (
      <div className="text-[var(--foreground)] mb-4">
        <p>
          Konto utworzone przez{" "}
          {authMethod === "google" ? "Google" : "Facebook"}.
        </p>
        <p>Aby usunąć konto, będziesz musiał się ponownie zalogować.</p>
      </div>
    );
  };

  return (
    <>
      <main className="container mx-auto pb-8 px-4 bg-[var(--background)] transition-all duration-200">
        <div className="max-w-2xl mx-auto">
          {successMessage && (
            <div className="fixed right-5 transform top-[6.25rem] z-50">
              <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-slide-down">
                {successMessage}
              </div>
            </div>
          )}
          <h1 className="text-xl font-bold mb-5 text-[var(--foreground)] transition-colors duration-200">
            Ustawienia profilu
          </h1>

          <div className="bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
            <div className="bg-gradient-to-r bg-[var(--primaryColor)] p-3 text-white">
              <h2 className="text-lg font-bold">Ustawienia ogólne</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center space-x-3 mb-5">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                  {(isImageLoading || isUploading) && (
                    <div className="absolute inset-0 bg-[var(--gray-200)] bg-opacity-50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[var(--primaryColorLight)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <Image
                    src={userData?.photoURL || defaultAvatar}
                    alt="Profile"
                    fill
                    className="object-cover transition-all duration-200 shadow"
                    onLoadingComplete={() => setIsImageLoading(false)}
                    priority
                  />
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-full transition-all duration-200 shadow-sm hover:shadow transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
                >
                  {isUploading ? "Weryfikacja..." : "Zmień zdjęcie"}
                </button>
              </div>
              {uploadError && (
                <p className="text-red-500 text-sm mb-4">{uploadError}</p>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1 transition-colors duration-200">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email || ""}
                      disabled
                      className="w-full px-3 py-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)] transition-[border] duration-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1 transition-colors duration-200">
                      Numer telefonu
                    </label>
                    <PhoneInput
                      country={"pl"}
                      value={phoneNumber}
                      onChange={(phone: string) => {
                        setPhoneNumber(phone);
                        setIsPhoneValid(validatePhoneNumber(phone));
                      }}
                      inputProps={{
                        required: true,
                      }}
                      containerClass="phone-input-container"
                      enableSearch={false}
                      disableSearchIcon={true}
                    />
                    {!isPhoneValid && phoneNumber && (
                      <p className="mt-1 text-sm text-red-500">
                        Wprowadź poprawny numer telefonu
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] transition-colors duration-200">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-1.5 rounded-lg border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200 text-sm"
                      placeholder="Napisz coś o sobie..."
                    />
                  </div>

                  <div className="pt-4 transition-all duration-200">
                    <button
                      type="submit"
                      disabled={isSaving || !isFormChanged}
                      className="w-full px-3 py-1.5 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                    >
                      {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="my-8 bg-[var(--card-background)] rounded-2xl shadow-md overflow-hidden transition-all duration-200">
            <div className="bg-gradient-to-r bg-[var(--primaryColor)] p-3 text-white">
              <h2 className="text-lg font-bold">Bezpieczeństwo</h2>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                {authMethod === "password" && (
                  <button
                    onClick={() => setIsChangePasswordModalOpen(true)}
                    className="w-full px-3 py-2 text-left text-white bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-[1.02] flex items-center justify-between text-sm"
                  >
                    <span>Zmień hasło</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a 1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full px-3 py-2 text-left text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center justify-between group"
                >
                  <span>Usuń konto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-[var(--card-background)] rounded-2xl shadow-lg p-6 max-w-md w-full mx-4 transition-all duration-200">
            <h2 className="text-lg font-bold mb-3 text-[var(--foreground)]">
              Usuń konto
            </h2>
            <p className="text-[var(--foreground)] mb-4 text-sm">
              Tej operacji nie można cofnąć. Wszystkie Twoje dane zostaną trwale
              usunięte.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {renderAuthenticationSection()}
              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="confirm"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="mr-2"
                  required
                />
                <label
                  htmlFor="confirm"
                  className="text-sm text-[var(--foreground)]"
                >
                  Potwierdzam, że chcę trwale usunąć moje konto
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setPassword("");
                    setConfirmDelete(false);
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--gray-200)] text-[var(--foreground)] rounded-xl hover:bg-[var(--gray-300)] transition-colors duration-200"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={
                    !confirmDelete ||
                    (authMethod === "password" && !password) ||
                    isLoading
                  }
                  className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? "Weryfikacja..." : "Usuń konto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-5 max-w-md w-full mx-4 transition-all duration-200">
            <h2 className="text-lg font-bold mb-3 text-[var(--foreground)]">
              Zmień hasło
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Obecne hasło
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Nowe hasło
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Potwierdź nowe hasło
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
                  required
                />
              </div>
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}
              {successMessage && (
                <p className="text-green-500 text-sm">{successMessage}</p>
              )}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordModalOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setPasswordError("");
                  }}
                  className="flex-1 px-4 py-2 bg-[var(--gray-200)] text-[var(--foreground)] rounded-xl hover:bg-[var(--gray-300)] transition-colors duration-200"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={
                    !currentPassword || !newPassword || !confirmNewPassword
                  }
                  className="flex-1 px-4 py-2 bg-[var(--primaryColor)] text-white rounded-xl hover:bg-[var(--primaryColorLight)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Weryfikacja..." : "Zmień hasło"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
