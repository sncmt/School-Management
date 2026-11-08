import { ContactSection } from "@/components/marketing/ContactSection";
import { Features } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { ModuleMarquee } from "@/components/marketing/ModuleMarquee";
import { Pricing } from "@/components/marketing/Pricing";
import { getPublicPackages } from "@/lib/marketing/packages.server";

// One page: the menu jumps between its sections (features, pricing, contact).
export default async function HomePage() {
  // the packages as the platform admin set them, for the packages section and the contact form
  const packages = await getPublicPackages();
  return (
    <>
      <Hero />
      <ModuleMarquee />
      <Features />
      <Pricing packages={packages} />
      <ContactSection packages={packages} />
    </>
  );
}
