import type { CleaningTask, ServiceType } from "@/types";

type Template = Record<string, string[]>;

const REGULAR: Template = {
  Kitchen: ["Wipe worktops and splashbacks", "Clean hob and exterior of appliances", "Clean sink and taps", "Empty bin and mop floor"],
  Bathroom: ["Clean and descale toilet", "Clean sink, bath and shower", "Wipe mirrors and chrome", "Mop floor"],
  "Living areas": ["Dust surfaces and skirting", "Vacuum floors and sofas", "Mop hard floors"],
  Bedrooms: ["Dust surfaces", "Change bedding if left out", "Vacuum floors"],
};

const DEEP_EXTRAS: Template = {
  Kitchen: ["Clean inside oven and microwave", "Clean inside fridge", "Degrease extractor and cupboard fronts"],
  Bathroom: ["Scrub tile grout", "Descale shower head and taps"],
  "Whole property": ["Wipe doors, frames and light switches", "Clean inside windows and sills", "Vacuum under furniture"],
};

const TENANCY_EXTRAS: Template = {
  Kitchen: ["Clean inside oven, fridge and freezer", "Clean inside all cupboards"],
  "Whole property": ["Clean inside windows and frames", "Clean radiators and skirting", "Remove limescale throughout", "Final inspection against check-out list"],
};

const OFFICE: Template = {
  "Work areas": ["Empty bins and replace liners", "Dust desks and surfaces", "Vacuum floors"],
  Kitchenette: ["Clean sink and worktops", "Wipe appliances", "Restock supplies"],
  Washrooms: ["Clean and disinfect toilets and basins", "Refill soap and paper", "Mop floor"],
};

const BUILDERS: Template = {
  "Whole property": ["Remove dust from all surfaces and fittings", "Clean inside and out of windows", "Clean and degrease kitchen and bathrooms", "Remove stickers and residue", "Vacuum and mop all floors"],
};

function merge(...parts: Template[]): Template {
  const out: Template = {};
  for (const part of parts) for (const [area, items] of Object.entries(part)) out[area] = [...(out[area] ?? []), ...items];
  return out;
}

const TEMPLATES: Record<ServiceType, Template> = {
  regular_cleaning: REGULAR,
  deep_cleaning: merge(REGULAR, DEEP_EXTRAS),
  end_of_tenancy: merge(REGULAR, DEEP_EXTRAS, TENANCY_EXTRAS),
  office_cleaning: OFFICE,
  after_builders: BUILDERS,
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The default checklist a cleaner works through for a service. All un-ticked. */
export function defaultTasks(service: ServiceType): CleaningTask[] {
  const template = TEMPLATES[service] ?? REGULAR;
  return Object.entries(template).flatMap(([area, items]) =>
    items.map((label) => ({ key: `${slug(area)}--${slug(label)}`, label, area, done: false })),
  );
}

/** Same checklist with every tick cleared — used when a series spawns its next visit. */
export function resetTasks(tasks: CleaningTask[] | null | undefined, service: ServiceType): CleaningTask[] {
  return tasks && tasks.length ? tasks.map((t) => ({ ...t, done: false })) : defaultTasks(service);
}
