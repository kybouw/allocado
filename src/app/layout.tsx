import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Allocado",
  description: "Goals-based asset allocation tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-avocado-50 text-avocado-900`}
        >
          <header className="border-b border-avocado-200 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="Allocado logo"
                  className="h-8 w-8"
                  width={32}
                  height={32}
                />
                <h1 className="text-xl font-semibold text-avocado-800 tracking-tight">Allocado</h1>
              </Link>
              <div className="flex items-center gap-6">
                <SignedIn>
                  <nav className="space-x-6 text-sm font-medium text-avocado-700">
                    <Link href="/dashboard" className="hover:text-avocado-900 hover:underline">
                      Dashboard
                    </Link>
                    <Link href="/goals" className="hover:text-avocado-900 hover:underline">
                      Goals
                    </Link>
                    <Link href="/accounts" className="hover:text-avocado-900 hover:underline">
                      Accounts
                    </Link>
                    <Link href="/assets" className="hover:text-avocado-900 hover:underline">
                      Assets
                    </Link>
                  </nav>
                  <UserButton afterSignOutUrl="/sign-in" />
                </SignedIn>
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-avocado-700 hover:text-avocado-900"
                  >
                    Sign in
                  </Link>
                </SignedOut>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10">
            {children}
          </main>

          <footer className="border-t border-avocado-200 bg-white/70 py-4 text-center text-sm text-avocado-700">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-avocado-800">Allocado</span>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
