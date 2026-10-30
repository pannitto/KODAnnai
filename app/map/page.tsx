import type { Metadata } from "next";
import MapPageClient from "./map-page-client";

export const metadata: Metadata = {
  title: "企画マップ | KODAIRA祭公式サイト",
  description: "KODAIRA祭の企画を地図から探せます。待ち時間・公演中の企画もひと目でわかります。",
};

export default function MapPage() {
  return <MapPageClient />;
}
