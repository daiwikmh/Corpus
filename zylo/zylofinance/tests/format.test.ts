import { describe, expect, it } from 'vitest';
import { formatNumber, formatUsd } from '../app/src/services/analyticsService';
import { formatTimestamp } from '../app/src/services/transactionService';
import { explorerTx, explorerAddress, xrplExplorerTx, DROPS_PER_XRP } from '../app/src/utils/constants';
import { drawMorphBlob, TRAIL_BLOB_PTS } from '../app/src/components/landing/morphTrail';

describe('number formatting', () => {
  it('pads to the requested precision', () => {
    expect(formatNumber(1234.5, 2)).toBe('1,234.50');
    expect(formatNumber(0.123456, 4)).toBe('0.1235');
  });

  it('formats usd with a symbol', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(1234.567)).toBe('$1,234.57');
  });
});

describe('relative timestamps', () => {
  const now = () => Math.floor(Date.now() / 1000);

  it('describes very recent activity', () => {
    expect(formatTimestamp(now())).toBe('just now');
  });

  it('rolls up through minutes, hours and days', () => {
    expect(formatTimestamp(now() - 300)).toBe('5m ago');
    expect(formatTimestamp(now() - 7200)).toBe('2h ago');
    expect(formatTimestamp(now() - 172800)).toBe('2d ago');
  });

  it('falls back to a date beyond a week', () => {
    expect(formatTimestamp(now() - 60 * 60 * 24 * 30)).toMatch(/[A-Z][a-z]{2} \d+/);
  });
});

describe('explorer links', () => {
  it('builds flare tx and address links', () => {
    expect(explorerTx('0xabc')).toMatch(/\/tx\/0xabc$/);
    expect(explorerAddress('0xabc')).toMatch(/\/address\/0xabc$/);
  });

  it('points xrpl links at the ledger explorer', () => {
    expect(xrplExplorerTx('DEAD')).toMatch(/xrpl\.org\/transactions\/DEAD$/);
  });
});

describe('constants', () => {
  it('uses the XRPL drop scale', () => {
    expect(DROPS_PER_XRP).toBe(1_000_000);
  });
});

describe('morph blob geometry', () => {
  function recordingContext() {
    const calls: string[] = [];
    let curves = 0;
    return {
      calls,
      get curves() {
        return curves;
      },
      ctx: {
        beginPath: () => calls.push('begin'),
        moveTo: () => calls.push('move'),
        quadraticCurveTo: () => {
          curves++;
        },
        closePath: () => calls.push('close'),
        fill: () => calls.push('fill'),
      } as unknown as CanvasRenderingContext2D,
    };
  }

  it('draws one quadratic segment per blob point', () => {
    const rec = recordingContext();
    drawMorphBlob(rec.ctx, 100, 100, 140, 0, 1);
    expect(rec.curves).toBe(TRAIL_BLOB_PTS);
    expect(rec.calls).toEqual(['begin', 'move', 'close', 'fill']);
  });

  it('skips degenerate radii so tiny points cost nothing', () => {
    const rec = recordingContext();
    drawMorphBlob(rec.ctx, 0, 0, 1.5, 0, 1);
    expect(rec.calls).toEqual([]);
    expect(rec.curves).toBe(0);
  });

  it('is deterministic for a given time and seed', () => {
    const a = recordingContext();
    const b = recordingContext();
    drawMorphBlob(a.ctx, 10, 10, 100, 3.2, 42);
    drawMorphBlob(b.ctx, 10, 10, 100, 3.2, 42);
    expect(a.curves).toBe(b.curves);
  });
});
