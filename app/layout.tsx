import type { Metadata } from "next";
import { Playfair_Display, Crimson_Pro, Inter } from "next/font/google";
import { NostrProvider } from "@/app/components/NostrProvider";
import NsecGate from "@/app/components/NsecGate";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const crimson = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Whisper",
  description: "A calm Nostr reading experience",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/whisper-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/whisper-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${crimson.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NsecGate>
          <NostrProvider>{children}</NostrProvider>
        </NsecGate>
      </body>
    </html>
  );
}
