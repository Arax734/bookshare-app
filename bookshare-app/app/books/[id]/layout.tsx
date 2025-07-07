import { Metadata } from "next";
import AuthenticatedLayout from "@/app/layouts/AuthenticatedLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const unwrappedParams = await params;
    const paddedId = unwrappedParams.id.padStart(14, "0");

    const response = await fetch(
      `https://data.bn.org.pl/api/networks/bibs.json?id=${paddedId}`,
      { next: { revalidate: 3600 } }
    );
    const data = await response.json();

    if (data.bibs && data.bibs[0]) {
      const book = data.bibs[0];
      return {
        title: `${book.title} | BookShare`,
        description: `Szczegóły książki "${book.title}" ${
          book.author ? `autorstwa ${book.author}` : ""
        }`,
        openGraph: {
          title: `${book.title} | BookShare`,
          description: `Szczegóły książki "${book.title}" ${
            book.author ? `autorstwa ${book.author}` : ""
          }`,
          type: "book",
        },
      };
    }
  } catch (error) {
    console.error("Error fetching book metadata:", error);
  }

  return {
    title: "Szczegóły książki | BookShare",
    description: "Szczegółowe informacje o książce",
    openGraph: {
      title: "Szczegóły książki | BookShare",
      description: "Szczegółowe informacje o książce",
      type: "book",
    },
  };
}

export default function BookLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
