import type { Metadata } from "next";
import TimetablePageClient from "./timetable-page-client";

export const metadata: Metadata = {
  title: "タイムテーブル | KODAIRA祭公式サイト",
  description: "KODAIRA祭のステージ・公演のタイムテーブル。いま公演中のものがひと目でわかります。",
};

export default function TimetablePage() {
  return <TimetablePageClient />;
}
