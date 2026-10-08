import { test } from "node:test";
import assert from "node:assert/strict";
import { variantFor, isBot, variantFromPath, hash53 } from "../lib/experiments";
import { normalCdf, twoProportionZTest, visitorsNeeded } from "../lib/stats";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1";

test("variant assignment is stable for a visitor", () => {
  const v = variantFor("203.0.113.9", UA);
  for (let i = 0; i < 50; i++) assert.equal(variantFor("203.0.113.9", UA), v);
});

test("bots, crawlers, Lighthouse and missing data always get the control", () => {
  assert.equal(variantFor("203.0.113.9", "Googlebot/2.1 (+http://www.google.com/bot.html)"), "a");
  assert.equal(variantFor("203.0.113.9", "Mozilla/5.0 Chrome-Lighthouse"), "a");
  assert.equal(variantFor("203.0.113.9", "facebookexternalhit/1.1"), "a");
  assert.equal(variantFor(null, UA), "a");
  assert.equal(variantFor("203.0.113.9", null), "a");
  assert.equal(isBot(UA), false);
});

test("search-engine and link-preview tools are never shown the noindex variant", () => {
  const tools = [
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0)",
    "Mozilla/5.0 (compatible; GoogleOther)",
    "Mediapartners-Google",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "DuckDuckGo-Favicons-Bot/1.0",
    "Mozilla/5.0 (compatible; Yahoo! Slurp)",
    "Slackbot-LinkExpanding 1.0",
    "LinkedInBot/1.0",
    "Mozilla/5.0 Google Page Speed Insights",
  ];
  for (const ua of tools) assert.equal(variantFor("203.0.113.9", ua), "a", ua);
});

test("genuine browsers are NOT mistaken for bots (so the test still gets real traffic)", () => {
  const people = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/320.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 330.0",
  ];
  for (const ua of people) assert.equal(isBot(ua), false, ua);
});

test("the split is close to 50/50 across many visitors", () => {
  let b = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) if (variantFor(`198.51.${i % 250}.${Math.floor(i / 250)}`, UA + i) === "b") b++;
  assert.ok(b / n > 0.46 && b / n < 0.54, `B share was ${b / n}`);
});

test("path to variant mapping", () => {
  assert.equal(variantFromPath("/"), "a");
  assert.equal(variantFromPath("/lp/b"), "b");
  assert.equal(variantFromPath("/booking/regular_cleaning"), null);
  assert.notEqual(hash53("x"), hash53("y"));
});

test("normal CDF reference values", () => {
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 1e-3);
  assert.ok(Math.abs(normalCdf(-1.96) - 0.025) < 1e-3);
});

test("z-test: 10% vs 13% on 1000 visitors each is significant (p about 0.036)", () => {
  const r = twoProportionZTest(100, 1000, 130, 1000);
  assert.ok(Math.abs(r.z - 2.1) < 0.05, `z=${r.z}`);
  assert.ok(Math.abs(r.pValue - 0.036) < 0.005, `p=${r.pValue}`);
  assert.equal(r.significant, true);
  assert.ok(Math.abs((r.relativeLift ?? 0) - 0.3) < 1e-9);
});

test("z-test never calls noise or tiny samples significant", () => {
  assert.equal(twoProportionZTest(100, 1000, 104, 1000).significant, false);
  assert.equal(twoProportionZTest(1, 10, 6, 10).significant, false);
  assert.equal(twoProportionZTest(0, 0, 0, 0).pValue, 1);
  assert.equal(twoProportionZTest(0, 500, 5, 500).relativeLift, null);
});

test("visitors needed rule of thumb", () => {
  assert.equal(visitorsNeeded(0.05, 0.2), 7600);
  assert.equal(visitorsNeeded(0), null);
});
