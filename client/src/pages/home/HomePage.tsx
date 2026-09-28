import { Marquee } from "@/components/ui";
import { CtaBanner } from "@/features/home/CtaBanner/CtaBanner";
import { FeaturedServices } from "@/features/home/FeaturedServices/FeaturedServices";
import { Gallery } from "@/features/home/Gallery/Gallery";
import { HeroSlider } from "@/features/home/HeroSlider/HeroSlider";
import { IntroBlock } from "@/features/home/IntroBlock/IntroBlock";
import { LocationsPreview } from "@/features/home/LocationsPreview/LocationsPreview";
import { QuickLinks } from "@/features/home/QuickLinks/QuickLinks";
import { Testimonials } from "@/features/home/Testimonials/Testimonials";
import { VipTeaser } from "@/features/home/VipTeaser/VipTeaser";

const RITUAL = ["Corte clásico", "Fade a navaja", "Toalla caliente", "Afeitado ritual", "Perfilado de barba", "La Cava VIP"];
const CASA = ["Palermo", "Recoleta", "Microcentro", "Desde 2012", "Reservá online"];

export default function HomePage() {
  return (
    <>
      <title>Jack el Barbero · Barbería clásica en Buenos Aires</title>
      <HeroSlider />
      <Marquee items={RITUAL} />
      <QuickLinks />
      <IntroBlock />
      <FeaturedServices />
      <Marquee items={CASA} tone="outline" reverse speed={45} />
      <VipTeaser />
      <LocationsPreview />
      <Gallery />
      <Testimonials />
      <CtaBanner />
    </>
  );
}
