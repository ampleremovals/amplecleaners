import { test } from "node:test";
import assert from "node:assert/strict";
import { computeEarnings, hoursWorked, startOfWeek, type WorkedJob } from "../lib/earnings";

const job = (id: string, date: string, inT: string, outT: string): WorkedJob => ({
  id, reference: `REG-${id}`, service_type: "regular_cleaning", clean_date: date,
  clock_in_at: `${date}T${inT}:00Z`, clock_out_at: `${date}T${outT}:00Z`,
});

test("hoursWorked", () => {
  assert.equal(hoursWorked("2026-10-05T09:00:00Z", "2026-10-05T12:30:00Z"), 3.5);
  assert.equal(hoursWorked("2026-10-05T12:00:00Z", "2026-10-05T09:00:00Z"), 0); // clock skew never negative
});

test("startOfWeek is Monday", () => {
  assert.equal(startOfWeek("2026-10-04"), "2026-09-28"); // Sunday → previous Monday
  assert.equal(startOfWeek("2026-10-05"), "2026-10-05"); // Monday itself
  assert.equal(startOfWeek("2026-10-08"), "2026-10-05");
});

test("week / month / all-time buckets", () => {
  const today = "2026-10-08"; // Thursday; week starts Mon 2026-10-05
  const jobs = [
    job("a", "2026-10-07", "09:00", "12:00"), // this week, 3h
    job("b", "2026-10-02", "09:00", "11:00"), // this month, not this week, 2h
    job("c", "2026-09-20", "09:00", "13:00"), // last month, 4h
  ];
  const e = computeEarnings(jobs, 12.5, today);
  assert.deepEqual(e.week, { hours: 3, earned: 37.5 });
  assert.deepEqual(e.month, { hours: 5, earned: 62.5 });
  assert.deepEqual(e.allTime, { hours: 9, earned: 112.5 });
  assert.equal(e.recent.length, 3);
});

test("no pay rate set → hours counted, earned 0, payRate null", () => {
  const e = computeEarnings([job("a", "2026-10-07", "09:00", "12:00")], null, "2026-10-08");
  assert.equal(e.payRate, null);
  assert.equal(e.allTime.hours, 3);
  assert.equal(e.allTime.earned, 0);
});
