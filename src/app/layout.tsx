import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Gravity Playground - How Does Gravity Work on Other Planets?",
  description:
    "Drop objects on different planets and see how gravity changes. An interactive 3D space experiment for kids.",
  openGraph: {
    title: "Gravity Playground",
    description: "What happens when you drop an elephant on Jupiter?",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
