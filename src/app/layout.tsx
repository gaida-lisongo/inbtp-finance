import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import type { Metadata } from "next";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_HOST_URL ?? "http://localhost:3000"),
  title: {
    default: "ELMESACAD",
    template: "%s | ELMESACAD",
  },
  description:
    "ELMESACAD est un espace numerique de travail permettant le traitement administratif et la collaboration entre les etudiants, enseignants et la section.",
  applicationName: "ELMESACAD",
  icons: {
    icon: "/images/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="dark:bg-gray-900">
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
