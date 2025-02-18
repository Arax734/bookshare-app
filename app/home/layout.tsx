import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "../globals.css";

import Navbar from "../components/Navbar";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "BookShare",
  description: "The best application to find desired books",
};

export default function BaseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${roboto.className} ${roboto.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
