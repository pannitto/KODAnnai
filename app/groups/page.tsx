import type { Metadata } from "next";
import GroupsPageClient from "./groups-page-client";

export const metadata: Metadata = {
  title: "団体紹介 | KODAIRA祭公式サイト",
  description: "KODAIRA祭の参加団体・企画を、ジャンルや場所で絞り込んで探せます。",
};

export default function GroupsPage() {
  return <GroupsPageClient />;
}
