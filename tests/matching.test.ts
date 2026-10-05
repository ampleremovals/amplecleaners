import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rankCleaners, rejectionFor, explainNoMatch, estimateJobHours, postcodeMatchesPrefix, toMinutes, dayOfWeek,
  type MatchCleaner, type MatchJob, type BusySlot,
} from "../lib/automation/matching";

// 2026-10-05 is a Monday (dayOfWeek 1).
const MONDAY = "2026-10-05";

const cleaner = (over: Partial<MatchCleaner> = {}): MatchCleaner => ({
  id: "c1", fullName: "Amy", dbsVerified: true, ratingAvg: 4.5,
  coveragePrefixes: ["SW1"],
  availability: [{ dayOfWeek: 1, startMin: 8 * 60, endMin: 18 * 60 }],
  ...over,
});
const job = (over: Partial<MatchJob> = {}): MatchJob => ({
  cleanDate: MONDAY, startMin: 9 * 60, hours: 3, postcode: "SW1A 1AA", ...over,
});

test("helpers", () => {
  assert.equal(toMinutes("09:30:00"), 570);
  assert.equal(toMinutes(null), null);
  assert.equal(dayOfWeek(MONDAY), 1);
  assert.equal(postcodeMatchesPrefix("SW1A 1AA", "sw1"), true);
  assert.equal(postcodeMatchesPrefix("SW1A 1AA", "SE"), false);
  assert.equal(postcodeMatchesPrefix("SW1A 1AA", ""), false);
  assert.equal(estimateJobHours("regular_cleaning", [{ quantity: 4 }]), 4);
  assert.equal(estimateJobHours("regular_cleaning", []), 3);
  assert.equal(estimateJobHours("end_of_tenancy", [{ quantity: 99 }]), 6);
});

test("eligible cleaner is matched", () => {
  assert.equal(rejectionFor(job(), cleaner(), []), null);
});

test("rejects: not DBS verified / outside area / unavailable / clash", () => {
  assert.equal(rejectionFor(job(), cleaner({ dbsVerified: false }), []), "not_dbs_verified");
  assert.equal(rejectionFor(job(), cleaner({ coveragePrefixes: ["E1"] }), []), "outside_area");
  assert.equal(rejectionFor(job(), cleaner({ coveragePrefixes: [] }), []), "outside_area");
  assert.equal(rejectionFor(job(), cleaner({ availability: [] }), []), "unavailable");
  assert.equal(rejectionFor(job({ cleanDate: "2026-10-06" }), cleaner(), []), "unavailable"); // Tuesday
  // availability ends at 11:00 but the job runs 09:00-12:00
  assert.equal(rejectionFor(job(), cleaner({ availability: [{ dayOfWeek: 1, startMin: 480, endMin: 660 }] }), []), "unavailable");
  const busy: BusySlot[] = [{ cleanerId: "c1", date: MONDAY, startMin: 12 * 60, endMin: 15 * 60 }];
  // job ends 12:00, next starts 12:00 → inside the 30 min travel buffer
  assert.equal(rejectionFor(job(), cleaner(), busy), "clash");
});

test("travel buffer: a job that ends 30+ minutes before the next is fine", () => {
  const busy: BusySlot[] = [{ cleanerId: "c1", date: MONDAY, startMin: 12 * 60 + 30, endMin: 15 * 60 }];
  assert.equal(rejectionFor(job(), cleaner(), busy), null);
});

test("another cleaner's busy slot doesn't block this one", () => {
  const busy: BusySlot[] = [{ cleanerId: "other", date: MONDAY, startMin: 9 * 60, endMin: 12 * 60 }];
  assert.equal(rejectionFor(job(), cleaner(), busy), null);
});

test("no start time: needs any slot long enough that day", () => {
  assert.equal(rejectionFor(job({ startMin: null }), cleaner(), []), null);
  assert.equal(rejectionFor(job({ startMin: null, hours: 12 }), cleaner(), []), "unavailable");
});

test("ranking: preferred > lightest load > best rating", () => {
  const a = cleaner({ id: "a", fullName: "A", ratingAvg: 3 });
  const b = cleaner({ id: "b", fullName: "B", ratingAvg: 5 });
  const c = cleaner({ id: "c", fullName: "C", ratingAvg: 4 });
  const load = new Map([["a", 0], ["b", 2], ["c", 0]]);
  // load first: a and c tie at 0 → higher rating c wins; b busiest last
  assert.deepEqual(rankCleaners(job(), [a, b, c], [], load).map((r) => r.cleaner.id), ["c", "a", "b"]);
  // preferred overrides load
  assert.equal(rankCleaners(job({ preferredCleanerId: "b" }), [a, b, c], [], load)[0].cleaner.id, "b");
});

test("rankCleaners drops ineligible cleaners entirely", () => {
  const ok = cleaner({ id: "ok" });
  const bad = cleaner({ id: "bad", dbsVerified: false });
  assert.deepEqual(rankCleaners(job(), [bad, ok], [], new Map()).map((r) => r.cleaner.id), ["ok"]);
});

test("explainNoMatch is specific", () => {
  const msg = explainNoMatch(job(), [cleaner({ dbsVerified: false }), cleaner({ id: "x", coveragePrefixes: ["E1"] })], []);
  assert.match(msg, /2 active cleaners/);
  assert.match(msg, /1 not DBS-verified/);
  assert.match(msg, /1 don't cover SW1A 1AA/);
  assert.equal(explainNoMatch(job(), [], []), "there are no active cleaners on the roster");
});

test("time off blocks the dates inside the (inclusive) range only", () => {
  const away = cleaner({ timeOff: [{ start: "2026-10-05", end: "2026-10-07" }] });
  assert.equal(rejectionFor(job({ cleanDate: "2026-10-05" }), away, []), "time_off");
  assert.equal(rejectionFor(job({ cleanDate: "2026-10-07" }), away, []), "time_off");
  // Monday 12 Oct is outside the range, and the cleaner works Mondays
  assert.equal(rejectionFor(job({ cleanDate: "2026-10-12" }), away, []), null);
});

test("a cleaner who declined a job is never offered it again", () => {
  assert.equal(rejectionFor(job({ declinedBy: ["c1"] }), cleaner(), []), "declined");
  assert.equal(rejectionFor(job({ declinedBy: ["someone-else"] }), cleaner(), []), null);
  const ranked = rankCleaners(job({ declinedBy: ["a"] }), [cleaner({ id: "a" }), cleaner({ id: "b", fullName: "B" })], [], new Map());
  assert.deepEqual(ranked.map((r) => r.cleaner.id), ["b"]);
});

test("explainNoMatch mentions time off and declines", () => {
  const msg = explainNoMatch(job({ declinedBy: ["a"] }), [cleaner({ id: "a" }), cleaner({ id: "b", timeOff: [{ start: "2026-10-01", end: "2026-10-31" }] })], []);
  assert.match(msg, /1 already declined it/);
  assert.match(msg, /1 on time off/);
});
