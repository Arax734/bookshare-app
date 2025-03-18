"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import BackgroundVideo from "./components/BackgroundVideo";
import { EmailIcon } from "./components/svg-icons/EmailIcon";
import { LockIcon } from "./components/svg-icons/LockIcon";
import { GoogleIcon } from "./components/svg-icons/GoogleIcon";
import { FacebookIcon } from "./components/svg-icons/FacebookIcon";
import { UserIcon } from "./components/svg-icons/UserIcon";
import { useRouter } from "next/navigation";
import { useAuth } from "./hooks/useAuth";
import { updateProfile } from "firebase/auth";
import Link from "next/link";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { serverTimestamp } from "firebase/firestore";

const schema = yup.object().shape({
  firstName: yup
    .string()
    .required("Imię jest wymagane")
    .min(2, "Imię musi mieć co najmniej 2 znaki"),
  lastName: yup
    .string()
    .required("Nazwisko jest wymagane")
    .min(2, "Nazwisko musi mieć co najmniej 2 znaki"),
  email: yup
    .string()
    .required("Email jest wymagany")
    .email("Nieprawidłowy format email"),
  password: yup
    .string()
    .required("Hasło jest wymagane")
    .min(6, "Hasło musi mieć co najmniej 6 znaków"),
  repeatPassword: yup
    .string()
    .required("Powtórz hasło")
    .oneOf([yup.ref("password")], "Hasła nie są identyczne"),
});

type FormInputs = yup.InferType<typeof schema>;

export default function Register() {
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { registerUser, signInWithGoogle, signInWithFacebook, loading, user } =
    useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

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
        bio: "",
        createdAt: serverTimestamp(),
      });
    }
  };

  const onSubmit = async (data: FormInputs) => {
    try {
      const res = await registerUser(data.email, data.password);
      if (res) {
        const displayName = `${data.firstName} ${data.lastName}`;
        await updateProfile(res, {
          displayName: displayName,
        });

        // Create user document in Firestore
        await createUserDocument(res.uid, {
          email: data.email,
          displayName: displayName,
        });

        console.log("Użytkownik zarejestrowany:", res);
        router.push("/home");
      }
    } catch (e) {
      console.error("Błąd rejestracji:", e);
      setErrorMessage(
        e instanceof Error ? e.message : "Wystąpił błąd podczas rejestracji"
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        // Create user document for Google sign-in
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
        // Create user document for Facebook sign-in
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
    <main className="relative w-full h-screen overflow-hidden">
      <BackgroundVideo />
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0 flex justify-center items-center">
        <div className="bg-white p-6 rounded-3xl shadow-lg max-w-md w-full h-auto">
          <h1 className="text-xl text-black font-bold text-center mb-8">
            Rejestracja
          </h1>
          {errorMessage && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="my-4">
            {/* Name fields in a row */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="flex shadow appearance-none border rounded-3xl w-full py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                  <UserIcon width={20} height={20} fill="gray" />
                  <input
                    className="w-full focus:outline-none ml-3"
                    {...register("firstName")}
                    type="text"
                    placeholder="Imię"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <div className="flex shadow appearance-none border rounded-3xl w-full py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                  <UserIcon width={20} height={20} fill="gray" />
                  <input
                    className="w-full focus:outline-none ml-3"
                    {...register("lastName")}
                    type="text"
                    placeholder="Nazwisko"
                  />
                </div>
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email field */}
            <div className="mb-4">
              <div className="flex shadow appearance-none border rounded-3xl w-full py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                <div className="flex justify-center items-center">
                  <EmailIcon width={20} height={20} fill="gray" />
                </div>
                <input
                  className="w-full h-full focus:outline-none ml-3"
                  {...register("email")}
                  type="email"
                  placeholder="Email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-2">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password fields in a row */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="flex shadow appearance-none border rounded-3xl w-full py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                  <LockIcon width={20} height={20} fill="gray" />
                  <input
                    className="w-full focus:outline-none ml-3"
                    {...register("password")}
                    type="password"
                    placeholder="Hasło"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <div className="flex shadow appearance-none border rounded-3xl w-full py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                  <LockIcon width={20} height={20} fill="gray" />
                  <input
                    className="w-full focus:outline-none ml-3"
                    {...register("repeatPassword")}
                    type="password"
                    placeholder="Powtórz hasło"
                  />
                </div>
                {errors.repeatPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.repeatPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit button */}
            <div className="flex items-center justify-center mb-3 mt-8">
              <button
                type="submit"
                className="shadow rounded-3xl bg-[--primaryColor] hover:bg-[--primaryColorLight] text-white font-bold py-2 px-4 focus:outline-none focus:shadow-outline transition-all duration-300 transform hover:scale-105"
                disabled={loading}
              >
                {loading ? "Rejestracja..." : "Zarejestruj się"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-between my-8">
              <div className="h-[1px] w-full bg-gray-300 mr-2" />
              <label className="text-gray-500 whitespace-nowrap px-2">
                lub
              </label>
              <div className="h-[1px] w-full bg-gray-300 ml-2" />
            </div>

            {/* Social buttons */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex shadow border rounded-full w-auto py-2 px-3 text-gray-700 transition-transform duration-300 hover:scale-110"
                disabled={loading}
              >
                <GoogleIcon width={20} height={20} />
              </button>
              <button
                type="button"
                onClick={handleFacebookSignIn}
                className="flex shadow border rounded-full w-auto py-2 px-3 text-gray-700 transition-transform duration-300 hover:scale-110"
                disabled={loading}
              >
                <FacebookIcon width={20} height={20} />
              </button>
            </div>
          </form>

          {/* Login link */}
          <div className="text-center text-sm">
            <span className="text-gray-600">Masz już konto? </span>
            <Link
              href="/login"
              className="text-[--primaryColor] hover:text-[--primaryColorLight] font-semibold"
            >
              Zaloguj się
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
