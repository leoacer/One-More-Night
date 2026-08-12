// ══════════════════════════════════════════════════════════════════════
//  Render quality tiers.
//
//  One named tier drives everything: internal render scale, shadow map
//  size, how many real lights the pool can hold, texture anisotropy and
//  texture generation size, and how coarse the bloom downsample is.
//
//  Everything except texture size applies immediately. Texture size needs
//  the canvases regenerated and the materials rebound, so it lands on the
//  next night.
// ══════════════════════════════════════════════════════════════════════

export const TIERS = {
  low: {
    label: 'Low', render: 0.62, shadow: 512, pool: 5,
    aniso: 1, bloomDiv: 4, tex: 0.5, cone: false, shadows: true,
  },
  medium: {
    label: 'Medium', render: 0.85, shadow: 1024, pool: 7,
    aniso: 4, bloomDiv: 4, tex: 1, cone: true, shadows: true,
  },
  high: {
    label: 'High', render: 1.0, shadow: 1024, pool: 7,
    aniso: 8, bloomDiv: 4, tex: 1, cone: true, shadows: true,
  },
  ultra: {
    label: 'Ultra', render: 1.35, shadow: 2048, pool: 10,
    aniso: 16, bloomDiv: 2, tex: 2, cone: true, shadows: true,
  },
};

export const TIER_ORDER = ['low', 'medium', 'high', 'ultra'];

/** Settings used to store a bare render scale. Accept both. */
export function normaliseTier(value) {
  if (typeof value === 'string' && TIERS[value]) return value;
  const n = parseFloat(value);
  if (Number.isFinite(n)) {
    if (n <= 0.75) return 'low';
    if (n <= 0.9) return 'medium';
    if (n <= 1.05) return 'high';
    return 'ultra';
  }
  return 'high';
}

export const tierOf = (settings) => TIERS[normaliseTier(settings.quality)];
