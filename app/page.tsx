"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import BackgroundVideo from "./components/BackgroundVideo";
import { EmailIcon } from "./components/svg-icons/EmailIcon";
import { LockIcon } from "./components/svg-icons/LockIcon";
import { GoogleIcon } from "./components/svg-icons/GoogleIcon";
import { useRouter } from "next/navigation";
import { useAuth } from "./hooks/useAuth";
import Link from "next/link";

const schema = yup.object().shape({
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
  const { registerUser, signInWithGoogle, loading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormInputs) => {
    try {
      const res = await registerUser(data.email, data.password);
      if (res) {
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
        console.log("Zalogowano przez Google:", user);
        router.push("/home");
      }
    } catch (e) {
      console.error("Błąd logowania przez Google:", e);
      setErrorMessage("Wystąpił błąd podczas logowania przez Google");
    }
  };

  return (
    <main className="relative w-full h-screen overflow-hidden">
      <BackgroundVideo />
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0 flex justify-center items-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full h-auto">
          <h1 className="text-2xl font-bold text-center mb-6">Rejestracja</h1>
          {errorMessage && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="my-8">
            {/* Email input and error */}
            <div className="mb-6">
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

            {/* Password input and error */}
            <div className="mb-6">
              <div className="flex shadow appearance-none border rounded-3xl w-full py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                <div className="flex justify-center items-center">
                  <LockIcon width={20} height={20} fill="gray" />
                </div>
                <input
                  className="w-full h-full focus:outline-none ml-3"
                  {...register("password")}
                  type="password"
                  placeholder="Hasło"
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-2">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Repeat Password input and error */}
            <div className="mb-6">
              <div className="flex shadow appearance-none border rounded-3xl w-full py-3 px-3 text-gray-700 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
                <div className="flex justify-center items-center">
                  <LockIcon width={20} height={20} fill="gray" />
                </div>
                <input
                  className="w-full h-full focus:outline-none ml-3"
                  {...register("repeatPassword")}
                  type="password"
                  placeholder="Powtórz hasło"
                />
              </div>
              {errors.repeatPassword && (
                <p className="text-red-500 text-xs mt-2">
                  {errors.repeatPassword.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center mb-4">
              <button
                type="submit"
                className="rounded-3xl bg-[--primaryColor] hover:bg-[--primaryColorLight] text-white font-bold py-2 px-4 focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? "Rejestracja..." : "Zarejestruj się"}
              </button>
            </div>
            <div className="flex items-center justify-between mb-4 my-8">
              <div className="h-[1px] w-full bg-gray-300 mr-2" />
              <label className="text-gray-500">lub</label>
              <div className="h-[1px] w-full bg-gray-300 ml-2" />
            </div>
            <div className="flex items-center justify-center mb-4 my-8">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex shadow border rounded-full w-auto py-2 px-3 text-gray-700 transition-transform duration-300 hover:scale-110"
                disabled={loading}
              >
                <GoogleIcon width={20} height={20} />
              </button>
            </div>
          </form>
          <div className="text-center mt-4 text-sm">
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
