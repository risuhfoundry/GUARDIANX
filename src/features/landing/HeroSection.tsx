import { APP_PATH } from '../../lib/navigation';
import { HeroProduct } from './HeroProduct';
import { CtaLink, Eyebrow } from './primitives';

export function HeroSection() {
  return (
    <section className="lp-hero" aria-labelledby="hero-title">
      <div className="lp-hero__grid" aria-hidden="true" />
      <div className="lp-hero__light" aria-hidden="true" />

      <div className="lp-container lp-hero__copy">
        <div>
          <Eyebrow className="lp-hero__eyebrow"><span className="lp-hero__pip" aria-hidden="true" />GUARDIAN X</Eyebrow>
        </div>
        <h1 className="lp-h1" id="hero-title">
          <span className="lp-line">Student dismissal,</span>
          <span className="lp-line lp-line--dim">verified.</span>
        </h1>
        <p className="lp-hero__lead">
          A focused system for managing students, guardians and guardian palm-based dismissal verification.
        </p>
        <div className="lp-hero__ctas">
          <CtaLink href="#product" variant="primary" size="lg" arrow>Explore GUARDIAN X</CtaLink>
          <CtaLink href={APP_PATH} variant="secondary" size="lg">Sign in</CtaLink>
        </div>
      </div>

      <div className="lp-container lp-hero__stage">
        <div className="lp-hero__product">
          <HeroProduct />
        </div>
        <div className="lp-hero__floor" aria-hidden="true" />
      </div>
    </section>
  );
}
