"use client";

import { EmailIcon } from "./components/svg-icons/EmailIcon";
import { LockIcon } from "./components/svg-icons/LockIcon";
import { GoogleIcon } from "./components/svg-icons/GoogleIcon";
import { AppleIcon } from "./components/svg-icons/AppleIcon";

export default function Login() {
  const videoSrc = "/movies/library-movie.mp4";

  return (
    <main className="relative w-full h-screen overflow-hidden">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{
          filter: "blur(3px)",
          transform: "scale(1.02)",
        }}
      ></video>
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0 flex justify-center items-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full h-auto">
          <h1 className="text-2xl font-bold text-center mb-6">Rejestracja</h1>
          <form className="my-8">
            <div className="flex shadow appearance-none border rounded-3xl w-full py-2 px-3 text-gray-700 mb-6 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
              <div className="flex justify-center items-center">
                <EmailIcon width={20} height={20} fill="gray" />
              </div>
              <input
                className="w-full focus:outline-none ml-3"
                id="email"
                type="email"
                placeholder="Email"
              />
            </div>
            <div className="flex shadow appearance-none border rounded-3xl w-full py-2 px-3 text-gray-700 mb-6 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
              <div className="flex justify-center items-center">
                <LockIcon width={20} height={20} fill="gray" />
              </div>
              <input
                className="w-full focus:outline-none focus:shadow-outline ml-3"
                id="password"
                type="password"
                placeholder="Hasło"
              />
            </div>
            <div className="flex shadow appearance-none border rounded-3xl w-full py-2 px-3 text-gray-700 mb-6 leading-tight transition-all duration-200 ease-in-out focus-within:ring-[0.5px] focus-within:ring-[--primaryColorLight] focus-within:border-[--primaryColorLight]">
              <div className="flex justify-center items-center">
                <LockIcon width={20} height={20} fill="gray" />
              </div>
              <input
                className="w-full focus:outline-none focus:shadow-outline ml-3"
                id="password"
                type="password"
                placeholder="Powtórz hasło"
              />
            </div>
            <div className="flex items-center justify-center mb-4">
              <button
                className="rounded-3xl bg-[--primaryColor] hover:bg-[--primaryColorLight] text-white font-bold py-2 px-4 focus:outline-none focus:shadow-outline"
                type="button"
              >
                Zarejestruj się
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
