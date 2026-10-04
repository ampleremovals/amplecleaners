import { test } from "node:test";
import assert from "node:assert/strict";
import { hoursUntilJob, isWithinFreeChangeWindow, rescheduleBounds, isChangeable } from "../lib/bookings/timing";

// 2026-10-05 12:00 UTC = 13:00 BST (UK is on summer time until 25 Oct 2026)
const NOW = new Date("2026-10-05T12:00:00Z");

test("hoursUntilJob uses UK wall-clock time", () => {
  assert.equal(hoursUntilJob("2026-10-05", "15:00", NOW), 2); // 13:00 → 15:00 UK
  assert.equal(hoursUntilJob("2026-10-07", "13:00", NOW), 48);
  assert.equal(hoursUntilJob("2026-10-06", null, NOW), 20); // no time → 09:00 next day
  assert.ok(hoursUntilJob("2026-10-04", "09:00", NOW) < 0);
});

test("48h free-change window", () => {
  assert.equal(isWithinFreeChangeWindow("2026-10-07", "13:00", NOW), true); // exactly 48h
  assert.equal(isWithinFreeChangeWindow("2026-10-07", "12:59", NOW), false); // just inside
  assert.equal(isWithinFreeChangeWindow("2026-10-06", "09:00", NOW), false);
  assert.equal(isWithinFreeChangeWindow(null, null, NOW), true); // flexible
});

test("reschedule bounds are today+2 .. today+180 (UK date)", () => {
  assert.deepEqual(rescheduleBounds(NOW), { min: "2026-10-07", max: "2027-04-03" });
  // 23:30 UTC on 4 Oct is already 00:30 on 5 Oct in the UK
  assert.equal(rescheduleBounds(new Date("2026-10-04T23:30:00Z")).min, "2026-10-07");
});

test("changeable statuses", () => {
  assert.equal(isChangeable("cleaner_assigned"), true);
  assert.equal(isChangeable("in_progress"), false);
  assert.equal(isChangeable("paid"), false);
  assert.equal(isChangeable("cancelled"), false);
});
