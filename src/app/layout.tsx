import type { Metadata, Viewport } from "next";
import { Inter, Lato } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const lato = Lato({ weight: ['400', '700', '900'], subsets: ["latin"], variable: '--font-lato' });

export const viewport: Viewport = {
  themeColor: "#0500A3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Bioelectrónica Honduras - Enterprise Platform",
  description: "Plataforma de administración para Bioelectrónica Honduras",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bio ERP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
