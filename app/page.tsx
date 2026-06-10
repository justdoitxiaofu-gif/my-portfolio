import HomeClient from "@/components/home-client";
import { allWorks, introContent, siteConfig, detailSections } from "@/lib/static-data";

export default function HomePage() {
  return (
    <HomeClient
      initialIntro={introContent}
      initialTagline={siteConfig.tagline}
      initialWorks={allWorks}
      initialSections={detailSections}
      initialLoadError={false}
    />
  );
}
