import { CtaBanner } from "@/features/home/CtaBanner/CtaBanner";
import { FeaturedServices } from "@/features/home/FeaturedServices/FeaturedServices";
import { HeroSlider } from "@/features/home/HeroSlider/HeroSlider";
import { IntroBlock } from "@/features/home/IntroBlock/IntroBlock";
import { LocationsPreview } from "@/features/home/LocationsPreview/LocationsPreview";
import { QuickLinks } from "@/features/home/QuickLinks/QuickLinks";
import { Testimonials } from "@/features/home/Testimonials/Testimonials";
import { VipTeaser } from "@/features/home/VipTeaser/VipTeaser";

export default function HomePage() {
  return (
    <>
      <title>Jack el Barbero · Barbería clásica en Buenos Aires</title>
      <HeroSlider />
      <QuickLinks />
      <IntroBlock />
      <FeaturedServices />
      <VipTeaser />
      <LocationsPreview />
      <Testimonials />
      <CtaBanner />
    </>
  );
}
