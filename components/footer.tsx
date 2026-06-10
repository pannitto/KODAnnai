// app/components/footer.tsx
import React from "react";
import Sparkle from "@/public/Sparkle.svg";

export default function Footer() {
  return (
    <footer className="flex items-center justify-center pt-4 pb-12">
      {/* 
        The div wrapper helps prevent layout clipping
        and makes sure the SVG scales responsively.
      */}
      <div className="w-full h-auto">
        <div className="flex justify-center">
          <Sparkle
            width="6rem"
            height="auto"
            className="brightness-0 dark:invert"
          />
        </div>
        <span className="block text-center text-foreground text-xs mt-2">
          © 2026 KODAIRA祭・Hideyuki Higashiyama Keigo Akazawa
        </span>
      </div>
    </footer>
  );
}
