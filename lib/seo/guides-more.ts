import type { Guide } from "@/lib/seo/guides";

/** Second batch of guides. Same rules as guides.ts: useful, UK-specific where it matters, no invented numbers, no "best company" claims. */
export const MORE_GUIDES: Guide[] = [
  {
    slug: "how-much-does-a-cleaner-cost-london",
    title: "How Much Does a Cleaner Cost in London? How Pricing Works",
    description: "How home cleaners price their work in London: hourly vs fixed price, what changes the cost, and how to compare quotes fairly.",
    summary: "Hourly vs fixed price, what changes the cost, and how to compare quotes.",
    published: "2026-10-05", minutes: 5, service: "house-cleaning",
    intro: "Cleaning prices vary a lot, and the cheapest quote is not always the cheapest clean. Understanding how cleaners price, and what is and is not included, lets you compare like with like.",
    sections: [
      { h: "The two main pricing models", ul: ["Hourly: you pay a rate for each hour, usually with a minimum number of hours. It is transparent and flexible, and works best for regular cleaning", "Fixed price: you are quoted a total for the job based on the property. It suits one-off work such as deep, end of tenancy and after builders cleans, because you know the cost before you commit"] },
      { h: "What changes the cost", ul: ["The size of the property and the number of bedrooms and bathrooms", "The condition: a regularly cleaned home takes less time than one that has not been cleaned for months", "The type of clean: deep, end of tenancy and after builders cleans are more detailed than a regular clean", "Extras such as the inside of the oven, fridge and windows", "How often you book: regular visits are usually more efficient than one-offs", "Access and timing, such as parking, stairs and unusual hours"] },
      { h: "How to compare quotes fairly", ol: ["Ask exactly what is included, ideally as a checklist", "Check whether cleaning products and equipment are included", "Ask whether the price is fixed or can change on the day", "Check the minimum hours and any call-out or travel charges", "Ask about cancellation and change terms", "Confirm that the company is insured and its cleaners are vetted"] },
      { h: "Red flags", ul: ["A price far below everyone else's with no explanation", "No written confirmation of what is included", "No insurance, or vague answers about vetting", "Requests for the full payment in cash up front"] },
    ],
    faqs: [
      { q: "Is hourly or fixed-price cleaning better?", a: "Hourly suits regular cleaning because you choose how long you want. Fixed price suits one-off jobs because the total is known in advance." },
      { q: "Should I pay up front?", a: "Many companies take a deposit to secure the date and the balance after the clean. Be cautious about paying everything in advance, in cash, to someone you cannot identify." },
    ],
  },
  {
    slug: "moving-out-checklist-last-week",
    title: "Moving Out Checklist: What to Do in the Last Week",
    description: "A practical moving-out checklist for the final week: bills, keys, meter readings, cleaning and the paperwork that protects your deposit.",
    summary: "Bills, meters, keys, cleaning and the paperwork that protects your deposit.",
    published: "2026-10-05", minutes: 5, service: "end-of-tenancy-cleaning", printable: true,
    intro: "The last week before moving is when small admin tasks get forgotten. This checklist puts them in order, so you finish the tenancy cleanly and protect your deposit.",
    sections: [
      { h: "A week before", ul: ["Confirm your move-out date and check-out appointment with your landlord or agent", "Check your tenancy agreement for cleaning, garden and notice requirements", "Book a removal slot, and an end of tenancy clean if you want one, because popular days fill up", "Arrange mail redirection through Royal Mail"] },
      { h: "Three days before", ul: ["Notify your energy, water, broadband and council tax providers of your move-out date", "Take meter readings, with dated photos, on the day you leave", "Pack non-essentials and take down your own pictures, shelves and fittings, filling any holes if the agreement allows", "Use up the contents of the fridge and freezer"] },
      { h: "Move-out day", ol: ["Move everything out first, because cleaning comes last", "Clean room by room, or have a professional clean done after the removals", "Take dated photos of every room, including inside appliances", "Check cupboards, drawers, the loft, shed and balcony are empty", "Return all keys, including spares, and keep proof of handover", "Give your forwarding address in writing"] },
      { h: "After you have left", ul: ["Keep photos, inventory and receipts until the deposit is returned", "Check your deposit is returned and ask for an itemised list of any deductions", "Update your address with your bank, employer and GP"] },
    ],
    faqs: [
      { q: "When should I book a cleaner for move-out?", a: "Book as soon as your move-out date is confirmed, because the last days of the month are the busiest. Choose a slot after the removals and before the check-out." },
    ],
  },
  {
    slug: "how-to-choose-a-cleaning-company",
    title: "How to Choose a Cleaning Company: 10 Questions to Ask First",
    description: "Ten questions to ask before hiring a cleaning company: insurance, vetting, pricing, what is included, and how problems are handled.",
    summary: "Ten questions that separate reliable cleaners from risky ones.",
    published: "2026-10-05", minutes: 4, service: "cleaning-services",
    intro: "You are letting someone into your home, so it pays to ask a few direct questions first. A good company answers all of them clearly and in writing.",
    sections: [
      { h: "The ten questions", ol: ["Are your cleaners DBS-checked, and can you tell me about your vetting?", "Are you insured, and does it cover damage and accidents?", "Is the price fixed, or can it change on the day?", "Exactly what is included, and is there a checklist?", "Do you bring cleaning products and equipment, or do I provide them?", "Will I get the same cleaner each time on a regular booking?", "What happens if I am not happy with the clean?", "What is your cancellation and rescheduling policy?", "How and when do I pay, and do you take a deposit?", "Can I see reviews or references from real customers?"] },
      { h: "What good answers look like", ul: ["Clear, specific and the same whoever you speak to", "Everything confirmed in writing before the clean", "A straightforward policy for fixing problems", "No pressure to decide immediately"] },
      { h: "Check before you book", p: ["Look at independent review sites as well as the company's own website. Be sceptical of reviews that are all identical in style, or that only ever say the same few words."] },
    ],
    faqs: [
      { q: "What does DBS-checked mean?", a: "A DBS check looks at a person's criminal record history through the Disclosure and Barring Service, and gives you confidence in who is entering your home." },
    ],
  },
  {
    slug: "clean-your-house-fast-before-guests",
    title: "How to Get Your House Guest-Ready in One Hour",
    description: "A realistic one-hour plan to get your home guest-ready: what to do first, where visitors look, and the quick fixes that make the biggest difference.",
    summary: "A one-hour plan that focuses on what visitors actually notice.",
    published: "2026-10-05", minutes: 3, service: "house-cleaning",
    intro: "When visitors are on the way, you do not need to clean everything. You need to clean what they will see, smell and touch. This plan covers the most visible things first.",
    sections: [
      { h: "The one-hour plan", ol: ["Ten minutes: clear surfaces and put away clutter, putting the overflow in a basket or a spare room", "Ten minutes: the kitchen. Clear the sink, wipe the worktops and hob, empty the bin", "Fifteen minutes: the bathroom. Wipe the sink, mirror and taps, clean the toilet, and put out fresh towels and hand soap", "Ten minutes: the living room. Plump the cushions, quickly dust the surfaces, and clear the coffee table", "Ten minutes: vacuum the floors that guests will walk on, and mop the entrance and kitchen floor", "Five minutes: open the windows for fresh air and light a candle or use a diffuser"] },
      { h: "What visitors notice most", ul: ["The toilet and bathroom sink", "A full bin or a sink full of dishes", "The smell of the home when they walk in", "The entrance and hallway", "Clutter on surfaces"] },
      { h: "Keep it that way", p: ["If an hour of rescue cleaning is happening too often, a regular clean on a fixed day means the home is already in good shape when guests call round."] },
    ],
    faqs: [
      { q: "What is the fastest way to make a house smell fresh?", a: "Take the rubbish out, open the windows, clean the bathroom and kitchen sink, and wash or remove anything damp. Scented candles and sprays only cover the cause." },
    ],
  },
  {
    slug: "how-to-clean-windows-streak-free",
    title: "How to Clean Windows Without Streaks",
    description: "A step-by-step guide to streak-free window cleaning: the right tools, the best weather, and how to clean frames, tracks and sills.",
    summary: "The right tools, the best conditions and how to avoid streaks.",
    published: "2026-10-05", minutes: 3, service: "deep-cleaning",
    intro: "Streaks come from dirt that is smeared around, too much product, or cleaning in direct sun so the glass dries too quickly. A few small changes fix all three.",
    sections: [
      { h: "What you need", ul: ["A bucket of warm water with a little washing-up liquid, or a glass cleaner", "A squeegee, microfibre cloths and a lint-free cloth for finishing", "A soft brush for frames, tracks and sills"] },
      { h: "Method", ol: ["Pick a dry, overcast day, or work when the window is in shade", "Dust and brush the frame, tracks and sill first, so dirty water does not run onto clean glass", "Wash the glass with a wet cloth or sponge, working top to bottom", "Squeegee from top to bottom in overlapping strokes, wiping the blade clean after each pass", "Dry the edges with a lint-free cloth, then wipe the frame and sill"] },
      { h: "Tips", ul: ["Use very little product; more does not clean better", "Do not clean in direct sunlight", "Newspaper is not necessary, a microfibre cloth works better", "For tall or upper windows, do not take risks: use a professional"] },
    ],
    faqs: [
      { q: "How often should windows be cleaned?", a: "Inside windows benefit from a clean every month or two, and outside windows a few times a year, depending on how exposed they are." },
    ],
  },
  {
    slug: "how-to-deal-with-pet-hair-and-smells",
    title: "How to Deal With Pet Hair and Smells at Home",
    description: "Practical ways to control pet hair, remove pet odours and keep floors, sofas and bedding fresh, including what to do before you move out.",
    summary: "Controlling hair and odours on floors, sofas and bedding.",
    published: "2026-10-05", minutes: 4, service: "house-cleaning",
    intro: "Pets are part of the family, but their hair and smells can build up quickly. A little regular effort, plus the right method for each surface, keeps it manageable.",
    sections: [
      { h: "Pet hair", ul: ["Vacuum often, with a vacuum designed for pet hair, and go slowly over carpets", "Use a rubber glove or a squeegee on sofas and fabric to lift hair into clumps", "Wash pet blankets and covers regularly on the hottest setting the label allows", "Brush your pet outside, and regularly, so less ends up indoors"] },
      { h: "Smells", ul: ["Find the source: bedding, carpets, a favourite spot or the litter tray", "Clean accidents promptly with an enzyme cleaner, because ordinary cleaners can leave a scent that attracts the pet back", "Bicarbonate of soda sprinkled on carpet and left before vacuuming helps with mild odours", "Ventilate rooms daily, and clean food and water bowls often"] },
      { h: "If you rent", p: ["Check your tenancy agreement on pets and cleaning. Pet hair, odours and marks are common reasons for deductions, so a thorough clean, including carpets, before you hand back the keys is worth planning for."] },
    ],
    faqs: [
      { q: "How can I remove pet urine smell from a carpet?", a: "Blot up as much as you can, treat it with an enzyme cleaner according to the label, and let it dry fully. Repeat if the smell remains." },
    ],
  },
  {
    slug: "how-to-clean-carpets-and-remove-stains",
    title: "How to Clean a Carpet and Remove Common Stains",
    description: "How to clean a carpet at home and treat common stains such as wine, coffee, grease and mud, plus when professional cleaning is the better choice.",
    summary: "A safe method for everyday cleaning and the most common stains.",
    published: "2026-10-05", minutes: 4, service: "deep-cleaning",
    intro: "Most carpet stains come out if you treat them quickly and gently. The two biggest mistakes are rubbing, which pushes the stain deeper, and using too much water or product.",
    sections: [
      { h: "The golden rules", ul: ["Act fast, because fresh stains are much easier to remove", "Blot, do not rub, working from the outside of the stain towards the centre", "Test any product on a hidden area first", "Never mix cleaning products"] },
      { h: "Common stains", ul: ["Wine, coffee and juice: blot, then dab with cold water and a little washing-up liquid mixed in", "Grease: blot, sprinkle bicarbonate of soda to absorb it, leave, then vacuum and dab with a mild detergent", "Mud: let it dry fully, vacuum up the dried soil, then treat what is left", "Pet accidents: blot, then use an enzyme cleaner, following the label"] },
      { h: "Routine care", ul: ["Vacuum busy areas at least weekly", "Rotate furniture occasionally so wear is spread", "Keep shoes off if you can, or use a doormat"] },
      { h: "When to use a professional", p: ["For large or old stains, deep soiling, or before a move-out where carpet condition counts, a professional carpet or deep clean is usually the safer choice and gives a more even result."] },
    ],
    faqs: [
      { q: "Does hot water set stains?", a: "On some stains, such as blood and protein-based marks, hot water can set them, so start with cold water." },
    ],
  },
  {
    slug: "landlord-guide-cleaning-between-tenants",
    title: "A Landlord's Guide to Cleaning Between Tenants",
    description: "A practical guide for landlords and letting agents: what a between-tenancy clean should cover, how to plan it, and how to document the condition.",
    summary: "What to clean, how to plan the turnaround and how to record condition.",
    published: "2026-10-05", minutes: 5, service: "end-of-tenancy-cleaning", printable: true,
    intro: "Between tenants, a property needs to be ready quickly and be presentable for viewings. A planned turnaround avoids void periods and makes the next check-in inventory straightforward.",
    sections: [
      { h: "Plan the turnaround", ol: ["Schedule the check-out inspection and compare with the previous inventory", "Arrange any repairs and decorating first, because those create dust", "Book the cleaning after repairs and before viewings and the new check-in", "Photograph the finished property, and use the images in the new inventory"] },
      { h: "What the clean should cover", ul: ["Kitchen: oven, extractor, fridge, freezer, cupboards inside and out, sink and worktops", "Bathrooms: limescale, grout, taps, toilet, mirrors and extractor", "All rooms: dust high to low, skirting, doors, switches, radiators, inside windows and floors", "Carpets: vacuum and treat stains, with a deep clean if required"] },
      { h: "Record the condition", ul: ["Take dated photos and video, room by room", "Keep receipts for cleaning and repairs", "Write the standard in the tenancy documents so expectations are clear"] },
      { h: "Using a cleaning company", p: ["A cleaning company that works to a check-out standard, with a fixed price and a set date, makes turnarounds predictable. Ask for a checklist and photographs on completion, which are useful records for the new inventory."] },
    ],
    faqs: [
      { q: "Can I charge a tenant for cleaning?", a: "Only for cleaning needed to return the property to the condition it started in, allowing for fair wear and tear, and you should be able to evidence it. Check current guidance on gov.uk and your deposit scheme." },
    ],
  },
  {
    slug: "how-to-clean-kitchen-grease",
    title: "How to Remove Kitchen Grease from Cupboards, Hobs and Extractors",
    description: "A practical guide to removing greasy build-up in the kitchen: cupboard doors, the hob, extractor filters, tiles and walls, using safe products.",
    summary: "Safe ways to cut grease on cupboards, hobs, filters and tiles.",
    published: "2026-10-05", minutes: 4, service: "deep-cleaning",
    intro: "Cooking grease gets into the air, settles on every surface and attracts dust. Once it builds up, a quick wipe will not shift it, but the right product and a little dwell time will.",
    sections: [
      { h: "The basics", ul: ["Warm water and washing-up liquid cut most grease", "A degreaser is for heavier build-up, used as directed", "Leave the product to work for a few minutes before wiping", "Use a non-scratch cloth on painted or wooden finishes"] },
      { h: "Where to clean", ul: ["Extractor filter: remove it and soak in hot water with degreaser, or put it in the dishwasher if the manual says it is safe", "Hob and surround: take off the pan supports and burners and soak them", "Cupboard doors and handles: wipe from top to bottom, paying attention to the edges around the hob", "Tiles and walls: wipe, rinse and dry to avoid streaks", "Top of wall cupboards: wipe, because dust and grease combine into a sticky layer"] },
      { h: "Keep it from building up", ul: ["Use the extractor when you cook, and clean the filter regularly", "Wipe the hob and nearby surfaces after cooking", "Put a deep clean in your calendar every few months"] },
    ],
    faqs: [
      { q: "Is it safe to put an extractor filter in the dishwasher?", a: "Many metal mesh filters are dishwasher-safe, but check the manufacturer's guidance first." },
    ],
  },
  {
    slug: "new-home-cleaning-checklist",
    title: "New Home Cleaning Checklist: What to Clean Before You Move In",
    description: "A move-in cleaning checklist: what to deep clean before your furniture arrives, from the oven and cupboards to bathrooms, floors and windows.",
    summary: "What to clean before the furniture arrives, in the best order.",
    published: "2026-10-05", minutes: 4, service: "deep-cleaning", printable: true,
    intro: "The best time to deep clean a home is before you move in, when every room is empty and every cupboard is accessible. Previous occupants, however tidy, rarely clean the places you will use first.",
    sections: [
      { h: "Before anything is moved in", ol: ["Open the windows and let the property air", "Clean from top to bottom, and finish with the floors", "Do the kitchen and bathroom first, because you will use them on day one", "Make up the bed and unpack the essentials after cleaning"] },
      { h: "Kitchen", ul: ["Inside the oven, microwave, fridge and freezer", "Inside every cupboard and drawer, and line the shelves if you wish", "Sink, taps and dishwasher filter", "Worktops, splashbacks and the extractor"] },
      { h: "Bathrooms and toilets", ul: ["Toilet: all around and under the seat, and the cistern", "Shower, bath and screen, plus descaling taps and shower head", "Grout and sealant, and the extractor fan cover", "Cabinet inside and out"] },
      { h: "Everywhere else", ul: ["Skirting, door frames, radiators, switches and sockets", "Inside windows, sills and fitted wardrobes", "Floors: vacuum, mop and treat marks on carpets", "Check smoke and carbon monoxide alarms work"] },
      { h: "Save time", p: ["A professional deep clean while the property is empty is a popular choice for movers, because it gets the heavy jobs out of the way before the boxes arrive."] },
    ],
    faqs: [
      { q: "Should I clean before or after the removals?", a: "Before, if you can. The property is empty, so every surface and cupboard is easy to reach, and your belongings do not get in the way." },
    ],
  },
];
