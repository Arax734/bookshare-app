import { useState } from "react";
import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/config";

export const useAuth = () => {
  const [error, setError] = useState("");
  const [createUserWithEmailAndPassword, user, loading, userError] =
    useCreateUserWithEmailAndPassword(auth);

  const registerUser = async (email: string, password: string) => {
    try {
      const res = await createUserWithEmailAndPassword(email, password);
      if (res) {
        return { success: true, user: res };
      }
    } catch (e) {
      setError("Wystąpił błąd podczas rejestracji");
      return { success: false, error: e };
    }
  };

  return {
    registerUser,
    error,
    loading,
    user,
  };
};
