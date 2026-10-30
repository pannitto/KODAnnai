import type { Metadata } from "next";
import RouteEditorClient from "./route-editor-client";

export const metadata: Metadata = {
  title: "経路の線データ作成 | KODAIRA祭公式サイト",
  robots: { index: false, follow: false },
};

export default function RouteEditorPage() {
  return <RouteEditorClient />;
}
