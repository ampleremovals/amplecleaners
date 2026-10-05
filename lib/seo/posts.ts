import type { GuideSection } from "@/lib/seo/guides";

/**
 * "News & tips": short, timely posts (seasonal advice, company news). Evergreen
 * how-tos live in guides.ts. Same rules: useful, honest, no invented statistics,
 * no "best company" claims.
 */
export type PostCategory = "tips" | "tenants" | "landlords" | "offices" | "news";

export const POST_CATEGORIES: Record<PostCategory, { name: string; blurb: string }> = {
  tips: { name: "Home tips", blurb: "Seasonal and practical cleaning advice for your home." },
  tenants: { name: "For tenants", blurb: "Renting, moving out and protecting your deposit." },
  landlords: { name: "For landlords", blurb: "Turnarounds, void periods and keeping a property in shape." },
  offices: { name: "For offices", blurb: "Keeping a workplace clean and presentable." },
  news: { name: "Company news", blurb: "What is new at Ample Cleaners." },
};

export interface Post {
  slug: string;
  title: string;
  /** Meta description / share text (<= 158 chars). */
  description: string;
  summary: string;
  category: PostCategory;
  /** ISO date. Newest first on the blog. */
  published: string;
  minutes: number;
  intro: string;
  sections: GuideSection[];
  /** Guide slugs worth reading next. */
  relatedGuides: string[];
}

export const POSTS: Post[] = [
  {
    slug: "autumn-cleaning-checklist",
    title: "Your Autumn Cleaning Checklist: 8 Jobs Before the Cold Sets In",
    description: "Eight jobs worth doing in autumn: windows, radiators, extractor filters, bedding and more, so your home is ready for the colder months indoors.",
    summary: "Eight jobs worth doing now, before the heating goes on and the windows stay shut.",
    category: "tips", published: "2026-10-05", minutes: 3,
    intro: "From now until spring, you will spend more time indoors with the windows shut, so autumn is a good time to reset the things that build up unnoticed.",
    sections: [
      { h: "The eight jobs", ol: ["Clean the insides of windows and wipe the sills and frames, because condensation shows up on dirty glass first", "Dust and wipe radiators, including behind them, before the heating goes on", "Wash curtains, cushion covers and throws", "Clean the extractor filter and the hob area, since you will be cooking more", "Deep clean the oven and the fridge", "Turn and vacuum mattresses, and swap lighter bedding for winter bedding", "Declutter the hallway and sort coats, shoes and umbrellas", "Check and clean the bathroom extractor fan and wipe any early signs of mould"] },
      { h: "If time is short", p: ["Do the kitchen and the windows first, because they make the biggest visible difference. A deep clean can cover most of the rest in one visit."] },
    ],
    relatedGuides: ["deep-cleaning-checklist", "how-to-clean-windows-streak-free", "how-to-remove-limescale-and-mould-bathroom"],
  },
  {
    slug: "winter-condensation-and-mould-tips",
    title: "Condensation and Mould in Winter: Simple Ways to Keep It Under Control",
    description: "Why condensation and mould appear in winter, and the simple habits that keep them in check, including what renters should report to their landlord.",
    summary: "Everyday habits that cut condensation, and what to report to your landlord.",
    category: "tenants", published: "2026-10-04", minutes: 4,
    intro: "Warm, damp air meets cold surfaces and turns into water, which is why windows and corners get wet in winter. Left alone, damp surfaces are where mould grows.",
    sections: [
      { h: "Everyday habits that help", ul: ["Ventilate: open a window briefly while cooking, showering and drying washing, or use the extractor fan", "Wipe condensation from windows and sills in the morning", "Keep furniture a little away from external walls so air can circulate", "Dry washing outside or in a ventilated room where you can", "Keep a steady, moderate heating level rather than short bursts"] },
      { h: "Cleaning mould", ul: ["Ventilate first, and wear gloves", "Use a mould remover and follow the label; never mix products, especially with bleach", "Wipe and dry the surface afterwards"] },
      { h: "If you rent", p: ["Condensation from everyday living can usually be managed with the habits above. Mould caused by leaks, rising damp or poor ventilation is generally for the landlord to fix, so report it early and in writing, with photos, and keep a copy. Shelter and gov.uk have guidance if it is not dealt with."] },
    ],
    relatedGuides: ["how-to-remove-limescale-and-mould-bathroom", "how-to-get-your-deposit-back-england"],
  },
  {
    slug: "landlords-prepare-your-property-before-winter",
    title: "Landlords: Prepare Your Property Before Winter",
    description: "A short checklist for landlords and agents: deep cleaning, damp checks, and turnaround planning so empty periods are short and the property is ready.",
    summary: "A short pre-winter checklist for landlords and agents.",
    category: "landlords", published: "2026-10-03", minutes: 3,
    intro: "Winter lets are often slower, so shorter void periods matter. A property that is clean, dry and well presented lets and re-lets faster.",
    sections: [
      { h: "Before winter", ul: ["Check for damp, leaks and failing seals now, and fix them before they spread", "Make sure extractor fans and vents work and are clean", "Bleed radiators and check the heating", "Have the property deep cleaned between tenants, including ovens, windows and carpets"] },
      { h: "Plan the turnaround", p: ["Book the repairs first, then the clean, then the viewings. Photographs after the clean double as a record for the new inventory."] },
    ],
    relatedGuides: ["landlord-guide-cleaning-between-tenants", "how-to-remove-limescale-and-mould-bathroom"],
  },
  {
    slug: "keeping-your-office-clean-through-winter",
    title: "Keeping Your Office Clean and Welcoming Through Winter",
    description: "Practical tips for small offices in winter: entrances, floors, shared kitchens and washrooms, and keeping the workplace fresh with the windows closed.",
    summary: "Entrances, floors, kitchenettes and washrooms in the busy winter months.",
    category: "offices", published: "2026-10-02", minutes: 3,
    intro: "Wet shoes, coats and closed windows put extra pressure on a workplace in winter, and visitors notice the entrance and washrooms first.",
    sections: [
      { h: "Where to focus", ul: ["Entrance: use good mats, and mop the entrance daily in wet weather", "Floors: vacuum and mop more often to keep the grit down", "Kitchenette and washrooms: wipe shared surfaces and keep soap and paper stocked", "Bins: empty daily, and keep recycling separate", "Ventilation: a few minutes of fresh air a day makes a difference"] },
      { h: "A schedule that works", p: ["A regular, out-of-hours clean means your team arrives to a clean space without anyone giving up their time to do it."] },
    ],
    relatedGuides: ["office-cleaning-checklist"],
  },
  {
    slug: "check-in-inventory-tips-for-tenants",
    title: "New Tenancy? Do These Five Things in Your First Week",
    description: "Five things new tenants should do in the first week: check the inventory, photograph everything, test the alarms and note any problems in writing.",
    summary: "Five first-week jobs that make moving out much easier.",
    category: "tenants", published: "2026-10-01", minutes: 3,
    intro: "The first week of a tenancy is the best moment to protect your deposit. What you record now is what the property is compared with when you leave.",
    sections: [
      { h: "The five things", ol: ["Read the check-in inventory carefully and note anything missing or wrong, in writing", "Take dated photos and videos of every room, including inside cupboards and appliances", "Check that smoke and carbon monoxide alarms work", "Take meter readings with a dated photo", "Find out which deposit scheme holds your deposit and keep the details"] },
      { h: "Why it matters", p: ["Disputes at the end of a tenancy usually come down to evidence of the original condition. A good record from week one makes them easy to resolve."] },
    ],
    relatedGuides: ["how-to-get-your-deposit-back-england", "end-of-tenancy-cleaning-checklist"],
  },
  {
    slug: "now-covering-50-areas-east-london",
    title: "Ample Cleaners Now Covers 50 Areas Across East London",
    description: "Ample Cleaners now offers house, deep, end of tenancy, office and after builders cleaning across 50 areas, from Barking and Dagenham to Romford and Ilford.",
    summary: "Local pages for cleaning in 50 areas, from Barking to Loughton.",
    category: "news", published: "2026-09-30", minutes: 2,
    intro: "We have launched local pages for 50 areas across Barking and Dagenham, Romford and Havering, Ilford and Redbridge, Newham and the Essex border, so you can see exactly what we offer near you.",
    sections: [
      { h: "What you will find", ul: ["Pages for house cleaning, deep cleaning, end of tenancy cleaning, office cleaning and after builders cleaning in each area", "An all-services page for every area", "Fixed prices, DBS-checked cleaners and free changes up to 48 hours before your clean", "We are fully insured"] },
      { h: "How to book", p: ["Choose your area and service, tell us about the property and get a fixed price. House cleaning shows your exact total instantly, and you pay a deposit to secure your date."] },
    ],
    relatedGuides: ["how-to-choose-a-cleaning-company", "how-much-does-a-cleaner-cost-london"],
  },
  {
    slug: "before-your-cleaner-arrives",
    title: "Before Your Cleaner Arrives: 7 Things That Make the Clean Better",
    description: "Seven simple things to do before a cleaner arrives, from clearing surfaces to leaving clear notes, so every hour of the clean is spent cleaning.",
    summary: "Seven small things that make every hour of a clean count.",
    category: "tips", published: "2026-10-05", minutes: 3,
    intro: "A cleaner can only clean what they can reach. A few minutes of preparation means their time goes on cleaning rather than tidying.",
    sections: [
      { h: "The seven things", ol: ["Clear surfaces and put away small items, especially in the kitchen and bathroom", "Pick clothes and toys up off the floors", "Tell your cleaner about priorities, such as the oven or a particular room", "Leave clear access instructions, such as a key safe code, and let them know about pets", "Point out anything delicate or valuable, and anything that should not be moved", "Mention surfaces that need special care, such as natural stone or a wooden floor", "Put out any products you would like used, or note any you would like avoided"] },
      { h: "You do not need to tidy everything", p: ["Cleaners are used to normal homes. The goal is clear surfaces and clear notes, not a spotless house before the clean starts."] },
    ],
    relatedGuides: ["cleaning-routine-for-busy-working-people", "how-to-choose-a-cleaning-company"],
  },
  {
    slug: "regular-clean-vs-deep-clean-which-do-you-need",
    title: "Regular Clean or Deep Clean: Which Do You Need?",
    description: "The difference between a regular clean and a deep clean, what each includes, and how to decide which one your home needs right now.",
    summary: "What each includes, and how to choose.",
    category: "tips", published: "2026-10-05", minutes: 3,
    intro: "Both keep a home clean, but they do different jobs. A regular clean maintains, and a deep clean resets.",
    sections: [
      { h: "A regular clean is for", ul: ["Homes that are already in good shape", "Keeping kitchens, bathrooms and floors fresh week to week", "Households that want a fixed day and the same cleaner each time"] },
      { h: "A deep clean is for", ul: ["A home that has not been cleaned thoroughly for a while", "A fresh start before moving in, or before starting a regular clean", "Appliances, grout, windows, frames and the places a regular clean skips", "Preparing a home for a sale or a letting"] },
      { h: "A good combination", p: ["Many households book a deep clean first, and then a weekly or fortnightly regular clean. The deep clean does the heavy lifting once, and the regular clean keeps it that way."] },
    ],
    relatedGuides: ["deep-cleaning-checklist", "how-often-should-you-clean-every-room"],
  },
  {
    slug: "for-letting-agents-and-landlords-working-with-ample-cleaners",
    title: "For Letting Agents and Landlords: Working With Ample Cleaners",
    description: "How letting agents and landlords can use Ample Cleaners for end of tenancy and between-tenancy cleans: fixed prices, vetted cleaners and online booking.",
    summary: "Fixed prices, vetted cleaners and simple booking for turnarounds.",
    category: "landlords", published: "2026-10-05", minutes: 2,
    intro: "A fast, predictable turnaround keeps void periods short. Here is what agents and landlords can expect when booking an end of tenancy or between-tenancy clean with us.",
    sections: [
      { h: "What you get", ul: ["A fixed price before you commit, so you can plan costs", "DBS-checked cleaners, and we are fully insured", "Cleaning to a check-out standard, in one visit", "Online booking, and free changes up to 48 hours before the clean"] },
      { h: "Covering east London", p: ["We work across Barking, Dagenham, Romford, Hornchurch, Ilford and the surrounding areas. Each area has its own page with local information."] },
    ],
    relatedGuides: ["landlord-guide-cleaning-between-tenants", "what-letting-agents-check-at-check-out"],
  },
  {
    slug: "book-your-move-out-clean-early",
    title: "Moving Out at the End of the Month? Book Your Clean Early",
    description: "Why booking your end of tenancy clean early matters, how the busiest days work, and a simple timeline for booking around your move.",
    summary: "Popular slots fill up, and a simple timeline to book around your move.",
    category: "tenants", published: "2026-10-05", minutes: 2,
    intro: "Most tenancies end on the same few days each month, so the most popular cleaning slots fill up first. Booking early gives you the most choice.",
    sections: [
      { h: "A simple timeline", ol: ["As soon as your move-out date is confirmed, request a quote for an end of tenancy clean", "Pick a day after the removals and before the check-out, if you can", "Keep your check-in inventory handy, and tell us anything the agent has flagged", "On the day, leave access sorted and take your own dated photos afterwards"] },
      { h: "Flexible on the date?", p: ["If you can move out mid-week or mid-month, you will usually have more choice of times."] },
    ],
    relatedGuides: ["moving-out-checklist-last-week", "end-of-tenancy-cleaning-checklist"],
  },
];

POSTS.sort((a, b) => b.published.localeCompare(a.published));

const BY_SLUG = new Map(POSTS.map((p) => [p.slug, p]));
export const getPost = (slug: string): Post | undefined => BY_SLUG.get(slug);
export const postsIn = (category: PostCategory): Post[] => POSTS.filter((p) => p.category === category);
