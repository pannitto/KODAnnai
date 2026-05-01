import type { Metadata } from "next";
import { LOCATIONS } from "@/app/locations-server";
import HomePageClient from "@/app/home-page-client";

export type Location = {
  id: string;
  locid: string;
  name: string;
  category: string;
  organizer: string;
  position: string;
  keywords: string[];
};

export async function generateMetadata({
  searchParams,
}: any): Promise<Metadata> {
  // const searchParams = useSearchParams();
  const depId = searchParams.dep;
  const destId = searchParams.dest;
  const nav = searchParams.nav;
  const depName = LOCATIONS.find((loc) => loc.id === depId)?.name;
  const destName = LOCATIONS.find((loc) => loc.id === destId)?.name;
  let title = "KODAnnai | KODAIRA祭経路ナビ";
  let description = "KODAnnaiでKODAIRA祭を楽しもう！";
  if (depName && destName) {
    title = nav
      ? `${depName} から ${destName} | KODAnnai`
      : "KODAnnai | KODAIRA祭経路ナビ";
    description = `「${depName}」から「${destName}」へ、KODAnnaiでKODAIRA祭を楽しもう！`;
  } else if (depName) {
    title = nav ? `${depName} から | KODAnnai` : "KODAnnai | KODAIRA祭経路ナビ";
    description = `「${depName}」からどこへでも、KODAnnaiでKODAIRA祭を楽しもう！`;
  } else if (destName) {
    title = nav ? `${destName} へ | KODAnnai` : "KODAnnai | KODAIRA祭経路ナビ";
    description = `どこからでも「${destName}」へ、KODAnnaiでKODAIRA祭を楽しもう！`;
  }
  return {
    title,
    description,
  };
}

export default function Page() {
  return <HomePageClient />;
}
