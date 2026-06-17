import HomeClient from "@/components/home-client";
import { getAllWorks, getAllSections, getSiteSettings } from "@/lib/content";

export default function HomePage() {
  const works = getAllWorks();
  const sections = getAllSections();
  const settings = getSiteSettings();

  return (
    <HomeClient
      initialIntro={settings.introContent}
      initialTagline={settings.tagline}
      initialWorks={works}
      initialSections={sections}
      initialLoadError={false}
    />
  );
}
