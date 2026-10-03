import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import { ProductionThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

// Offline Geist fonts via `geist` package (bundles woff2 through next/font/local,
// no Google Fonts network fetch). GeistSans exposes --font-geist-sans and
// GeistMono exposes --font-geist-mono; alias them to the existing
// --font-interface / --font-data tokens consumed in globals.css.
const interfaceFont = GeistSans;
const dataFont = GeistMono;

export const metadata: Metadata = {
  title: "Restaurant Management System",
  description:
    "Comprehensive restaurant management system for orders, tables, menu, inventory, and POS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interfaceFont.variable} ${dataFont.variable} h-full antialiased`}
      style={
        {
          "--font-interface": "var(--font-geist-sans)",
          "--font-data": "var(--font-geist-mono)",
        } as CSSProperties
      }
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ProductionThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
          <Toaster position="top-right" richColors />
        </ProductionThemeProvider>
      </body>
    </html>
  );
}
