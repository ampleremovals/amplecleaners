import { bullets, guide, para, steps } from "@/lib/seo/guide-kit";

/** Batch 4: cleaning know-how, routines and household situations. */
export const HABITS_GUIDES = [
  guide({
    slug: "cleaning-products-you-should-never-mix", title: "Cleaning Products You Should Never Mix (and Why)",
    description: "Which common household cleaning products are dangerous to mix, such as bleach with ammonia or acids, and how to clean safely.",
    summary: "The dangerous combinations, and how to clean safely.", minutes: 3, service: "house-cleaning",
    intro: "Mixing cleaning products can release harmful gases. The safest habit is simple: use one product at a time, and rinse between products.",
    sections: [
      bullets("Never mix", ["Bleach with ammonia, which produces toxic chloramine gas", "Bleach with acids such as vinegar or limescale remover, which releases chlorine gas", "Bleach with other cleaners of unknown contents", "Different drain cleaners"]),
      bullets("Stay safe", ["Read the label, and follow the dilution and contact time", "Ventilate the room and wear gloves", "Rinse a surface with water before using a different product", "Keep products in their original containers, out of the reach of children and pets"]),
      para("If something goes wrong", "If you feel unwell after mixing or using products, get into fresh air at once. For serious symptoms call 999, or contact NHS 111 for advice."),
    ],
    faq: ["Is vinegar safe to mix with bicarbonate of soda?", "It is safe, but it fizzes and neutralises, so it is less effective as a cleaner when combined than when used separately."],
  }),
  guide({
    slug: "natural-cleaning-with-vinegar-and-bicarbonate-of-soda", title: "Cleaning With Vinegar and Bicarbonate of Soda: What Works and What Does Not",
    description: "What vinegar and bicarbonate of soda are good for, where they are not suitable, and how to use them safely around the home.",
    summary: "Where they work well, and where they should not be used.", minutes: 4, service: "house-cleaning",
    intro: "Vinegar and bicarbonate of soda are cheap and useful, but they are not a cure-all. Knowing what each does stops you damaging surfaces.",
    sections: [
      bullets("Vinegar is good for", ["Limescale on taps, kettles and shower heads", "Streak-free glass and mirrors, when diluted", "Freshening a microwave, using steam"]),
      bullets("Bicarbonate of soda is good for", ["Absorbing odours in fridges, carpets and mattresses", "Gentle scrubbing of sinks and baths, as a paste", "Lifting grease, mixed with a little water"]),
      bullets("Do not use vinegar on", ["Natural stone such as marble, granite or limestone, because the acid etches it", "Unsealed wood, rubber seals in some appliances, or electronics", "Anything the manufacturer says not to"]),
      para("Not a disinfectant", "Vinegar is not a substitute for a disinfectant where you need to kill germs, such as after raw meat or illness."),
    ],
    faq: ["Is vinegar a disinfectant?", "It is not a reliable disinfectant. Use a product labelled as disinfecting when you need that."],
  }),
  guide({
    slug: "how-to-use-microfibre-cloths", title: "How to Use Microfibre Cloths (and Why They Beat Kitchen Roll)",
    description: "How microfibre cloths work, which colours to use where, and how to wash them so they keep picking up dust and grease.",
    summary: "Why they work, a colour code and how to wash them.", minutes: 3, service: "house-cleaning",
    intro: "Microfibre cloths trap dirt in their fibres instead of pushing it around. They need a few simple rules to keep working.",
    sections: [
      bullets("A simple colour code", ["One colour for the bathroom and toilet", "Another for the kitchen", "Another for dusting and general surfaces", "Another for glass and mirrors"]),
      steps("Washing them", ["Wash at 40 to 60 degrees, as the label allows", "Use a little detergent and no fabric softener, which clogs the fibres", "Do not wash them with towels, because lint sticks to them", "Air dry or tumble on a low heat"]),
      bullets("Tips", ["Use dry for dust and damp for dirt", "Fold into quarters so you have eight clean sides", "Replace them when they stop picking up dirt"]),
    ],
    faq: ["Why do my microfibre cloths leave streaks?", "Usually fabric softener residue or too much product. Wash them without softener and use less cleaner."],
  }),
  guide({
    slug: "cleaning-supplies-starter-kit", title: "The Cleaning Supplies Starter Kit: What You Actually Need",
    description: "A short, practical list of the cleaning supplies a home really needs, so you can clean well without a cupboard full of products.",
    summary: "A short list of what a home actually needs.", minutes: 3, service: "house-cleaning", printable: true,
    intro: "You do not need a different product for every surface. A small, well-chosen kit covers almost every job in a home.",
    sections: [
      bullets("Products", ["Washing-up liquid, for most general cleaning", "A multi-surface spray", "A bathroom cleaner and a limescale remover", "Toilet cleaner", "Glass cleaner, or vinegar and water", "Oven cleaner, for the occasional deep clean", "Bicarbonate of soda"]),
      bullets("Tools", ["Microfibre cloths", "A vacuum cleaner with a hard-floor setting and attachments", "A mop and bucket, or a flat-head mop", "A scrubbing brush and an old toothbrush", "A squeegee for glass and the shower", "Rubber gloves and a dustpan and brush"]),
      para("Skip", "Fancy single-purpose gadgets and products usually collect dust in a cupboard. Spend on a good vacuum and microfibre cloths first."),
    ],
    faq: ["Do I need to supply cleaning products for a cleaner?", "Check with your cleaning company when you book. Many bring their own, and you can leave a note about anything to avoid."],
  }),
  guide({
    slug: "the-right-order-to-clean-a-house", title: "The Right Order to Clean a House (So You Never Redo Anything)",
    description: "The best order for cleaning a home: declutter, top to bottom, dry before wet, and the floors last, so you do not undo your work.",
    summary: "Declutter, top to bottom, dry before wet, floors last.", minutes: 3, service: "house-cleaning",
    intro: "Cleaning in the wrong order means dust falls onto surfaces you have just done. A simple order makes any clean faster.",
    sections: [
      steps("The order", ["Declutter and take out rubbish, so surfaces are clear", "Start at the top of each room: ceiling corners, light fittings and shelves", "Do dry jobs before wet ones: dust before you wipe", "Clean the kitchen and bathrooms, letting products sit while you do other jobs", "Vacuum, then mop floors, finishing at the door so you do not walk on them"]),
      bullets("Habits that save time", ["Carry everything in a caddy", "Work in one direction around the room", "Let cleaning products do the work during the contact time"]),
      para("A room-by-room order", "In a whole-house clean, many people start upstairs and work down, doing the bedrooms first, then the living areas, kitchen and bathrooms, with the downstairs floors last. This keeps dust from falling on finished work.")
    ],
    faq: ["Should I vacuum before or after dusting?", "After. Dust falls to the floor as you work, so vacuuming last collects it."],
  }),
  guide({
    slug: "cleaning-routine-for-busy-working-people", title: "A 20-Minute-a-Day Cleaning Routine for Busy Working People",
    description: "A realistic daily and weekly cleaning routine for people with full-time jobs, plus when it makes sense to bring in a regular cleaner.",
    summary: "A realistic routine that fits around a full-time job.", minutes: 4, service: "house-cleaning",
    intro: "A full-time job leaves little energy for housework. Small, daily habits stop the weekend turning into one big clean-up.",
    sections: [
      bullets("Twenty minutes, most days", ["Wash up or load the dishwasher straight after eating", "Wipe the worktops and hob", "Quick tidy of the living area before bed", "Take out the rubbish when the bin is full"]),
      bullets("Weekly, split across days", ["Monday: bathroom", "Wednesday: vacuum and mop", "Friday: kitchen and bins", "Weekend: bedding and one deeper job"]),
      para("When to get help", "If the routine is not realistic for you, a regular visit from a cleaner handles the heavy weekly jobs while you keep up with the small daily ones."),
    ],
    faq: ["How many hours a week does a home need?", "It depends on its size and your household, but a one or two-bedroom home is often comfortably covered by a few hours of regular cleaning every week or two."],
  }),
  guide({
    slug: "cleaning-safely-with-children-and-pets", title: "Cleaning Safely With Children and Pets in the Home",
    description: "How to clean a home with children and pets safely: product storage, safer habits, pet-safe cleaning and what to avoid.",
    summary: "Product storage, safe habits and what to avoid.", minutes: 3, service: "house-cleaning",
    intro: "Children and pets explore with their hands and mouths. A few habits make cleaning safer without lowering your standards.",
    sections: [
      bullets("Store products safely", ["Keep all cleaning products, including pods and tablets, in a high or locked cupboard", "Keep them in their original containers, never in drinks bottles", "Put them away straight after use"]),
      bullets("Clean safely", ["Ventilate while you clean, and keep children and pets out until floors are dry", "Rinse surfaces where food is prepared or a child plays", "Use pet-safe products and check labels, as some ingredients are harmful to animals"]),
      para("If there is an accident", "If a child or pet has swallowed a cleaning product, call NHS 111 or your vet immediately, and keep the packaging to hand."),
    ],
    faq: ["Are natural cleaners safer around pets?", "Not automatically. Some natural products, such as essential oils, can be harmful to pets, so check before using them."],
  }),
  guide({
    slug: "cleaning-for-allergies-and-dust", title: "Cleaning to Cut Down on Dust: A Practical Guide",
    description: "Practical ways to reduce household dust: vacuuming, washing bedding, damp dusting and keeping humidity down. General advice, not medical.",
    summary: "Vacuuming, bedding, damp dusting and humidity.", minutes: 4, service: "deep-cleaning",
    intro: "Dust and damp are common triggers for people with sensitivities. Regular cleaning habits can help reduce them. This is general advice, so speak to a pharmacist or GP about symptoms.",
    sections: [
      bullets("Habits that help", ["Vacuum at least weekly, using a vacuum with a good filter", "Damp-dust surfaces instead of using dry dusters", "Wash bedding weekly at a high temperature the label allows", "Wash curtains and cushion covers regularly"]),
      bullets("Reduce the sources", ["Keep clutter down, because every object collects dust", "Use mats at doors and take shoes off", "Ventilate rooms and keep humidity down to discourage mould and damp"]),
      para("Deep cleaning", "A deep clean reaches the places that gather dust unnoticed: under beds, behind furniture and on high surfaces."),
    ],
    faq: ["Will cleaning cure my allergies?", "No. Cleaning can help reduce triggers in the home, but medical advice is for a pharmacist or GP."],
  }),
  guide({
    slug: "declutter-before-you-clean", title: "Declutter Before You Clean: A Simple Method That Saves Hours",
    description: "A simple declutter method to do before cleaning: sort into four piles, clear surfaces first and keep clutter from coming back.",
    summary: "A four-pile method that makes cleaning much faster.", minutes: 3, service: "house-cleaning",
    intro: "Cleaning around clutter takes twice as long. Clearing surfaces first makes every other job quicker.",
    sections: [
      steps("The four-pile method", ["Keep: things that belong in this room, put away at once", "Move: things that belong in another room, in a basket to redistribute later", "Donate or sell: things you no longer need", "Bin or recycle: broken or unused items"]),
      bullets("Keep it from returning", ["Give everything a home", "Do a two-minute reset each evening", "Apply a one-in, one-out rule for clothes and kitchen items"]),
      para("Why it works", "Decluttering cuts cleaning time because every object on a surface is something you have to lift, wipe under and replace. With fewer things out, dusting and wiping takes minutes instead of an hour.")
    ],
    faq: ["Where do I start?", "Start with the surfaces you use most: kitchen worktops, the coffee table and the bedside table."],
  }),
  guide({
    slug: "keeping-a-small-flat-clean", title: "How to Keep a Small Flat Clean (When There Is Nowhere to Hide Things)",
    description: "Smart habits for keeping a small flat or studio clean: daily resets, storage, ventilation and the jobs worth doing weekly.",
    summary: "Daily resets, storage and ventilation for small spaces.", minutes: 3, service: "house-cleaning",
    intro: "In a small flat, mess is visible immediately, and the kitchen, bedroom and living space are all one room. Small habits matter more.",
    sections: [
      bullets("Daily", ["Make the bed, which makes the whole room look tidier", "Wash up straight away", "Return things to their place before bed"]),
      bullets("Weekly", ["Vacuum and mop the floor", "Clean the bathroom", "Change the bedding and wipe surfaces"]),
      bullets("Smart choices", ["Use vertical and under-bed storage", "Ventilate well, because small spaces get damp and stuffy", "Choose furniture with hidden storage"]),
    ],
    faq: ["How often should a studio flat be cleaned?", "Little and often works best: a quick tidy every day and a full clean weekly."],
  }),
  guide({
    slug: "shared-house-cleaning-rota", title: "A Fair Cleaning Rota for a Shared House",
    description: "How to set up a cleaning rota in a shared house that actually works, with a sample weekly schedule and tips to avoid arguments.",
    summary: "A sample rota, and how to keep housemates on board.", minutes: 3, service: "house-cleaning", printable: true,
    intro: "Shared houses fall out over cleaning more than almost anything else. A clear, fair rota, agreed by everyone, avoids most of the arguments.",
    sections: [
      steps("Setting it up", ["List the shared jobs: kitchen, bathroom, living room, hallway, bins and floors", "Rotate them weekly so nobody is stuck with the bathroom", "Agree standards, such as what counts as done", "Put it somewhere visible, and agree what happens if someone misses a turn"]),
      bullets("Sample weekly jobs", ["Kitchen: wipe surfaces, clean the hob and sink, take out bins", "Bathroom: toilet, sink, shower, floor", "Living areas: vacuum and tidy", "Hallway and stairs: sweep and mop"]),
      para("Another option", "Some houses split the cost of a regular cleaner, which removes the argument and gives everybody their time back."),
    ],
    faq: ["What if a housemate does not do their share?", "Raise it early and calmly, refer back to the agreed rota, and consider sharing the cost of a cleaner if it keeps happening."],
  }),
  guide({
    slug: "student-house-cleaning-and-move-out-guide", title: "Student House Cleaning and Move-Out Guide",
    description: "How students can keep a shared house clean, and how to clean up at the end of the tenancy to protect the deposit in a house share.",
    summary: "Keeping a house share clean, and the end-of-year clean-up.", minutes: 4, service: "end-of-tenancy-cleaning", printable: true,
    intro: "Student houses are busy, shared and often left until the last minute. A little structure during the year, and a plan for move-out, protects everyone's deposit.",
    sections: [
      bullets("During the year", ["Agree a rota and stick to it", "Clean the kitchen after each use", "Report damp, leaks and repairs to the landlord in writing", "Keep the check-in inventory and photos"]),
      bullets("At the end of the tenancy", ["Agree who is responsible for each room", "Clean the oven, fridge, bathroom and floors thoroughly", "Remove all rubbish and belongings, including from the garden and shed", "Take dated photos, and return all keys together"]),
      para("Joint liability", "In many shared tenancies, tenants are jointly liable for the deposit, so one person's mess can affect everyone. Splitting the cost of a professional end of tenancy clean is a fair and stress-free way to protect it."),
    ],
    faq: ["Who is responsible for the deposit in a house share?", "It depends on the tenancy agreement, but with a joint tenancy, deductions may affect everyone. Check your agreement."],
  }),
];
