import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const fontSansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  weight: ["400", "500", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoodBus | 전세버스 비교 플랫폼",
  description: "원하는 일정에 맞는 전세버스를 쉽고 빠르게 비교하고 견적을 받아보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${fontSansKr.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
