import type { Metadata } from "next";
import "../globals.css";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";

export const metadata: Metadata = {
  title: "Wymiany | BookShare",
  description: "The best application to find desired books",
};

export default function ExchangeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
