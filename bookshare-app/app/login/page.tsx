"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import BackgroundVideo from "../components/BackgroundVideo";
import { EmailIcon } from "../components/svg-icons/EmailIcon";
import { LockIcon } from "../components/svg-icons/LockIcon";
import { GoogleIcon } from "../components/svg-icons/GoogleIcon";
import { FacebookIcon } from "../components/svg-icons/FacebookIcon";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import Link from "next/link";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";

const schema = yup.object().shape({
  email: yup
    .string()
    .required("Pole email jest wymagane")
    .email("Nieprawidłowy format adresu email")
    .trim(),
  password: yup
    .string()
    .required("Pole hasło jest wymagane")
    .min(1, "Hasło nie może być puste"),
});

type FormInputs = yup.InferType<typeof schema>;

const createUserDocument = async (
  userId: string,
  userData: {
    email: string;
    displayName: string;
    photoURL?: string | null;
  }
) => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: userData.email,
      displayName: userData.displayName || "Użytkownik",
      photoURL: userData.photoURL || null,
      phoneNumber: "",
      createdAt: serverTimestamp(),
    });
  }
};

export default function Login() {
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { signInUser, signInWithGoogle, signInWithFacebook, loading, user } =
    useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  const onSubmit = async (data: FormInputs) => {
    try {
      setErrorMessage("");
      const res = await signInUser(data.email.trim(), data.password);
      if (res) {
        await createUserDocument(res.uid, {
          email: res.email!,
          displayName: res.displayName || "Użytkownik",
          photoURL: res.photoURL || null,
        });
        console.log("Zalogowano pomyślnie:", res);
        router.push("/home");
      }
    } catch (e) {
      console.error("Błąd logowania:", e);
      setErrorMessage(
        e instanceof Error ? e.message : "Wystąpił błąd podczas logowania"
      );

      if (e instanceof Error && e.message.includes("hasło")) {
        reset({
          email: data.email,
          password: "",
        });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        await createUserDocument(user.uid, {
          email: user.email!,
          displayName: user.displayName!,
          photoURL: user.photoURL!,
        });
        console.log("Zalogowano przez Google:", user);
        router.push("/home");
      }
    } catch (e) {
      console.error("Błąd logowania przez Google:", e);
      setErrorMessage("Wystąpił błąd podczas logowania przez Google");
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      const user = await signInWithFacebook();
      if (user) {
        await createUserDocument(user.uid, {
          email: user.email!,
          displayName: user.displayName!,
          photoURL: user.photoURL!,
        });
        console.log("Zalogowano przez Facebook:", user);
        router.push("/home");
      }
    } catch (e) {
      console.error("Błąd logowania przez Facebook:", e);
      setErrorMessage("Wystąpił błąd podczas logowania przez Facebook");
    }
  };

  return (
    <main className="relative w-full min-h-screen overflow-hidden">
      <BackgroundVideo />
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0 flex justify-center items-center px-4 py-6 sm:px-0">
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg w-full max-w-[280px] xs:max-w-[320px] sm:max-w-sm">
          <h1 className="text-lg sm:text-xl text-black font-bold text-center mb-4 sm:mb-8">
            Logowanie
          </h1>
          {errorMessage && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded relative mb-4 text-xs sm:text-sm"
              role="alert"
            >
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="my-4 sm:my-6">
            <div className="mb-3 sm:mb-4">
              <div className="flex shadow appearance-none border rounded-2xl sm:rounded-3xl w-full py-2.5 sm:py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                <div className="flex justify-center items-center">
                  <EmailIcon width={18} height={18} fill="gray" />
                </div>
                <input
                  className="w-full h-full focus:outline-none ml-2 sm:ml-3 text-sm"
                  {...register("email")}
                  type="email"
                  placeholder="Email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 sm:mt-2">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="mb-3 sm:mb-4">
              <div className="flex shadow appearance-none border rounded-2xl sm:rounded-3xl w-full py-2.5 sm:py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                <div className="flex justify-center items-center">
                  <LockIcon width={18} height={18} fill="gray" />
                </div>
                <input
                  className="w-full h-full focus:outline-none ml-2 sm:ml-3 text-sm"
                  {...register("password")}
                  type="password"
                  placeholder="Hasło"
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 sm:mt-2">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center mb-3 sm:mb-4 mt-6 sm:mt-8">
              <button
                type="submit"
                className="shadow rounded-2xl sm:rounded-3xl bg-[--primaryColor] hover:bg-[--primaryColorLight] text-white font-bold py-2 px-4 focus:outline-none focus:shadow-outline text-sm"
                disabled={loading}
              >
                {loading ? "Logowanie..." : "Zaloguj się"}
              </button>
            </div>

            <div className="flex items-center justify-between mb-3 sm:mb-4 mt-6 sm:mt-8">
              <div className="h-[1px] w-full bg-gray-300 mr-2" />
              <label className="text-gray-500 text-xs sm:text-sm">lub</label>
              <div className="h-[1px] w-full bg-gray-300 ml-2" />
            </div>

            <div className="flex items-center justify-center gap-4 mb-6 sm:mb-8 mt-6 sm:mt-8">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex shadow border rounded-full w-auto py-1.5 sm:py-2 px-2.5 sm:px-3 text-gray-700 transition-transform duration-300 hover:scale-110"
                disabled={loading}
              >
                <GoogleIcon width={18} height={18} />
              </button>
              <button
                type="button"
                onClick={handleFacebookSignIn}
                className="flex shadow border rounded-full w-auto py-1.5 sm:py-2 px-2.5 sm:px-3 text-gray-700 transition-transform duration-300 hover:scale-110"
                disabled={loading}
              >
                <FacebookIcon width={18} height={18} />
              </button>
            </div>
          </form>

          <div className="flex-col flex text-center mt-2 sm:mt-3 text-xs sm:text-sm">
            <span className="text-gray-600">Nie masz jeszcze konta? </span>
            <Link
              href="/"
              className="text-[--primaryColor] hover:text-[--primaryColorLight] font-semibold mt-1"
            >
              Zarejestruj się
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
