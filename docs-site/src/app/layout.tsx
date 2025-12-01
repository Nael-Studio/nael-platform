import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DocsLayout } from "@/components/layout/docs-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nael Platform Documentation",
  description:
    "Official documentation for the Nael Platform Bun framework with Better Auth, GraphQL, and Dapr microservices.",
  metadataBase: new URL("https://nael.dev/docs"),
  openGraph: {
    title: "Nael Platform Documentation",
    description:
      "Scaffold Bun-native services with Better Auth, Apollo Federation, and Dapr microservices using the Nael Platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1 py-10">
              <div className="space-y-8 px-4 sm:px-6 lg:px-10 xl:px-16">
                <DocsLayout>{children}</DocsLayout>
              </div>
            </main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
