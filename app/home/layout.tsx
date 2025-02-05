import BaseLayout from "../layout";
import Navbar from "../components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <BaseLayout>
      <Navbar />
      {children}
    </BaseLayout>
  );
}
