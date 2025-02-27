import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ThemeScript } from "./components/ThemeScript";

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
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pl"
      className={`${montserrat.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <ThemeProvider>
        <body
          className={`${montserrat.className} antialiased tracking-normal leading-normal transition-all duration-200`}
        >
          {children}
        </body>
      </ThemeProvider>
    </html>
  );
}
