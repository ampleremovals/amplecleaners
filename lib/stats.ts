/** Small, dependency-free statistics for reading A/B results honestly. Unit-tested. */

/** Standard normal CDF (Abramowitz–Stegun erf approximation, error < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export interface ZTestResult {
  rateA: number;
  rateB: number;
  /** Relative lift of B over A (e.g. 0.3 = B converts 30% better). null if A has no conversions. */
  relativeLift: number | null;
  z: number;
  /** Two-sided p-value. */
  pValue: number;
  /** True when p < 0.05 AND both groups have a reasonable sample. */
  significant: boolean;
}

/** Two-proportion z-test: did B convert differently from A, or is it noise? */
export function twoProportionZTest(convA: number, visitorsA: number, convB: number, visitorsB: number): ZTestResult {
  const rateA = visitorsA > 0 ? convA / visitorsA : 0;
  const rateB = visitorsB > 0 ? convB / visitorsB : 0;
  const pooled = visitorsA + visitorsB > 0 ? (convA + convB) / (visitorsA + visitorsB) : 0;
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(visitorsA, 1) + 1 / Math.max(visitorsB, 1)));
  const z = se > 0 ? (rateB - rateA) / se : 0;
  const pValue = se > 0 ? 2 * (1 - normalCdf(Math.abs(z))) : 1;
  const enoughData = convA + convB >= 10 && visitorsA >= 100 && visitorsB >= 100;
  return {
    rateA,
    rateB,
    relativeLift: rateA > 0 ? (rateB - rateA) / rateA : null,
    z,
    pValue,
    significant: enoughData && pValue < 0.05,
  };
}

/**
 * Rule-of-thumb visitors needed PER VARIANT to reliably detect a relative lift
 * (default 20%) at ~80% power, 5% significance: n ≈ 16·p(1−p)/δ².
 */
export function visitorsNeeded(baselineRate: number, relativeLift = 0.2): number | null {
  if (!(baselineRate > 0) || baselineRate >= 1) return null;
  const delta = baselineRate * relativeLift;
  return Math.ceil((16 * baselineRate * (1 - baselineRate)) / (delta * delta));
}
