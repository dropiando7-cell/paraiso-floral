import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kids Check-In | Iglesia Central",
  description: "Sistema de control y seguridad de niños para servicios de iglesia",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#0F1628",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0F1628" }}>
        {children}
      </body>
    </html>
  );
}
