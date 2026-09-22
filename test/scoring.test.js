const test = require("node:test");
const assert = require("node:assert/strict");

function score({ yesPrice, volumeUsdc, phase }) {
  const conviction = Math.min(100, Math.abs(Number(yesPrice) - .5) * 200);
  const liquidity = Math.min(100, Math.log10(1 + Number(volumeUsdc)) * 22);
  const phaseScore = phase === "secondary" ? 100 : phase === "primary" ? 72 : 40;
  return Math.round(conviction * .45 + liquidity * .35 + phaseScore * .2);
}

test("high-conviction liquid secondary markets rank above close low-volume primaries", () => {
  const strong = score({ yesPrice: .81, volumeUsdc: 40000, phase: "secondary" });
  const weak = score({ yesPrice: .51, volumeUsdc: 900, phase: "primary" });
  assert.ok(strong > weak);
});

test("score remains within 0–100", () => {
  assert.ok(score({ yesPrice: 1, volumeUsdc: 1e12, phase: "secondary" }) <= 100);
  assert.ok(score({ yesPrice: .5, volumeUsdc: 0, phase: "resolved" }) >= 0);
});
