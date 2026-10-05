import type { ServiceType } from "@/types";
import { defaultTasks } from "@/lib/tasks-template";
import type { AreaTag } from "@/lib/seo/areas";

/**
 * The cleaning services that get local pages. `cleaning-services` is the
 * all-services page for an area; it has no single booking type (it books the
 * regular clean by default and links out to each specialist service).
 */
export type SeoServiceSlug = "house-cleaning" | "deep-cleaning" | "end-of-tenancy-cleaning" | "office-cleaning" | "after-builders-cleaning" | "cleaning-services";

export interface SeoService {
  slug: SeoServiceSlug;
  /** Booking-flow service type this page sends people to. */
  type: ServiceType;
  /** Plain-English name used in headings and titles ("House Cleaning"). */
  name: string;
  /** Lowercase noun phrase for mid-sentence use. */
  noun: string;
  /** Short value proposition for the hero. */
  promise: string;
  /** Who books this and why — written once per service. */
  audience: string;
  /** What the clean actually covers, in a sentence. */
  covers: string;
  /** Typical duration/process note (no invented numbers). */
  process: string;
  /** CTA label. */
  cta: string;
  /** Tag-specific local angles: the first tag the area has wins. */
  angles: Partial<Record<AreaTag, string>>;
  /** Fallback angle when no tag matches. */
  angleDefault: string;
  /** Service-level FAQs ({area} is replaced with the area name). */
  faqs: { q: string; a: string }[];
}

export const SEO_SERVICES: SeoService[] = [
  {
    slug: "house-cleaning", type: "regular_cleaning", name: "House Cleaning", noun: "house cleaning",
    promise: "Regular home cleaning at a fixed hourly price, with a vetted cleaner who knows your home.",
    audience: "Busy households, professionals and families who would rather spend evenings and weekends on anything but housework.",
    covers: "kitchens, bathrooms, living areas and bedrooms: surfaces, floors, appliances exteriors, sinks, toilets and bins.",
    process: "Choose how many hours you want, pick weekly, fortnightly or monthly, and we match you with a cleaner who comes at the same time each visit.",
    cta: "Get my price",
    angles: {
      commuter: "Commuting households love a clean that happens while they are out, so you come home to a tidy house on a set day.",
      family: "Family homes pick up mess fast, so a weekly or fortnightly visit keeps the kitchen, bathrooms and floors under control.",
      flats: "Flats are quick to tidy but still need bathrooms, kitchens and floors done properly, which suits a shorter regular visit.",
      leafy: "Larger homes with gardens are where extra hours help most, and you can set the time to suit the size of the house.",
      rental: "If you rent, a regular clean keeps the property in the condition your deposit depends on.",
    },
    angleDefault: "A regular clean on a fixed day takes the weekly chore off your list for good.",
    faqs: [
      { q: "How much does house cleaning cost in {area}?", a: "House cleaning is charged at a fixed hourly rate with a minimum number of hours. You pick the hours, see your exact total before you book, and the price does not change on the day." },
      { q: "Can I book the same cleaner each time in {area}?", a: "Yes. We aim to keep the same cleaner on your series of visits, so they learn your home and your preferences." },
      { q: "Do I need to be home during the clean?", a: "No. Many customers leave access instructions and are out during the visit. You can add notes for your cleaner when you book." },
      { q: "Do I need to provide cleaning products?", a: "Tell us when you book what you would like. Leave a note for your cleaner about products, equipment and anything to avoid." },
    ],
  },
  {
    slug: "deep-cleaning", type: "deep_cleaning", name: "Deep Cleaning", noun: "deep cleaning",
    promise: "A top-to-bottom clean that reaches the places a regular clean skips, for a fixed price.",
    audience: "People starting fresh in a new home, catching up after a busy period, or preparing for guests or a sale.",
    covers: "everything in a regular clean plus the inside of the oven, microwave and fridge, tile grout, taps and shower heads, doors and frames, light switches, inside windows and sills, and under the furniture.",
    process: "Tell us about the property and we send a fixed price. A deep clean is usually a one-off, and many customers follow it with a regular clean to keep it fresh.",
    cta: "Get my fixed price",
    angles: {
      period: "Older homes hold dust and limescale in details like skirting, window frames and original floors, which a deep clean tackles properly.",
      interwar: "Smaller, older rooms collect grime behind radiators and in corners, which is exactly what a deep clean is for.",
      family: "Busy family kitchens and bathrooms build up grease and limescale, and a deep clean resets them before you settle into a regular routine.",
      rental: "Tenants and landlords use a deep clean to bring a property back to a standard they are happy with.",
      newbuild: "Even new homes gather construction dust and marks, and a deep clean gets them to a standard you can enjoy.",
    },
    angleDefault: "A deep clean resets the whole home, so everything after it is easier to maintain.",
    faqs: [
      { q: "What is included in a deep clean in {area}?", a: "A deep clean covers everything in a regular clean plus the inside of the oven, microwave and fridge, tile grout, taps and shower heads, doors, frames, switches, inside windows and the areas under the furniture." },
      { q: "How is a deep clean different from a regular clean?", a: "A regular clean maintains a home that is already in good shape. A deep clean is slower and more detailed and reaches built-up grease, limescale and dust." },
      { q: "How much does deep cleaning cost in {area}?", a: "Deep cleans are quoted individually because the work depends on the size and condition of the property. You get a fixed price up front, with no obligation." },
      { q: "Can I add a regular clean afterwards?", a: "Yes. Many customers start with a deep clean and then move to a weekly or fortnightly regular clean." },
    ],
  },
  {
    slug: "end-of-tenancy-cleaning", type: "end_of_tenancy", name: "End of Tenancy Cleaning", noun: "end of tenancy cleaning",
    promise: "A thorough, agency-standard clean so you can hand back the keys and get your full deposit back.",
    audience: "Tenants leaving a rental, and landlords or agents preparing a property for the next tenant.",
    covers: "a full deep clean plus inside all cupboards, the oven, fridge and freezer, windows and frames, radiators, skirting, limescale removal and a final check against your check-out list.",
    process: "Tell us the property size and your move-out date and we send a fixed price. We clean against the check-out list so nothing is missed.",
    cta: "Get my fixed price",
    angles: {
      rental: "With so many rented homes nearby, letting agents here expect a thorough clean at check-out, and we clean to that standard.",
      flats: "Flats usually have a precise check-out list covering the oven, bathroom and windows, which is exactly what we work through.",
      newbuild: "Modern flats are often let with detailed inventories, and cleaning to them carefully protects your deposit.",
      period: "Period properties have details like sash windows and original floors that checkout inspections look at closely, and we clean those carefully.",
      family: "A family home that has been lived in for years needs a full reset before the keys go back, and that is what we do.",
    },
    angleDefault: "Leaving a rental properly cleaned is the simplest way to protect your deposit.",
    faqs: [
      { q: "Will I get my deposit back after an end of tenancy clean in {area}?", a: "Get your full deposit back is the aim, and it is why we clean against the check-out list. Landlords and agents decide deposit deductions, so we cannot guarantee their decision, but a thorough clean removes the most common reasons for deductions." },
      { q: "What is included in an end of tenancy clean?", a: "A full deep clean plus the inside of all cupboards, oven, fridge and freezer, windows and frames, radiators, skirting and limescale, finished with a check against your check-out list." },
      { q: "How much does end of tenancy cleaning cost in {area}?", a: "End of tenancy cleans are quoted by property size and condition. You get a fixed price before you commit, with no obligation." },
      { q: "Can you clean on the day I move out?", a: "Tell us your move-out date when you book and we will work around it. Booking early gives you the most choice of days." },
    ],
  },
  {
    slug: "office-cleaning", type: "office_cleaning", name: "Office Cleaning", noun: "office cleaning",
    promise: "Reliable commercial cleaning for offices and workspaces, on a schedule that suits your business.",
    audience: "Small businesses, studios, clinics and shared workspaces that need a clean, welcoming workplace without hiring in-house staff.",
    covers: "work areas, kitchenettes and washrooms: bins, desks and surfaces, floors, sinks and appliances, toilets and basins, with supplies restocked.",
    process: "Tell us about the premises and the hours that suit you and we send a fixed price for a regular schedule.",
    cta: "Get my fixed price",
    angles: {
      centre: "Town-centre premises see a lot of foot traffic, so a regular schedule keeps your workplace presentable for staff and visitors.",
      commuter: "Out-of-hours cleaning means your team arrives to a clean workplace without any disruption to the working day.",
      flats: "Shared and small commercial spaces need consistent washroom and kitchenette cleaning, which a regular visit handles.",
    },
    angleDefault: "A reliable regular clean keeps your workplace tidy for your team and your visitors.",
    faqs: [
      { q: "Can you clean our {area} office outside working hours?", a: "Yes. Tell us the times that suit you when you request a quote and we will plan the schedule around your business." },
      { q: "How much does office cleaning cost in {area}?", a: "Office cleaning is quoted individually based on the size of the premises and the schedule. You get a fixed price up front." },
      { q: "What does an office clean include?", a: "Work areas, kitchenettes and washrooms: bins, desks, floors, appliances, sinks, toilets, with supplies restocked." },
      { q: "Is regular office cleaning available?", a: "Yes. Most customers choose a weekly or more frequent schedule, and we aim to send the same cleaner each time." },
    ],
  },
  {
    slug: "after-builders-cleaning", type: "after_builders", name: "After Builders Cleaning", noun: "after builders cleaning",
    promise: "Post-construction cleaning that removes dust, residue and marks so your finished space is ready to enjoy.",
    audience: "Homeowners finishing an extension, loft conversion or refurbishment, and developers or landlords handing over a new or renovated property.",
    covers: "dust removal from every surface and fitting, inside and out of the windows, kitchens and bathrooms degreased and cleaned, stickers and residue removed, and floors vacuumed and mopped.",
    process: "Tell us about the property and the work done and we send a fixed price. We clean once the builders have gone and the dust has settled.",
    cta: "Get my fixed price",
    angles: {
      newbuild: "New developments and fresh builds leave fine dust and residue in every corner, and a builders' clean gets the home ready to live in.",
      period: "Renovating a period home creates dust that gets into every surface, and a specialist clean lets you enjoy the result.",
      family: "Extensions and loft conversions on family homes leave dust in every room, and a builders' clean gets life back to normal.",
      flats: "Refurbished flats need paint, dust and residue removed before anyone moves in.",
    },
    angleDefault: "Building work leaves fine dust everywhere, and a proper clean makes the finished space feel finished.",
    faqs: [
      { q: "When should an after builders clean happen in {area}?", a: "Once the builders have finished and the main dust has settled. That way we clean once, not repeatedly." },
      { q: "What is included in an after builders clean?", a: "Dust removal from all surfaces and fittings, windows inside and out, kitchen and bathroom degreasing, removal of stickers and residue, and vacuuming and mopping of all floors." },
      { q: "How much does after builders cleaning cost in {area}?", a: "After builders cleans are quoted individually because every job is different. You get a fixed price up front, with no obligation." },
      { q: "Can you clean after a renovation or an extension?", a: "Yes, whether it is a full renovation, an extension, a loft conversion or a new build." },
    ],
  },
  {
    slug: "cleaning-services", type: "regular_cleaning", name: "Cleaning Services", noun: "cleaning services",
    promise: "Home, deep, end of tenancy, office and after builders cleaning from one trusted local team.",
    audience: "Anyone who needs a clean done properly, whether it is a weekly visit or a one-off.",
    covers: "regular home cleaning, deep cleaning, end of tenancy cleaning, office cleaning and after builders cleaning.",
    process: "Pick the service you need, tell us about the property and get a fixed price. Regular cleaning shows your exact total instantly.",
    cta: "Get my price",
    angles: {
      centre: "Busy town-centre life leaves little time for housework, so a regular clean pays for itself in time saved.",
      rental: "A big rental market means plenty of moves, and end of tenancy and deep cleans are some of our most-booked services.",
      family: "Busy family homes benefit from a regular clean with a deep clean each season.",
      leafy: "Larger homes benefit from longer regular sessions and a deep clean every so often.",
    },
    angleDefault: "Whatever the job, one team and one booking process keeps it simple.",
    faqs: [
      { q: "What cleaning services do you offer in {area}?", a: "House cleaning, deep cleaning, end of tenancy cleaning, office cleaning and after builders cleaning." },
      { q: "How do I get a price for cleaning in {area}?", a: "Choose the service, tell us about the property and you will get a fixed price. House cleaning shows your exact total instantly." },
      { q: "Are your cleaners vetted?", a: "Our cleaners are DBS-checked, and we are fully insured." },
      { q: "Can I change or cancel a booking?", a: "Yes. You can change or cancel free up to 48 hours before your clean." },
    ],
  },
];

const BY_SLUG = new Map(SEO_SERVICES.map((s) => [s.slug, s]));
export const getSeoService = (slug: string): SeoService | undefined => BY_SLUG.get(slug as SeoServiceSlug);

/** Specialist services only (excludes the all-services page). */
export const SPECIALIST_SERVICES = SEO_SERVICES.filter((s) => s.slug !== "cleaning-services");

/** The real checklist from the cleaner app, grouped by area of the property, for a service. */
export function checklistFor(service: SeoService): { area: string; items: string[] }[] {
  const grouped = new Map<string, string[]>();
  for (const t of defaultTasks(service.type)) grouped.set(t.area, [...(grouped.get(t.area) ?? []), t.label]);
  return [...grouped].map(([area, items]) => ({ area, items }));
}
