import type { Metadata } from "next";
import "../globals.css";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";

export const metadata: Metadata = {
  title: "Strona główna | BookShare",
  description: "The best application to find desired books",
};

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
