"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          일시적인 오류가 발생했습니다.
        </p>
        <p style={{ color: "#666" }}>
          잠시 후 다시 시도해 주세요. 문제가 계속되면 고객센터로 문의해
          주세요.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- plain
            anchor on purpose: this page renders when the app itself crashed,
            so it must not depend on next/link's router context */}
        <a
          href="/"
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid #ddd",
            padding: "0.5rem 1.25rem",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          홈으로 돌아가기
        </a>
      </body>
    </html>
  );
}
