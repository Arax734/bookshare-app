"use client";

import { useState } from "react";
import BackgroundVideo from "./components/BackgroundVideo";
import { EmailIcon } from "./components/svg-icons/EmailIcon";
import { LockIcon } from "./components/svg-icons/LockIcon";
import { GoogleIcon } from "./components/svg-icons/GoogleIcon";
import { AppleIcon } from "./components/svg-icons/AppleIcon";
import { useRouter } from "next/navigation";
import { useAuth } from "./hooks/useAuth";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { registerUser, error, loading } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password || !repeatPassword) {
      setErrorMessage("Wszystkie pola są wymagane");
      return;
    }

    if (password !== repeatPassword) {
      setErrorMessage("Hasła nie są identyczne");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Hasło musi mieć co najmniej 6 znaków");
      return;
    }

    try {
      const res = await registerUser(email, password);
      if (res) {
        console.log("Użytkownik zarejestrowany:", res);
        setEmail("");
        setPassword("");
        setRepeatPassword("");
        router.push("/home");
      }
    } catch (e) {
      console.error("Błąd rejestracji:", e);
      setErrorMessage("Wystąpił błąd podczas rejestracji");
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
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <form onSubmit={handleRegister} className="my-8">
            <div className="flex shadow appearance-none border rounded-3xl w-full py-2 px-3 text-gray-700 mb-6 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
              <div className="flex justify-center items-center">
                <EmailIcon width={20} height={20} fill="gray" />
              </div>
              <input
                className="w-full focus:outline-none ml-3"
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex shadow appearance-none border rounded-3xl w-full py-2 px-3 text-gray-700 mb-6 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
              <div className="flex justify-center items-center">
                <LockIcon width={20} height={20} fill="gray" />
              </div>
              <input
                className="w-full focus:outline-none ml-3"
                id="password"
                type="password"
                placeholder="Hasło"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="flex shadow appearance-none border rounded-3xl w-full py-2 px-3 text-gray-700 mb-6 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
              <div className="flex justify-center items-center">
                <LockIcon width={20} height={20} fill="gray" />
              </div>
              <input
                className="w-full focus:outline-none ml-3"
                id="repeatPassword"
                type="password"
                placeholder="Powtórz hasło"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
                minLength={6}
              />
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
              <button className="flex shadow border rounded-full w-auto py-2 px-3 text-gray-700 transition-transform duration-300 hover:scale-110">
                <GoogleIcon width={20} height={20} />
              </button>
              <button className="ml-5 flex shadow border rounded-full w-auto py-2 px-3 text-gray-700 transition-transform duration-300 hover:scale-110">
                <AppleIcon width={20} height={20} fill="black" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
