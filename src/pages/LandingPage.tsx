import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { LandingNavbar } from '../features/landing/LandingNavbar';
import { HeroSection } from '../features/landing/HeroSection';
import { ValueSection } from '../features/landing/ValueSection';
import { WorkflowSection } from '../features/landing/WorkflowSection';
import { ProductShowcase } from '../features/landing/ProductShowcase';
import { TrustSection } from '../features/landing/TrustSection';
import { FinalCta, LandingFooter } from '../features/landing/FinalCta';
import '../styles/landing.css';

export default function LandingPage() {
  useEffect(() => {
    const documentRoot = document.documentElement;
    documentRoot.classList.add('guardian-landing');
    return () => documentRoot.classList.remove('guardian-landing');
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="lp-root">
        <a href="#landing-main" className="lp-skip">Skip to content</a>
        <LandingNavbar />
        <main id="landing-main" tabIndex={-1}>
          <HeroSection />
          <ValueSection />
          <WorkflowSection />
          <ProductShowcase />
          <TrustSection />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
