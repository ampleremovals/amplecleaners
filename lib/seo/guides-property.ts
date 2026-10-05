import { bullets, guide, para, steps } from "@/lib/seo/guide-kit";

/** Batch 5: tenancy, property, seasonal and workplace guides. */
export const PROPERTY_GUIDES = [
  guide({
    slug: "what-letting-agents-check-at-check-out", title: "What Letting Agents Check at Check-Out (and How to Pass First Time)",
    description: "What letting agents and landlords look at during a check-out inspection, the usual problem areas and how to prepare so you pass first time.",
    summary: "The usual problem areas, and how to prepare.", minutes: 4, service: "end-of-tenancy-cleaning",
    intro: "A check-out inspection compares the property with the check-in inventory. Agents tend to look at the same places each time, so preparing for them saves your deposit.",
    sections: [
      bullets("The places most often checked", ["Oven, hob, extractor and microwave", "Fridge, freezer and cupboards", "Bathroom limescale, grout and silicone", "Carpets, marks and stains", "Windows, frames and sills", "Walls, skirting, doors and marks", "Garden, shed and outside areas, where they are included"]),
      steps("How to prepare", ["Get the check-in inventory and any photos from move-in", "Clean each room to match its original condition", "Remove all belongings and rubbish", "Take dated photos once finished", "Attend the check-out if you can, and note any points raised"]),
      para("Fair wear and tear", "Normal ageing is not the tenant's responsibility. Dirt, damage and missing items usually are, so the key is to leave things clean and in the same condition."),
    ],
    faq: ["Can I be present at the check-out?", "Usually yes, and it is a good idea, because you can discuss any concerns on the spot and take your own notes."],
  }),
  guide({
    slug: "fair-wear-and-tear-vs-damage", title: "Fair Wear and Tear vs Damage: What Can a Landlord Charge For?",
    description: "The difference between fair wear and tear and tenant damage, with examples, so you know what a landlord can and cannot deduct from a deposit.",
    summary: "Examples of wear and tear versus damage and dirt.", minutes: 4, service: "end-of-tenancy-cleaning",
    intro: "Disputes often come down to whether something is wear and tear or damage. In general, ageing from normal use is not chargeable, while damage and neglect can be. This is general information for England, not legal advice.",
    sections: [
      bullets("Usually fair wear and tear", ["Faded paint or curtains from sunlight", "Light carpet wear in walkways", "Small marks on walls from normal living", "Worn handles and hinges from regular use"]),
      bullets("Usually damage or neglect", ["Burns, stains or large holes in carpets or surfaces", "Broken items and missing fittings", "Heavy dirt, grease, mould from neglect, or an uncleaned oven", "Damaged walls, doors and flooring"]),
      para("The details matter", "The age and condition of the item, how long you lived there, and the check-in inventory all count. Landlords should be able to show the evidence for any deduction and a reasonable cost, taking the item's age into account."),
    ],
    faq: ["Can a landlord charge full replacement cost?", "Generally they should account for the age and condition of the item, rather than charging a brand-new replacement in full. Check your deposit scheme's guidance."],
  }),
  guide({
    slug: "what-to-do-if-your-landlord-keeps-your-deposit", title: "What to Do If Your Landlord Keeps Your Deposit",
    description: "Steps to take if your landlord withholds your deposit in England: ask for a breakdown, use the deposit scheme's free dispute service and know your options.",
    summary: "Ask for a breakdown, use the free dispute service and know your options.", minutes: 4, service: "end-of-tenancy-cleaning",
    intro: "If your deposit has not been returned, or deductions seem unfair, there is a process to follow. This is general information for assured shorthold tenancies in England, so check gov.uk, Shelter or Citizens Advice for your case.",
    sections: [
      steps("Steps to take", ["Ask your landlord or agent in writing for an itemised list of the deductions, with evidence and costs", "Check which approved scheme holds your deposit, and look at its guidance", "Collect your evidence: inventory, dated photos, receipts and messages", "If you cannot agree, raise a dispute through the scheme's free dispute resolution service, within its time limits", "Seek advice from Shelter or Citizens Advice if the situation is complicated"]),
      bullets("What strengthens your case", ["Dated photos from move-in and move-out", "A professional cleaning receipt", "The check-in inventory showing the original condition", "Written messages confirming agreements"]),
      para("Prevention", "The best protection is evidence from the start of the tenancy to the end, which is why we recommend recording everything."),
    ],
    faq: ["Is there a time limit to dispute?", "The schemes and the courts have time limits, so act quickly and check the current rules on gov.uk."],
  }),
  guide({
    slug: "short-let-and-airbnb-turnover-cleaning", title: "Short-Let and Airbnb Turnover Cleaning Checklist",
    description: "A turnover cleaning checklist for short-lets and holiday lets: the order of work, linen, restocking and the photos that protect you.",
    summary: "The order of work, linen, restocking and records.", minutes: 4, service: "house-cleaning", printable: true,
    intro: "Between guests, a short-let needs to be cleaned to a consistent standard quickly. A checklist and a fixed routine stop things being missed.",
    sections: [
      steps("Turnover routine", ["Check for damage or lost items and photograph anything unusual", "Strip the beds, remove used towels and start the laundry", "Clean the kitchen, bathroom and living area, top to bottom", "Make the beds with fresh linen and set out clean towels", "Restock consumables: toilet roll, soap, tea, coffee and washing-up liquid", "Vacuum and mop, take out the rubbish, and do a final walk-through"]),
      bullets("Tips", ["Keep a spare set of linen so you are never waiting on the laundry", "Keep a checklist and tick it off each time", "Take photos of the finished property for your records"]),
      para("A reliable partner", "Hosts often use a regular cleaning team who can be booked for each changeover, which keeps the standard consistent."),
    ],
    faq: ["How long does a turnover take?", "It depends on the size of the property, the number of guests and its condition, which is why many hosts use an hourly cleaner."],
  }),
  guide({
    slug: "prepare-your-home-for-viewings-cleaning-checklist", title: "Selling or Letting? The Cleaning Checklist for Viewings",
    description: "A cleaning checklist to prepare a home for viewings: first impressions, kitchens and bathrooms, smells, light and the little jobs that count.",
    summary: "First impressions, kitchens and bathrooms, smells and light.", minutes: 4, service: "deep-cleaning", printable: true,
    intro: "Viewers decide quickly. A clean, bright, fresh-smelling home lets them picture themselves living in it.",
    sections: [
      bullets("Before the viewing", ["Declutter surfaces, and put away personal items", "Deep clean the kitchen and bathrooms, including grout, taps and limescale", "Clean windows inside and out, and open the curtains for light", "Vacuum and mop floors, and clear the entrance and hallway", "Air the property and remove bin and pet smells"]),
      bullets("Small touches", ["Fresh towels and a clean toilet seat", "Replace any blown light bulbs", "Fix small things, such as dripping taps", "Tidy the garden or balcony"]),
      para("A professional clean", "Many sellers and landlords book a deep clean before photos and viewings, because it makes the property look its best and saves their time."),
    ],
    faq: ["What do buyers notice most?", "Smell, light, kitchens and bathrooms, and clutter are all things people comment on."],
  }),
  guide({
    slug: "how-to-clean-up-after-a-party", title: "How to Clean Up After a Party (Without Losing Your Weekend)",
    description: "A step-by-step plan for cleaning up after a party: rubbish first, tackling spills and stains, the kitchen and floors, and what to do about smells.",
    summary: "A step-by-step plan: rubbish, spills, kitchen and floors.", minutes: 3, service: "deep-cleaning",
    intro: "The morning after is easier with a plan. Do the quick wins first, then the stains and the kitchen, and finish with the floors.",
    sections: [
      steps("Plan", ["Open the windows and put on some music", "Do a rubbish sweep with a bin bag, and sort the recycling", "Clear glasses and plates, and load the dishwasher", "Treat spills and stains straight away: blot, do not rub", "Wipe surfaces, clean the bathroom, and vacuum and mop the floors"]),
      bullets("Spills", ["Wine: blot, then dab with cold water and a little washing-up liquid", "Grease: absorb with bicarbonate of soda before cleaning", "Sticky drinks: warm soapy water on a cloth"]),
      para("Short on time?", "If the clean-up is too much, a one-off deep clean after the event gets everything back to normal in a single visit."),
    ],
    faq: ["How do I get rid of party smells?", "Remove rubbish and empties, wash any spills, open windows and wash fabrics that took on smoke or food odours."],
  }),
  guide({
    slug: "cleaning-and-disinfecting-after-illness", title: "How to Clean a Home After Someone Has Been Ill",
    description: "General guidance on cleaning high-touch surfaces, bathrooms and bedding after illness at home. Not medical advice.",
    summary: "High-touch surfaces, bathrooms and bedding. General guidance.", minutes: 3, service: "deep-cleaning",
    intro: "After an illness at home, regular cleaning with the right products helps. This is general household guidance, so follow NHS advice for specific illnesses.",
    sections: [
      bullets("Focus on", ["High-touch surfaces: door handles, light switches, remotes, taps and phones", "The bathroom: toilet, sink, flush handle and floor", "Bedding, towels and clothes, washed on the hottest setting the label allows"]),
      steps("Method", ["Wear gloves, and open windows for ventilation", "Clean with detergent first, to remove dirt", "Then use a household disinfectant, following the label and the contact time", "Wash cloths and mop heads afterwards, and wash your hands"]),
      para("Never mix", "Use one product at a time, and never mix bleach with any other cleaner."),
    ],
    faq: ["Do I need to disinfect everything?", "Cleaning with detergent handles most surfaces. Use disinfectant on high-touch areas and in the bathroom."],
  }),
  guide({
    slug: "spring-cleaning-checklist", title: "The Spring Cleaning Checklist: Room by Room",
    description: "A complete spring cleaning checklist, room by room, with the jobs worth doing once a year and a plan to spread them across weekends.",
    summary: "A once-a-year, room by room reset.", minutes: 5, service: "deep-cleaning", printable: true,
    intro: "Spring cleaning is a once-a-year reset. Spread it across a few weekends, one or two rooms at a time, and it stays manageable.",
    sections: [
      bullets("Kitchen", ["Clean inside the oven, fridge, freezer and cupboards", "Descale the kettle and taps", "Clear out the pantry and check dates", "Degrease cupboard fronts, the hob and the extractor"]),
      bullets("Bathroom", ["Scrub grout and descale the shower and taps", "Clean the extractor fan and the cabinet", "Replace old toothbrushes, sponges and shower curtains"]),
      bullets("Living areas and bedrooms", ["Wash windows, curtains and cushion covers", "Vacuum under furniture, and clean upholstery", "Turn and vacuum the mattress, and wash pillows and the duvet", "Declutter wardrobes and drawers, and donate what you no longer wear"]),
      bullets("Everywhere", ["Dust high places, skirting and radiators", "Wipe doors, frames and switches", "Clean the entrance, hallway and storage areas"]),
    ],
    faq: ["How long does spring cleaning take?", "Done room by room it can take several weekends. A professional deep clean can do most of it in one visit."],
  }),
  guide({
    slug: "christmas-and-holiday-hosting-cleaning-plan", title: "Getting the House Ready for Christmas and Holiday Guests",
    description: "A calm cleaning plan for the weeks before Christmas and holiday hosting: what to do early, the week before and on the day.",
    summary: "What to do early, the week before and the day before.", minutes: 4, service: "deep-cleaning", printable: true,
    intro: "Hosting is far less stressful when the heavy cleaning is done early. Spread the work across the weeks before, and keep the last days for the finishing touches.",
    sections: [
      steps("Timeline", ["Two to three weeks before: declutter, deep clean the oven and fridge, clean windows and curtains", "One week before: wash bedding for guests, clean the bathrooms, and tidy the entrance", "The day before: vacuum and mop, clean the kitchen, set out fresh towels and empty the bins", "On the day: wipe surfaces and keep the bathroom stocked"]),
      bullets("Guest touches", ["Clean sheets and towels in the guest room", "A clear surface in the bathroom and a stocked toilet-roll holder", "Fresh air in each room"]),
      para("Book early", "Cleaners get busy in December, so if you want help, book your deep clean for early in the month, or in late November."),
    ],
    faq: ["When should I book a cleaner for Christmas?", "As early as you can. Popular days go first in the run-up to the holidays."],
  }),
  guide({
    slug: "cleaning-before-and-after-a-holiday", title: "Cleaning Before You Go on Holiday and When You Come Back",
    description: "What to do before leaving for a holiday so you return to a fresh home: fridge, bins, bathroom, bedding, and a plan for coming back.",
    summary: "What to do before you leave, and how to come back to a fresh home.", minutes: 3, service: "house-cleaning",
    intro: "A little preparation before you leave means you do not come back to smells, mould or a pile of chores.",
    sections: [
      steps("Before you go", ["Empty and clean the fridge, and take out the bins", "Wash up, and wipe the kitchen surfaces", "Wash bedding and towels, and make the bed with fresh sheets", "Leave a few windows on the latch if safe, or leave the bathroom door open for airflow", "Flush toilets and run taps briefly before leaving"]),
      bullets("When you come back", ["Open the windows and air the home", "Run the taps to flush stale water", "Do a quick wipe-down, and put on a wash", "Arrange a cleaner for your return, so a fresh home is waiting"]),
      bullets("Security and safety", ["Check your insurer's conditions on how long a home can be left unoccupied", "Ask a neighbour or friend to collect post", "Switch off or unplug appliances that do not need to stay on"])
    ],
    faq: ["Should I turn the heating off when I go away?", "In winter, leaving it on low prevents frozen pipes and damp, so follow your boiler and insurer's guidance."],
  }),
  guide({
    slug: "mid-tenancy-inspection-cleaning-checklist", title: "Mid-Tenancy Inspection: How to Prepare as a Tenant",
    description: "How to prepare for a landlord or agent's periodic inspection: what they look at, the simple cleaning to do and your rights around notice.",
    summary: "What they look at, simple cleaning and your rights around notice.", minutes: 3, service: "house-cleaning",
    intro: "Landlords and agents often inspect a rented property during the tenancy. A reasonable level of cleanliness and early reporting of problems keeps them happy and protects you.",
    sections: [
      bullets("What inspectors look for", ["General cleanliness, especially the kitchen and bathroom", "Damp, mould, leaks and pests", "Damage, and whether the property is being looked after", "Working smoke and carbon monoxide alarms"]),
      bullets("Prepare", ["Tidy and clean the main areas, and clear the surfaces", "Clean the bathroom, the oven and the hob", "Make a note of any repairs you want to raise, with photos"]),
      para("Your rights", "In England, a landlord generally needs to give reasonable written notice, usually at least 24 hours, before visiting, unless it is an emergency. Check your agreement and gov.uk."),
    ],
    faq: ["Can my landlord inspect without telling me?", "Generally not. They should give reasonable notice, and you should be able to agree a time that suits you."],
  }),
  guide({
    slug: "how-to-keep-an-office-kitchen-and-fridge-clean", title: "How to Keep a Shared Office Kitchen and Fridge Clean",
    description: "Practical rules for a clean, pleasant office kitchen: the daily wipe-down, the weekly fridge clear-out and how to stop arguments.",
    summary: "Daily, weekly and house rules that keep it pleasant.", minutes: 3, service: "office-cleaning",
    intro: "The office kitchen is often the biggest source of complaints. Clear rules and a regular schedule keep it clean for everybody.",
    sections: [
      bullets("Daily", ["Wipe worktops, the sink and the tap", "Empty the bins and the dishwasher", "Clean the microwave and the kettle outside"]),
      bullets("Weekly", ["Clear out the fridge, binning anything past its date", "Clean the inside of the microwave", "Wipe the cupboard fronts and the floor"]),
      bullets("House rules that work", ["Everyone washes their own mug, or uses the dishwasher", "Label food, and agree a day when unlabelled items are thrown out", "Keep a visible rota or hire a cleaner to take care of shared areas"]),
    ],
    faq: ["Who should clean the office kitchen?", "A shared rota can work for small teams. Many offices include the kitchenette in their regular professional clean."],
  }),
  guide({
    slug: "how-to-clean-desks-keyboards-and-office-equipment", title: "How to Clean Desks, Keyboards and Shared Office Equipment",
    description: "How to clean desks, keyboards, phones, printers and shared equipment in an office, with safe products and a simple schedule.",
    summary: "Desks, keyboards, phones and shared equipment.", minutes: 3, service: "office-cleaning",
    intro: "Desks and shared equipment collect more germs than most people expect. A simple, regular wipe-down helps keep the team healthier.",
    sections: [
      steps("Desks and equipment", ["Clear the desk and wipe it with a multi-surface cleaner and a microfibre cloth", "Wipe keyboards, mice and phones with a barely damp cloth, or a wipe made for electronics", "Wipe shared items such as the printer buttons, door handles and meeting-room tables"]),
      bullets("Tips", ["Do shared and high-touch items daily, and individual desks weekly", "Never spray liquid directly onto electronics", "Keep wipes and a cloth at each workstation"]),
      para("A shared responsibility", "Cleaning an office is easiest when daily surface wipes are everyone's habit, and a professional cleaner handles floors, washrooms and the deeper cleaning outside working hours.")
    ],
    faq: ["How often should desks be cleaned?", "A quick wipe daily, and a full clear and clean weekly, works for most offices."],
  }),
  guide({
    slug: "office-washroom-cleaning-standards", title: "Office Washroom Cleaning: What a Good Standard Looks Like",
    description: "What a clean office washroom needs: daily tasks, restocking, deep clean frequency and the checks that show a good standard.",
    summary: "Daily tasks, restocking and a deeper clean schedule.", minutes: 3, service: "office-cleaning",
    intro: "Washrooms are one of the first things visitors and staff judge. A consistent standard is about routine and restocking as much as scrubbing.",
    sections: [
      bullets("Every day", ["Clean and disinfect toilets, urinals and basins", "Wipe mirrors, taps and surfaces", "Empty the bins and sanitary bins", "Restock soap, paper and hand towels", "Mop the floor"]),
      bullets("Weekly or monthly", ["Descale taps and fittings", "Scrub grout and tiles", "Clean the extractor and vents", "Clean the walls and partitions"]),
      para("Checks", "A simple checklist on the door, ticked off at each visit, shows what has been done and helps spot problems early."),
    ],
    faq: ["How often should an office washroom be cleaned?", "Daily for most offices, and more often if heavily used."],
  }),
  guide({
    slug: "should-you-outsource-your-office-cleaning", title: "Should You Outsource Your Office Cleaning? Pros, Cons and Costs to Think About",
    description: "The pros and cons of outsourcing office cleaning vs doing it in-house, and what to check when choosing a commercial cleaning company.",
    summary: "In-house vs outsourced, and what to check.", minutes: 4, service: "office-cleaning",
    intro: "For a small business, cleaning is easy to put off. The question is who does it best, and at what cost in time and money.",
    sections: [
      bullets("In-house", ["You control the timing, but it takes staff time", "Quality can vary, and cover is needed for absence", "You provide the products and equipment"]),
      bullets("Outsourced", ["A fixed schedule and a consistent standard", "The right equipment and products, with no cover to arrange", "A cost you can plan for, with insurance in place"]),
      bullets("Check before choosing", ["Insurance and how the cleaners are vetted", "A written scope of work and a fixed price", "Flexible hours, including out-of-hours cleaning", "Notice periods, and how problems are handled"]),
    ],
    faq: ["How often does an office need professional cleaning?", "It depends on size and use. Many small offices choose a few visits a week, or weekly, plus a deeper clean now and then."],
  }),
  guide({
    slug: "how-to-clean-up-after-decorating-and-painting", title: "How to Clean Up After Decorating and Painting",
    description: "How to clean up after decorating: paint splashes, dust from sanding, sticky residue, and the order of work to leave the room spotless.",
    summary: "Paint splashes, sanding dust and residue, in the right order.", minutes: 4, service: "after-builders-cleaning",
    intro: "Decorating leaves paint splashes, sanding dust and sticky tape residue. Cleaning in the right order avoids smearing it all around.",
    sections: [
      steps("Order of work", ["Remove dust sheets carefully, folding them in to trap the dust", "Dust from the top down: ceiling corners, shelves, window frames and skirting", "Scrape dried paint splashes from glass with a razor scraper held at a shallow angle", "Remove tape and sticky residue with a little washing-up liquid or a suitable residue remover", "Wipe surfaces, vacuum, then mop the floor"]),
      bullets("Tips", ["Clean up fresh water-based paint straight away with a damp cloth", "Ventilate the room while the paint cures", "Do not use abrasive pads on newly painted surfaces"]),
      para("Bigger jobs", "After a full redecoration or building work, a specialist after builders clean removes the fine dust that the first wipe-down misses."),
    ],
    faq: ["How soon can I clean a freshly painted wall?", "Wait until the paint is fully cured, which can take a few weeks, and then use a soft cloth and mild soapy water."],
  }),
];
