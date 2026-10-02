import type { PostcodeResult, AddressOption } from "@/types";

interface IdealPostcodesAddress {
  line_1: string;
  line_2: string;
  line_3: string;
  post_town: string;
  county: string;
  postcode: string;
}

interface IdealPostcodesResponse {
  code: number;
  message: string;
  result?: IdealPostcodesAddress[];
}

/**
 * Look up individual UK property addresses for a postcode via Ideal Postcodes.
 * Falls back to postcodes.io area-level result if no API key is configured.
 */
export async function getAddressesByPostcode(
  postcode: string
): Promise<PostcodeResult> {
  const trimmed = postcode.trim();
  const normalised = trimmed.toUpperCase();
  if (!trimmed) return { postcode: normalised, addresses: [] };

  const apiKey = process.env.IDEAL_POSTCODES_API_KEY;

  /* ── Ideal Postcodes (full individual addresses) ───────────────────── */
  if (apiKey) {
    try {
      const slug = normalised.replace(/\s+/g, "");
      const res = await fetch(
        `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(slug)}?api_key=${apiKey}`,
        { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
      );

      if (!res.ok) throw new Error(`Ideal Postcodes responded ${res.status}`);

      const data = (await res.json()) as IdealPostcodesResponse;

      if (data.code !== 2000 || !data.result?.length)
        throw new Error("Ideal Postcodes: no results");

      const addresses: AddressOption[] = data.result.map((a) => ({
        line_1: a.line_1,
        line_2: [a.line_2, a.line_3].filter(Boolean).join(", ") || undefined,
        city: a.post_town || a.county || undefined,
        postcode: a.postcode,
      }));

      return { postcode: normalised, addresses };
    } catch (err) {
      console.error("[postcode] Ideal Postcodes error:", err);
    }
  }

  /* ── postcodes.io fallback (area-level only) ───────────────────────── */
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
    );

    if (!res.ok) return { postcode: normalised, addresses: [] };

    const data = (await res.json()) as {
      status: number;
      result: {
        postcode: string;
        admin_district?: string | null;
        admin_ward?: string | null;
        region?: string | null;
      } | null;
    };

    if (data.status !== 200 || !data.result)
      return { postcode: normalised, addresses: [] };

    const r = data.result;
    return {
      postcode: r.postcode,
      addresses: [{ line_1: "", line_2: r.admin_ward ?? undefined, city: r.admin_district ?? undefined, postcode: r.postcode }],
    };
  } catch {
    return { postcode: normalised, addresses: [] };
  }
}

/** Validate a UK postcode (postcodes.io — always free). */
export async function isValidPostcode(postcode: string): Promise<boolean> {
  const trimmed = postcode.trim();
  if (!trimmed) return false;
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}/validate`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { result: boolean };
    return Boolean(data.result);
  } catch {
    return false;
  }
}

/**
 * Geocode a UK postcode to { lat, lng } via postcodes.io (free, no key).
 * Returns null if the postcode can't be resolved — callers treat coords as
 * optional. Used to stamp addresses for the driver map + arrival detection.
 */
export async function geocodePostcode(
  postcode: string
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = postcode?.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result: { latitude: number; longitude: number } | null;
    };
    if (!data.result || data.result.latitude == null || data.result.longitude == null) return null;
    return { lat: data.result.latitude, lng: data.result.longitude };
  } catch {
    return null;
  }
}

/**
 * Calculate distance between two UK postcodes in miles using postcodes.io
 * Returns distance in miles or null if postcodes are invalid
 */
export async function calculateDistance(
  postcode1: string,
  postcode2: string
): Promise<number | null> {
  if (!postcode1 || !postcode2) return null;

  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode1.trim())}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
    );

    if (!res.ok) return null;

    const data1 = (await res.json()) as {
      status: number;
      result: { latitude: number; longitude: number } | null;
    };

    if (data1.status !== 200 || !data1.result) return null;

    const res2 = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode2.trim())}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
    );

    if (!res2.ok) return null;

    const data2 = (await res2.json()) as {
      status: number;
      result: { latitude: number; longitude: number } | null;
    };

    if (data2.status !== 200 || !data2.result) return null;

    // Calculate distance using Haversine formula
    const lat1 = data1.result.latitude;
    const lon1 = data1.result.longitude;
    const lat2 = data2.result.latitude;
    const lon2 = data2.result.longitude;

    const R = 3959; // Radius of Earth in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error("Distance calculation error:", error);
    return null;
  }
}
