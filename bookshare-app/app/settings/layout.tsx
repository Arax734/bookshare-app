import type { Metadata } from "next";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";

export const metadata: Metadata = {
  title: "Ustawienia | BookShare",
  description: "Ustawienia użytkownika",
};

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
