// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
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
  description: "Balance and analyze your investment portfolio with clarity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-avocado-50 text-avocado-900`}
      >
        {/* Header */}
        <header className="border-b border-avocado-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Allocado logo"
                className="h-8 w-8"
                width={20}
                height={20}
              />
              <h1 className="text-xl font-semibold text-avocado-800 tracking-tight">Allocado</h1>
            </div>
            <nav className="space-x-6 text-sm font-medium text-avocado-700">
              <a href="/dashboard" className="hover:text-avocado-900 hover:underline">
                Dashboard
              </a>
              <a href="/assets" className="hover:text-avocado-900 hover:underline">
                Assets
              </a>
              <a href="/allocations" className="hover:text-avocado-900 hover:underline">
                Allocations
              </a>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10">
          <div className="card bg-(--color-surface)">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t border-avocado-200 bg-white/70 py-4 text-center text-sm text-avocado-700">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-avocado-800">Allocado</span> — built with Next.js &
          Supabase
        </footer>
      </body>
    </html>
  );
}
