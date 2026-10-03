import { LandingNavbar } from '../features/landing/LandingNavbar';
import { HeroSection } from '../features/landing/HeroSection';
import { ValueSection } from '../features/landing/ValueSection';
import { WorkflowSection } from '../features/landing/WorkflowSection';
import { ProductShowcase } from '../features/landing/ProductShowcase';
import { TrustSection } from '../features/landing/TrustSection';
import { FinalCta, LandingFooter } from '../features/landing/FinalCta';
import '../styles/landing.css';

export default function LandingPage() {
  return (
    <div className="lp-root">
      <LandingNavbar />
      <main>
        <HeroSection />
        <ValueSection />
        <WorkflowSection />
        <ProductShowcase />
        <TrustSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
