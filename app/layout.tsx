import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  adjustFontFallback: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookShare",
  description: "The best application to find desired books",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${montserrat.variable}`}>
      <body
        className={`${montserrat.className} antialiased tracking-normal leading-normal`}
      >
        {children}
      </body>
    </html>
  );
}
