import type { Metadata } from "next";
import { Inter, Lato } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const lato = Lato({ weight: ['400', '700', '900'], subsets: ["latin"], variable: '--font-lato' });

export const metadata: Metadata = {
  title: "Bioelectrónica Honduras - Enterprise Platform",
  description: "Plataforma de administración para Bioelectrónica Honduras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
