import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whoopie Pie University",
  description: "A Next.js and Supabase university operations starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
