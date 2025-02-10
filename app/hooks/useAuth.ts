import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/firebase/config";

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
      throw error;
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

  return { registerUser, signInWithGoogle, loading };
};
