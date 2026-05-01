// app/components/logo.tsx
import React from "react";
import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center justify-center pt-6">
      <div className="w-full h-auto flex justify-center">
        <div className="w-64">
          <Image
            src="/kodannai.svg"
            alt="KODAnnai"
            width={800}
            height={200}
            className="w-full h-auto brightness-0 dark:invert"
            priority
          />
        </div>
      </div>
    </div>
  );
}
