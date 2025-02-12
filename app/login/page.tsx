"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import BackgroundVideo from "../components/BackgroundVideo";
import { EmailIcon } from "../components/svg-icons/EmailIcon";
import { LockIcon } from "../components/svg-icons/LockIcon";
import { GoogleIcon } from "../components/svg-icons/GoogleIcon";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import Link from "next/link";

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

export default function Login() {
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { signInUser, signInWithGoogle, loading } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormInputs) => {
    try {
      setErrorMessage("");
      const res = await signInUser(data.email.trim(), data.password);
      if (res) {
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
          <h1 className="text-2xl font-bold text-center mb-6">Logowanie</h1>
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

            {/* Login button */}
            <div className="flex items-center justify-center mb-6">
              <button
                type="submit"
                className="rounded-3xl bg-[--primaryColor] hover:bg-[--primaryColorLight] text-white font-bold py-2 px-4 focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? "Logowanie..." : "Zaloguj się"}
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
            <span className="text-gray-600">Nie masz jeszcze konta? </span>
            <Link
              href="/"
              className="text-[--primaryColor] hover:text-[--primaryColorLight] font-semibold"
            >
              Zarejestruj się
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
