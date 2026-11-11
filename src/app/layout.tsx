import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const serif = Source_Serif_4({
  variable: "--font-serif-doc",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Forum Naukowe",
    template: "%s · Forum Naukowe",
  },
  description: "Publikuj artykuły, notatki, rozprawki i eseje. Czytaj prace innych autorów.",
};

// Wszystkie strony czytają bazę i sesję, więc renderujemy je przy każdym żądaniu
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        <div className="flex-1">{children}</div>
        <footer className="print:hidden border-t border-line bg-white/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 text-sm text-muted flex flex-col sm:flex-row gap-2 justify-between">
            <span>© {new Date().getFullYear()} Forum Naukowe</span>
            <span>Artykuły, notatki i eseje autorów z całej Polski.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
