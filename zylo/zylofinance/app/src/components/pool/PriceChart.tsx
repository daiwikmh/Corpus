"use client";

import { useEffect, useRef } from 'react';

/**
 * TradingView's advanced chart, showing the public market for the underlying
 * asset. The dark pool's own book deliberately has no public feed — that is
 * the product — so this is a reference price, and the pool's own clearing
 * print is surfaced separately alongside it.
 */
export const PriceChart = ({ symbol, height = 380 }: { symbol: string; height?: number }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = container.current;
    if (!node) return;

    node.innerHTML = '';

    const mount = document.createElement('div');
    mount.className = 'tradingview-widget-container__widget';
    mount.style.height = '100%';
    node.appendChild(mount);

    const script = document.createElement('script');
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(0, 0, 0, 1)',
      gridColor: 'rgba(255, 255, 255, 0.06)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      autosize: true,
    });
    node.appendChild(script);

    return () => {
      node.innerHTML = '';
    };
  }, [symbol]);

  return (
    <div
      ref={container}
      className="tradingview-widget-container w-full"
      style={{ height }}
    />
  );
};
