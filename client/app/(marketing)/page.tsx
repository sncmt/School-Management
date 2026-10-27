import { ContactSection } from "@/components/marketing/ContactSection";
import { Features } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { ModuleMarquee } from "@/components/marketing/ModuleMarquee";
import { Pricing } from "@/components/marketing/Pricing";

// One page: the menu jumps between its sections (features, pricing, contact).
export default function HomePage() {
  return (
    <>
      <Hero />
      <ModuleMarquee />
      <Features />
      <Pricing />
      <ContactSection />
    </>
  );
}
