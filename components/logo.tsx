// app/components/logo.tsx
// サイト全体の見出し（KODAIRA祭公式サイト）
// 画像は public/site-logo.svg。文字はアウトライン化（図形に変換）したものを置くこと。
// フォント指定のままだと、そのフォントがない端末では別の字体で表示される。
import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center justify-center pt-6">
      <Link
        href="/"
        className="block w-72 max-w-full"
        aria-label="KODAnnai トップへ"
      >
        <Image
          src="/kodannai.svg"
          alt="KODAnnai"
          width={800}
          height={143}
          className="h-auto w-full brightness-0 dark:invert"
          priority
        />
      </Link>
    </div>
  );
}
