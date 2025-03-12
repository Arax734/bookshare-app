"use client";

import { useEffect, useState, use } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import AuthenticatedLayout from "@/app/layouts/AuthenticatedLayout";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function ProfileLayout({ children, params }: LayoutProps) {
  const [userName, setUserName] = useState<string>("Użytkownik");
  const unwrappedParams = use(params);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", unwrappedParams.id));
        if (userDoc.exists()) {
          setUserName(userDoc.data().displayName || "Użytkownik");
          document.title = `${
            userDoc.data().displayName || "Użytkownik"
          } | BookShare`;
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    fetchUserName();
  }, [unwrappedParams.id]);

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
