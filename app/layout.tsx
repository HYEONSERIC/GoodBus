import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/siteConfig";

const fontSansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  weight: ["400", "500", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | 전세버스 비교 플랫폼`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "버스대절",
    "버스 대절",
    "전세버스",
    "전세버스 견적",
    "전세버스 비교",
    "버스대절 가격",
    "버스대절 견적",
    "단체버스 예약",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: `${SITE_NAME} | 전세버스 비교 플랫폼`,
    title: `${SITE_NAME} | 전세버스 비교 플랫폼`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/pic/로고.png",
        width: 1254,
        height: 1254,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} | 전세버스 비교 플랫폼`,
    description: SITE_DESCRIPTION,
    images: ["/pic/로고.png"],
  },
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
