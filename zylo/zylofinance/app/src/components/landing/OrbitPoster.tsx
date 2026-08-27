"use client";

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FRONT_LILY, ORBIT_CSS, REVEAL_LILY } from './orbit.css';
import { PANELS, type PanelId } from './panels';
import {
  MorphTrailLayer,
  TRAIL_FADE_SPEED,
  TRAIL_HEAD_R,
  TRAIL_MAX_POINTS,
  TRAIL_SAMPLE_DIST,
  type TrailPoint,
} from './morphTrail';

const NAV: { id: PanelId | null; label: string; cls: string }[] = [
  { id: null, label: 'Home', cls: 'nav-home' },
  { id: 'resources', label: 'Resources', cls: 'nav-resources' },
  { id: 'benefits', label: 'Benefits', cls: 'nav-benefits' },
  { id: 'contact', label: 'Contact', cls: 'nav-contact' },
];

export const OrbitPoster = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const flowerRef = useRef<HTMLDivElement | null>(null);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const topLayerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLUListElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);

  // Full-viewport, no-scroll behaviour is scoped to this route only.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('orbit-lock');
    return () => {
      html.classList.remove('orbit-lock', 'anim', 'menu-open');
    };
  }, []);

  // Entrance runs once, then .anim is dropped for good.
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains('anim')) return;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(safety);
      html.classList.remove('anim');
    };

    const safety = setTimeout(finish, 6000);

    const watch = () => {
      const running = (document.getAnimations?.() ?? []).filter((a) => {
        const name = (a as CSSAnimation).animationName;
        return typeof name === 'string' && name.startsWith('orb-');
      });

      if (!running.length) {
        finish();
        return;
      }

      Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(finish);
    };

    const raf = requestAnimationFrame(() => requestAnimationFrame(watch));

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', menuOpen);
  }, [menuOpen]);

  useEffect(() => {
    if (!panel) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panel]);

  // Escape closes the sheet; Tab is trapped inside it while open.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        burgerRef.current?.focus();
        return;
      }

      if (e.key !== 'Tab') return;

      const items = Array.from(sheetRef.current?.querySelectorAll('a[href], button') ?? []);
      if (!items.length) return;

      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    (sheetRef.current?.querySelector('a[href], button') as HTMLElement | null)?.focus();

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Mouse morph-reveal trail.
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const stage = stageRef.current;
    const flower = flowerRef.current;
    const bg = bgLayerRef.current;
    const top = topLayerRef.current;
    if (!stage || !flower || !bg || !top) return;

    const layers = [new MorphTrailLayer(bg, false), new MorphTrailLayer(top, true)];

    let points: TrailPoint[] = [];
    let headRadius = 0;
    let hovering = false;
    let lastSample: { x: number; y: number } | null = null;
    let time = 0;
    let raf = 0;
    let rect: DOMRect | null = null;
    const pointer = { x: 0, y: 0 };

    const measure = () => {
      rect = flower.getBoundingClientRect();
      for (const layer of layers) layer.resize(rect.width, rect.height);
    };

    const toCanvas = (e: MouseEvent) => {
      if (!rect || !rect.width || !rect.height) measure();
      if (!rect) return;
      pointer.x = (e.clientX - rect.left) * (layers[0].width / rect.width);
      pointer.y = (e.clientY - rect.top) * (layers[0].height / rect.height);
    };

    const frame = () => {
      const targetR = hovering ? TRAIL_HEAD_R : 0;
      headRadius += (targetR - headRadius) * (hovering ? 0.14 : 0.04);

      if (hovering && headRadius > 5) {
        const far =
          !lastSample ||
          Math.hypot(pointer.x - lastSample.x, pointer.y - lastSample.y) > TRAIL_SAMPLE_DIST;

        if (far) {
          points.push({
            x: pointer.x,
            y: pointer.y,
            r: headRadius,
            alpha: 1,
            seed: Math.random() * 100,
          });
          lastSample = { x: pointer.x, y: pointer.y };
          if (points.length > TRAIL_MAX_POINTS) {
            points = points.slice(points.length - TRAIL_MAX_POINTS);
          }
        }
      }

      for (let i = points.length - 1; i >= 0; i--) {
        points[i].alpha *= TRAIL_FADE_SPEED;
        points[i].r *= 0.995;
        if (points[i].alpha < 0.01) points.splice(i, 1);
      }

      time += 0.016;

      if (points.length || headRadius > 0.5) {
        for (const layer of layers) layer.render(points, time);
        raf = requestAnimationFrame(frame);
      } else {
        headRadius = 0;
        lastSample = null;
        for (const layer of layers) layer.rest();
        raf = 0;
      }
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onEnter = (e: MouseEvent) => {
      measure();
      toCanvas(e);
      hovering = true;
      wake();
    };

    const onMove = (e: MouseEvent) => {
      toCanvas(e);
      hovering = true;
      wake();
    };

    const onLeave = () => {
      hovering = false;
      wake();
    };

    stage.addEventListener('mouseenter', onEnter);
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', measure);
    measure();

    return () => {
      stage.removeEventListener('mouseenter', onEnter);
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', measure);
      if (raf) cancelAnimationFrame(raf);
      for (const layer of layers) layer.destroy();
    };
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="orbit">
      <style dangerouslySetInnerHTML={{ __html: ORBIT_CSS }} />

      <main className="viewport">
        <section className="stage" ref={stageRef}>
          <svg className="brand-mark" viewBox="0 0 66 62" fill="none" aria-hidden="true">
            <line x1="33" y1="1" x2="33" y2="61" />
            <line x1="3" y1="31" x2="63" y2="31" />
            <line x1="11.8" y1="9.8" x2="54.2" y2="52.2" />
            <line x1="54.2" y1="9.8" x2="11.8" y2="52.2" />
          </svg>

          <nav aria-label="Primary">
            <ul className="primary-nav">
              {NAV.map((item) => (
                <li key={item.label} className={item.cls}>
                  <button type="button" onClick={() => setPanel(item.id)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <span className="pill">Coston2 testnet</span>

          <h1 className="orbit-word" id="orbit-title" aria-label="Zylo">
            <span className="orbit-word__mask">
              <span className="orbit-word__inner">
                <span className="orbit-word__white">
                  <span className="orbit-word__o">Z</span>Y
                </span>
                <span className="orbit-word__pink">LO</span>
              </span>
            </span>
          </h1>

          <div className="flower" ref={flowerRef}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="flower__sizer" src={FRONT_LILY} alt="" aria-hidden="true" />
            <div className="flower__layer flower__layer--bg" ref={bgLayerRef}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FRONT_LILY} alt="Pixel-art pink and violet lily" />
            </div>
            <div className="flower__layer flower__layer--top" ref={topLayerRef} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={REVEAL_LILY} alt="" />
            </div>
          </div>

          <Link className="enter-cta" href="/dashboard">
            <span>Launch app</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h13" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </Link>

          <p className="support-copy support-copy--left">
            <span className="support-copy__inner">
              Every XRP,
              <br />
              bridged and accounted for.
            </span>
          </p>

          <p className="support-copy support-copy--right">
            <span className="support-copy__inner">
              Less bridging friction.
              <br />
              More of your asset working.
            </span>
          </p>

          <button
            className="scrim"
            type="button"
            tabIndex={menuOpen ? 0 : -1}
            aria-label="Close menu"
            onClick={closeMenu}
          />

          <ul className="sheet" ref={sheetRef} aria-label="Primary" inert={!menuOpen}>
            {NAV.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    setPanel(item.id);
                    closeMenu();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
            <li>
              <Link href="/dashboard" onClick={closeMenu}>
                Launch app
              </Link>
            </li>
          </ul>

          {panel && (
            <>
              <button
                className="panel-scrim"
                type="button"
                aria-label="Close"
                onClick={() => setPanel(null)}
              />
              <section className="panel" role="dialog" aria-modal="true" aria-label={PANELS[panel].title}>
                <button
                  className="panel__close"
                  type="button"
                  aria-label="Close"
                  onClick={() => setPanel(null)}
                >
                  &times;
                </button>

                <p className="panel__eyebrow">{PANELS[panel].eyebrow}</p>
                <h2 className="panel__title">{PANELS[panel].title}</h2>
                <p className="panel__lede">{PANELS[panel].lede}</p>

                <ul className="panel__list">
                  {PANELS[panel].items.map((item) => (
                    <li className="panel__item" key={item.title}>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </li>
                  ))}
                </ul>

                {PANELS[panel].links && (
                  <ul className="panel__links">
                    {PANELS[panel].links!.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} target="_blank" rel="noreferrer">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {PANELS[panel].foot && <p className="panel__foot">{PANELS[panel].foot}</p>}
              </section>
            </>
          )}

          <button
            className="burger"
            ref={burgerRef}
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </section>
      </main>
    </div>
  );
};
