export const FRONT_LILY =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_192942_e1086505-d7da-433b-a59b-8220f4e6c808.png&w=1280&q=85';

export const REVEAL_LILY =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_151324_bf318a5f-5525-4fc7-aab5-e9a341018828.png&w=1280&q=85';

/**
 * The poster owns its own stylesheet rather than leaking into globals.css —
 * `orbit-lock` scopes the full-viewport, no-scroll behaviour to this route so
 * the dashboard keeps scrolling normally.
 *
 * FONTS: both faces are TrueType, weight 400, font-display: block, meant to
 * ship inline as base64 data-URLs. Paste the payloads into the two src() slots
 * below and uncomment. Until then the declared fallbacks carry the page:
 *   Orbit Sans    -> Arial, Helvetica, sans-serif
 *   Orbit Display -> "Times New Roman", Times, serif
 */
export const ORBIT_CSS = `
/*
@font-face {
  font-family: "Orbit Sans";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(data:font/ttf;base64,PASTE_ORBIT_SANS_BASE64_HERE) format("truetype");
}
@font-face {
  font-family: "Orbit Display";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(data:font/ttf;base64,PASTE_ORBIT_DISPLAY_BASE64_HERE) format("truetype");
}
*/

:root {
  --ink: #ffffff;
  --surface: #161616;
  --orb-reveal: cubic-bezier(.16, 1, .3, 1);
  --orb-soft: cubic-bezier(.25, .8, .28, 1);
}

html.orbit-lock,
html.orbit-lock body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--surface);
}

html.orbit-lock body {
  font-family: "Orbit Sans", Arial, Helvetica, sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.orbit *, .orbit *::before, .orbit *::after { box-sizing: border-box; }

.viewport {
  position: fixed;
  inset: 0;
  background: #000;
}

.stage {
  position: absolute;
  inset: 0;
  contain: strict;
  isolation: isolate;
  background: var(--surface);
}

/* ---------- brand mark (z 4) ---------- */

.brand-mark {
  position: absolute;
  top: 2.141745dvh;
  left: 3.854167vw;
  width: clamp(34px, min(3.4375vw, 5.2dvh), 66px);
  height: auto;
  z-index: 4;
  display: block;
}

.brand-mark line {
  stroke: var(--ink);
  stroke-width: 5px;
  stroke-linecap: square;
}

/* ---------- primary nav (z 4) ---------- */

.primary-nav {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  z-index: 4;
  pointer-events: none;
}

.primary-nav li {
  position: absolute;
  top: 3.426791dvh;
}

.primary-nav a {
  display: inline-block;
  pointer-events: auto;
  color: var(--ink);
  text-decoration: none;
  font-size: clamp(13px, min(1.302083vw, 2.05dvh), 25px);
  line-height: 1;
  white-space: nowrap;
  transform-origin: left center;
}

.nav-home      { left: 10.104167vw; }
.nav-resources { left: 17.526042vw; }
.nav-benefits  { left: 27.578125vw; }
.nav-contact   { left: 36.171875vw; }

.nav-home button      { transform: scaleX(1.165); }
.nav-resources button { transform: scaleX(1.052); }
.nav-benefits button  { transform: scaleX(1.126); }
.nav-contact button   { transform: scaleX(1.168); }

/* ---------- status pill (z 4) ---------- */

.pill {
  position: absolute;
  top: 2.336449dvh;
  right: 7.5vw;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  height: clamp(34px, 4.439252dvh, 57px);
  padding: 0 clamp(15px, 1.5625vw, 30px);
  border-radius: 999px;
  background: #fff;
  color: #161616;
  font-size: clamp(12px, min(1.09375vw, 1.72dvh), 21px);
  line-height: 1;
  letter-spacing: 0.026923em;
  white-space: nowrap;
  text-decoration: none;
}

/* ---------- wordmark (z 1) ---------- */

.orbit-word {
  position: absolute;
  top: 11.565421dvh;
  left: 4.348958vw;
  z-index: 1;
  margin: 0;
  font-family: "Orbit Display", "Times New Roman", Times, serif;
  font-weight: 400;
  font-size: min(27.8125vw, 55dvh);
  letter-spacing: 0.033708em;
  line-height: 1;
  white-space: nowrap;
}

.orbit-word__mask { display: block; }

.orbit-word__inner { display: inline-block; }

.orbit-word__white { color: var(--ink); }

.orbit-word__o {
  display: inline-block;
  transform: scaleX(1.0866);
  transform-origin: left center;
  margin-right: 0.042135em;
}

.orbit-word__pink {
  background: linear-gradient(180deg, #ffc5dc 0%, #fd86db 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* ---------- enter-app button (z 4) ---------- */

.enter-cta {
  position: absolute;
  top: 71.5dvh;
  left: 4.9vw;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 0.62em;
  height: clamp(44px, 6.1dvh, 74px);
  padding: 0 clamp(22px, 2.1vw, 40px);
  border-radius: 999px;
  background: #fff;
  color: #161616;
  font-size: clamp(14px, min(1.30208vw, 2.05dvh), 25px);
  line-height: 1;
  letter-spacing: 0.012em;
  white-space: nowrap;
  text-decoration: none;
  transition: transform 260ms var(--orb-soft), background-color 260ms var(--orb-soft);
}

.enter-cta:hover {
  background: #ffd9ea;
  transform: translateY(-2px);
}

.enter-cta svg {
  width: 0.86em;
  height: 0.86em;
  flex-shrink: 0;
}

.enter-cta path {
  stroke: #161616;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---------- flower stack (z 2) ---------- */

.flower {
  position: absolute;
  top: 14.749065dvh;
  left: 49.121328vw;
  height: 106.109034dvh;
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
}

.flower__sizer {
  visibility: hidden;
  display: block;
  height: 100%;
  width: auto;
}

.flower__layer { position: absolute; inset: 0; }

.flower__layer img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.flower__layer--top {
  -webkit-mask-image: linear-gradient(#0000, #0000);
  mask-image: linear-gradient(#0000, #0000);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}

/* ---------- corner copy (z 3) ---------- */

.support-copy {
  position: absolute;
  bottom: 4.361371dvh;
  z-index: 3;
  color: #f7f7f7;
  font-size: clamp(14px, min(1.40625vw, 2.102804dvh), 27px);
  line-height: 1.28;
  white-space: nowrap;
  margin: 0;
}

.support-copy--left {
  left: 3.177083vw;
  transform: scaleX(1.073);
  transform-origin: left bottom;
}

.support-copy--right {
  left: 78.28125vw;
  transform: scaleX(1.058);
  transform-origin: left bottom;
}

.support-copy__inner { display: block; }

/* ---------- mobile chrome ---------- */

.burger {
  display: none;
  position: absolute;
  top: 2.336449dvh;
  right: 5vw;
  z-index: 12;
  width: clamp(42px, 12vw, 56px);
  height: clamp(42px, 12vw, 56px);
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.burger span {
  display: block;
  width: 42%;
  height: 2px;
  margin: 3px auto;
  background: #161616;
  transition: transform 240ms var(--orb-soft), opacity 160ms linear;
}

.burger[aria-expanded="true"] span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
.burger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.burger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }

.scrim {
  display: none;
  position: absolute;
  inset: 0;
  z-index: 9;
  padding: 0;
  border: 0;
  background: rgba(8, 8, 8, .55);
  cursor: pointer;
  opacity: 0;
  transition: opacity 280ms var(--orb-soft);
}

.sheet {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  width: min(82vw, 380px);
  height: 100%;
  padding: 15dvh 8vw 6dvh;
  margin: 0;
  list-style: none;
  background: rgba(22, 22, 22, .72);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  backdrop-filter: blur(22px) saturate(140%);
  border-left: 1px solid rgba(255, 255, 255, .12);
  transform: translateX(100%);
  transition: transform 420ms var(--orb-reveal);
  display: none;
}

.sheet a {
  display: block;
  padding: .58em 0;
  color: var(--ink);
  text-decoration: none;
  font-size: clamp(20px, 5.6vw, 30px);
  line-height: 1.2;
}

html.menu-open .scrim { display: block; opacity: 1; }
html.menu-open .sheet { transform: translateX(0); }

/* ---------- nav + sheet buttons ---------- */

.primary-nav button {
  display: inline-block;
  pointer-events: auto;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  color: var(--ink);
  font: inherit;
  font-size: clamp(13px, min(1.302083vw, 2.05dvh), 25px);
  line-height: 1;
  white-space: nowrap;
  transform-origin: left center;
}

.sheet button {
  display: block;
  width: 100%;
  padding: .58em 0;
  border: 0;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  font: inherit;
  font-size: clamp(20px, 5.6vw, 30px);
  line-height: 1.2;
}

/* ---------- content panels (z 11) ---------- */

.panel-scrim {
  position: absolute;
  inset: 0;
  z-index: 11;
  padding: 0;
  border: 0;
  background: rgba(8, 8, 8, .62);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  cursor: pointer;
  animation: orb-dim 260ms var(--orb-soft) both;
}

.panel {
  position: absolute;
  z-index: 11;
  top: 50%;
  left: 50%;
  width: min(92vw, 720px);
  max-height: 78dvh;
  transform: translate(-50%, -50%);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #101010;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 1rem;
  padding: clamp(24px, 3.4vw, 44px);
  animation: panel-rise 420ms var(--orb-reveal) both;
}

@keyframes panel-rise {
  from { opacity: 0; transform: translate(-50%, -46%); }
  to   { opacity: 1; transform: translate(-50%, -50%); }
}

.panel__eyebrow {
  margin: 0;
  font-size: clamp(11px, 1.05vw, 13px);
  letter-spacing: .14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, .38);
}

.panel__title {
  margin: .5rem 0 0;
  font-family: "Orbit Display", "Times New Roman", Times, serif;
  font-weight: 400;
  font-size: clamp(30px, 4.4vw, 52px);
  line-height: 1;
  letter-spacing: .01em;
  color: var(--ink);
}

.panel__lede {
  margin: 1rem 0 0;
  font-size: clamp(14px, 1.3vw, 17px);
  line-height: 1.55;
  color: rgba(255, 255, 255, .55);
}

.panel__list {
  margin: 1.75rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 1px;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .1);
}

.panel__item {
  background: #101010;
  padding: 1rem 1.15rem;
}

.panel__item h3 {
  margin: 0;
  font-size: clamp(14px, 1.25vw, 16px);
  font-weight: 600;
  letter-spacing: -.01em;
  color: var(--ink);
}

.panel__item p {
  margin: .4rem 0 0;
  font-size: clamp(12px, 1.1vw, 14px);
  line-height: 1.5;
  color: rgba(255, 255, 255, .45);
}

.panel__links {
  margin: 1.75rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: .6rem;
}

.panel__links a {
  display: inline-flex;
  align-items: center;
  padding: .55em 1em;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 999px;
  color: rgba(255, 255, 255, .8);
  text-decoration: none;
  font-size: clamp(12px, 1.1vw, 14px);
  transition: border-color 200ms var(--orb-soft), color 200ms var(--orb-soft);
}

.panel__links a:hover {
  border-color: #fff;
  color: #fff;
}

.panel__close {
  float: right;
  margin: -.5rem -.5rem 0 0;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 999px;
  background: #101010;
  color: rgba(255, 255, 255, .7);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.panel__close:hover { border-color: #fff; color: #fff; }

.panel__foot {
  margin: 1.75rem 0 0;
  font-size: clamp(11px, 1vw, 13px);
  line-height: 1.55;
  color: rgba(255, 255, 255, .3);
}

/* ============================================================
   ENTRANCE
   ============================================================ */

@keyframes orb-word {
  from { transform: translateY(118%); }
  to   { transform: translateY(0); }
}

@keyframes orb-subject {
  from { opacity: 0; transform: translateX(-50%) translateY(3.4dvh); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes orb-corner {
  from { opacity: 0; transform: translateY(1.6dvh); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes orb-corner-centred {
  from { opacity: 0; transform: translateX(-50%) translateY(1.6dvh); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes orb-quiet {
  from { opacity: 0; transform: translateY(1.1dvh); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes orb-dim {
  from { opacity: 0; }
  to   { opacity: 1; }
}

html.anim .orbit-word__mask {
  overflow: hidden;
  padding-top: .18em;
  margin-top: -.18em;
  padding-bottom: .14em;
  margin-bottom: -.14em;
}

html.anim .brand-mark      { animation: orb-quiet 620ms var(--orb-soft) 100ms backwards; }
html.anim .nav-home        { animation: orb-dim 550ms var(--orb-soft) 180ms backwards; }
html.anim .nav-resources   { animation: orb-dim 550ms var(--orb-soft) 225ms backwards; }
html.anim .nav-benefits    { animation: orb-dim 550ms var(--orb-soft) 270ms backwards; }
html.anim .nav-contact     { animation: orb-dim 550ms var(--orb-soft) 315ms backwards; }
html.anim .pill            { animation: orb-quiet 620ms var(--orb-soft) 340ms backwards; }
html.anim .orbit-word__inner { animation: orb-word 1150ms var(--orb-reveal) 300ms backwards; }
html.anim .flower          { animation: orb-subject 1150ms var(--orb-reveal) 660ms backwards; }
html.anim .support-copy__inner { animation: orb-corner 720ms var(--orb-soft) 980ms backwards; }
html.anim .enter-cta       { animation: orb-corner 720ms var(--orb-soft) 1100ms backwards; }

/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 1200px), (orientation: portrait) {
  .orbit-word {
    left: 0;
    width: 100%;
    text-align: center;
  }

  .enter-cta {
    left: 50%;
    transform: translateX(-50%);
  }

  .enter-cta:hover {
    transform: translateX(-50%) translateY(-2px);
  }

  html.anim .enter-cta {
    animation-name: orb-corner-centred;
  }
}

@media (max-width: 900px), (max-aspect-ratio: 4 / 5) {
  .primary-nav, .pill { display: none; }
  .burger { display: flex; }
  .sheet { display: block; }

  html.anim .burger { animation: orb-quiet 620ms var(--orb-soft) 260ms backwards; }
  html.anim .brand-mark { animation-delay: 80ms; }
  html.anim .orbit-word__inner { animation-delay: 240ms; }
  html.anim .flower { animation-delay: 560ms; }
  html.anim .support-copy__inner { animation-delay: 840ms; }
}

@media (max-aspect-ratio: 4 / 5) {
  .flower {
    top: auto;
    bottom: 24dvh;
    left: 50vw;
    height: min(55dvh, 110vw);
  }

  .orbit-word {
    top: 13dvh;
    font-size: min(27.5vw, 18dvh);
  }

  .enter-cta {
    top: 34dvh;
    height: clamp(42px, 5.6dvh, 58px);
    font-size: clamp(13px, 3.7vw, 18px);
  }

  .support-copy {
    white-space: normal;
    width: 43vw;
    bottom: 3.6dvh;
    font-size: clamp(12px, 3.3vw, 17px);
  }

  .support-copy--left  { left: 5vw; transform: none; }
  .support-copy--right { left: 52vw; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  html.anim .stage { animation: orb-dim 280ms linear both; }

  html.anim .brand-mark,
  html.anim .primary-nav li,
  html.anim .pill,
  html.anim .burger,
  html.anim .orbit-word__inner,
  html.anim .flower,
  html.anim .enter-cta,
  html.anim .support-copy__inner { animation: none; }

  html.anim .orbit-word__mask {
    overflow: visible;
    padding: 0;
    margin: 0;
  }

  .burger span, .scrim, .sheet { transition: none; }
}
`;
