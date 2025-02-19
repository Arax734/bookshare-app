import type { Metadata } from "next";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";

export const metadata: Metadata = {
  title: "Profil | BookShare",
  description: "Profil użytkownika",
};

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
