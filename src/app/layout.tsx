import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingChat } from "@/components/FloatingChat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Brightline Academy | Online Maths, Science & Coding Classes",
    template: "%s | Brightline Academy",
  },
  applicationName: "Brightline Academy",
  description: "Live interactive online tuition for Grades 6-12 in Maths, Science, and Coding. Expert teachers, small batches, and personalized learning.",
  keywords: ["Online tuition", "Maths classes", "Science classes", "Coding for kids", "Grade 6-12", "Brightline Academy", "Online classes", "CBSE Tuition", "IGCSE Maths", "Online Science Tutor"],
  icons: {
    icon: "/brightline-logo.png",
    apple: "/brightline-logo.png",
  },
  authors: [{ name: "Brightline Academy" }],
  creator: "Brightline Academy",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.brightlineacademy.com",
    siteName: "Brightline Academy",
    title: "Brightline Academy | Online Maths, Science & Coding Classes",
    description: "Live interactive online tuition for Grades 6-12 in Maths, Science, and Coding.",
    images: [
      {
        url: "/brightline-nav-logo.png", // Assuming we will create a social card or use the logo for now
        width: 1200,
        height: 630,
        alt: "Brightline Academy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brightline Academy",
    description: "Live interactive online tuition for Grades 6-12.",
    images: ["/brightline-nav-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://www.brightlineacademy.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <div className="fixed z-50">
            <FloatingChat />
          </div>
        </div>
      </body>
    </html>
  );
}
