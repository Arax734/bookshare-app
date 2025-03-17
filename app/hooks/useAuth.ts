import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  AuthError,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
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

    // Other errors
    case "auth/account-exists-with-different-credential":
      return "To konto jest już połączone z inną metodą logowania";
    case "auth/popup-blocked":
      return "Popup został zablokowany. Zezwól na wyskakujące okienka i spróbuj ponownie";
    case "auth/popup-closed-by-user":
      return "Logowanie zostało przerwane. Spróbuj ponownie";
    case "auth/cancelled-popup-request":
      return "Poprzednie okno logowania nie zostało zamknięte";
    case "auth/user-not-found":
      return "Nie znaleziono konta połączonego z Facebookiem";

    default:
      console.error("Nieobsługiwany kod błędu:", errorCode);
      return "Wystąpił nieoczekiwany błąd";
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get ID token
        const token = await user.getIdToken();

        // Store token in cookie
        await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
      }

      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

      if (
        result.user.metadata.creationTime ===
        result.user.metadata.lastSignInTime
      ) {
      }

      setLoading(false);
      return result.user;
    } catch (error) {
      setLoading(false);
      const authError = error as AuthError;
      throw new Error(getAuthErrorMessage(authError.code));
    }
  };

  const signInWithFacebook = async () => {
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope("public_profile");

      const result = await signInWithPopup(auth, provider);
      const credential = FacebookAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (result.user && token) {
        const photoURL = `https://graph.facebook.com/${result.user.providerData[0].uid}/picture?type=large&access_token=${token}`;
        await updateProfile(result.user, {
          photoURL: photoURL,
        });
      }

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

  return {
    registerUser,
    signInUser,
    signInWithGoogle,
    signInWithFacebook,
    logout,
    loading,
    user,
  };
};
