import { OrbitPoster } from './src/components/landing/OrbitPoster';
import { FRONT_LILY, REVEAL_LILY } from './src/components/landing/orbit.css';

export const metadata = {
  title: 'Zylo — XRP, working on Flare',
  description: 'Bring XRP onto Flare as FXRP, put it to work, and redeem it back — from any wallet.',
};

export const viewport = {
  themeColor: '#161616',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

/** Applied during HTML parse so the entrance runs before first paint. */
const ORBIT_BOOT = `document.documentElement.classList.add('anim','orbit-lock')`;

export default function LandingPage() {
  return (
    <>
      <link rel="preload" as="image" href={FRONT_LILY} />
      <link rel="preload" as="image" href={REVEAL_LILY} />
      <script dangerouslySetInnerHTML={{ __html: ORBIT_BOOT }} />
      <OrbitPoster />
    </>
  );
}
