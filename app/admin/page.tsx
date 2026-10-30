import type { Metadata } from "next";
import AdminClient from "./admin-client";

export const metadata: Metadata = {
  title: "運営ページ | KODAIRA祭公式サイト",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
