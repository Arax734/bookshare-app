"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import Image from "next/image";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile, // Add this import
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/firebase/config";

export default function Settings() {
  const { user, signInWithGoogle, signInWithFacebook } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [authMethod, setAuthMethod] = useState<
    "password" | "google" | "facebook" | null
  >(null);
  const defaultAvatar = "/images/default-avatar.png";

  // Add new state for password change modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Add new state for image upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.providerData[0]?.providerId) {
      const provider = user.providerData[0].providerId;
      if (provider === "password") setAuthMethod("password");
      else if (provider === "google.com") setAuthMethod("google");
      else if (provider === "facebook.com") setAuthMethod("facebook");
    }
  }, [user]);

  // Add this useEffect to handle the success message after page reload
  useEffect(() => {
    const message = localStorage.getItem("showSuccessMessage");
    if (message) {
      setSuccessMessage(message);
      localStorage.removeItem("showSuccessMessage");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  }, []);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 bg-[var(--background)] transition-all duration-200">
        <div className="max-w-2xl mx-auto">
          {/* Page Title Skeleton */}
          <div className="h-8 w-48 bg-[var(--gray-200)] rounded animate-pulse mb-6" />

          {/* General Settings Card Skeleton */}
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 animate-pulse">
            {/* Card Title */}
            <div className="h-7 w-40 bg-[var(--gray-200)] rounded mb-4" />

            {/* Avatar Section */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 rounded-xl bg-[var(--gray-200)]" />
              <div className="h-9 w-32 bg-[var(--gray-200)] rounded-full" />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <div className="h-5 w-32 bg-[var(--gray-200)] rounded mb-2" />
                <div className="h-10 bg-[var(--gray-200)] rounded-xl" />
              </div>

              {/* Email Input */}
              <div>
                <div className="h-5 w-24 bg-[var(--gray-200)] rounded mb-2" />
                <div className="h-10 bg-[var(--gray-200)] rounded-xl" />
              </div>

              {/* Phone Input */}
              <div>
                <div className="h-5 w-36 bg-[var(--gray-200)] rounded mb-2" />
                <div className="h-10 bg-[var(--gray-200)] rounded-xl" />
              </div>

              {/* Bio Textarea */}
              <div>
                <div className="h-5 w-20 bg-[var(--gray-200)] rounded mb-2" />
                <div className="h-32 bg-[var(--gray-200)] rounded-xl" />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <div className="h-10 bg-[var(--gray-200)] rounded-xl" />
              </div>
            </div>
          </div>

          {/* Security Card Skeleton */}
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 animate-pulse">
            <div className="h-7 w-36 bg-[var(--gray-200)] rounded mb-4" />
            <div className="space-y-4">
              {/* Security Buttons */}
              <div className="h-12 bg-[var(--gray-200)] rounded-xl" />
              <div className="h-12 bg-[var(--gray-200)] rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) return;

    try {
      // Add App Check error handling
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

        // Delete profile image from storage if it exists
        try {
          const imageRef = ref(storage, `avatars/${user.uid}`);
          await deleteObject(imageRef);
        } catch (storageError) {
          // Ignore error if image doesn't exist
          console.log("No profile image to delete or already deleted");
        }

        // Delete user account
        await user.delete();
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

      window.location.href = "/";
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
    setSuccessMessage(""); // Clear any existing success message

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
      // Add App Check error handling
      try {
        // First, re-authenticate the user
        const credential = EmailAuthProvider.credential(
          user.email!,
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);

        // Then update the password using the updatePassword function
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

      // Show success message and close modal
      setSuccessMessage("Hasło zostało zmienione pomyślnie!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000); // Hide message after 3 seconds

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

    // File validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/png"];

    if (file.size > maxSize) {
      setUploadError("Plik jest za duży. Maksymalny rozmiar to 5MB.");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Dozwolone są tylko pliki JPG i PNG.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");

      // Add App Check error handling
      try {
        const imageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(imageRef);

        // Update user profile
        await updateProfile(user, {
          photoURL: downloadURL,
        });
      } catch (error: any) {
        if (
          error.code === "storage/unauthorized" ||
          error.code === "appcheck/invalid-token"
        ) {
          setUploadError("Błąd weryfikacji. Spróbuj ponownie później.");
          return;
        }
        throw error;
      }

      // Force refresh the auth state to update the navbar
      await user.reload();

      // Refresh the page and show success message after reload
      window.location.reload();

      // Success message will be shown after page reload
      localStorage.setItem(
        "showSuccessMessage",
        "Zdjęcie profilowe zostało zaktualizowane pomyślnie!"
      );
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError("Wystąpił błąd podczas przesyłania zdjęcia");
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
            className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-[border] duration-200"
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
      <main className="container mx-auto px-4 py-8 bg-[var(--background)] transition-all duration-200">
        <div className="max-w-2xl mx-auto">
          {successMessage && (
            <div className="fixed right-5 transform top-[6.25rem] z-50">
              <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-slide-down">
                {successMessage}
              </div>
            </div>
          )}
          <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)] transition-colors duration-200">
            Ustawienia profilu
          </h1>

          {/* General Settings Card */}
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 mb-8 transition-all duration-200">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)] transition-colors duration-200">
              Ustawienia ogólne
            </h2>
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                <Image
                  src={user?.photoURL || defaultAvatar}
                  alt="Profile"
                  fill
                  className="object-cover transition-all duration-200 shadow"
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
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
                disabled={authMethod !== "password" || isUploading}
                className="px-4 py-2 text-sm bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-full transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
              >
                {isUploading ? "Weryfikacja..." : "Zmień zdjęcie"}
              </button>
            </div>
            {uploadError && (
              <p className="text-red-500 text-sm mb-4">{uploadError}</p>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Form inputs without transitions */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1 transition-colors duration-200">
                    Imię i nazwisko
                  </label>
                  <input
                    type="text"
                    placeholder={user?.displayName || ""}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1 transition-colors duration-200">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email || ""}
                    disabled
                    className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-100)] text-[var(--gray-500)] transition-[border] duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] transition-colors duration-200">
                    Numer telefonu
                  </label>
                  <input
                    type="tel"
                    defaultValue={user?.phoneNumber || ""}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] transition-colors duration-200">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primaryColorLight)] focus:border-[var(--primaryColorLight)] transition-[border] duration-200"
                    placeholder="Napisz coś o sobie..."
                  />
                </div>

                <div className="pt-4 transition-all duration-200">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow transform hover:scale-105"
                  >
                    Zapisz zmiany
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Security Card */}
          <div className="bg-[var(--card-background)] rounded-2xl shadow-md p-6 transition-all duration-200">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)] transition-colors duration-200">
              Bezpieczeństwo
            </h2>
            <div className="space-y-4">
              {authMethod === "password" && (
                <button
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  className="w-full px-4 py-3 text-left text-white bg-[var(--primaryColor)] hover:bg-[var(--primaryColorLight)] rounded-xl transition-all duration-200 shadow-sm hover:shadow hover:scale-[1.02] flex items-center justify-between"
                >
                  <span>Zmień hasło</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full px-4 py-3 text-left text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all duration-200 shadow-sm hover:shadow hover:scale-[1.02] flex items-center justify-between group"
              >
                <span>Usuń konto</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-[var(--card-background)] rounded-2xl shadow-lg p-6 max-w-md w-full mx-4 transition-all duration-200">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
              Usuń konto
            </h2>
            <p className="text-[var(--foreground)] mb-6">
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
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Weryfikacja..." : "Usuń konto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-[var(--card-background)] rounded-2xl shadow-lg p-6 max-w-md w-full mx-4 transition-all duration-200">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
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
