/** Stable A/B arm from a string (FNV-1a): the same recipient always gets the same arm. */
export function abArm(key: string): "A" | "B" {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2 === 0 ? "A" : "B";
}
