import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  AuthError,
  signOut,
} from "firebase/auth";
import { auth } from "@/firebase/config";

const getAuthErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    // Login errors
    case "auth/wrong-password":
      return "Nieprawidłowe hasło";
    case "auth/invalid-credential":
      return "Niepoprawne dane logowania";
    case "auth/invalid-email":
      return "Nieprawidłowy format adresu email";
    case "auth/user-disabled":
      return "To konto zostało zablokowane";
    case "auth/too-many-requests":
      return "Zbyt wiele nieudanych prób logowania. Spróbuj ponownie później";

    // Registration errors
    case "auth/email-already-in-use":
      return "Konto z tym adresem email już istnieje";
    case "auth/operation-not-allowed":
      return "Rejestracja jest obecnie niedostępna";
    case "auth/weak-password":
      return "Hasło jest zbyt słabe";

    default:
      console.error("Nieobsługiwany kod błędu:", errorCode);
      return "Wystąpił nieoczekiwany błąd";
  }
};

export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  const registerUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      setLoading(false);
      return userCredential.user;
    } catch (error) {
      setLoading(false);
      const authError = error as AuthError;
      throw new Error(getAuthErrorMessage(authError.code));
    }
  };

  const signInUser = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      setLoading(false);
      return userCredential.user;
    } catch (error) {
      setLoading(false);
      const authError = error as AuthError;

      if (!authError.code) {
        console.error("Unexpected error structure:", error);
        throw new Error("Wystąpił błąd podczas logowania");
      }

      throw new Error(getAuthErrorMessage(authError.code));
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setLoading(false);
      return result.user;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      throw new Error("Wystąpił błąd podczas wylogowywania");
    }
  };

  return { registerUser, signInUser, signInWithGoogle, logout, loading };
};
