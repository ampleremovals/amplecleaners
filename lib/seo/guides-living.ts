import { bullets, guide, para, steps } from "@/lib/seo/guide-kit";

/** Batch 3: living areas, bedrooms, floors and outdoor spaces. */
export const LIVING_GUIDES = [
  guide({
    slug: "how-to-clean-a-sofa", title: "How to Clean a Sofa and Upholstery at Home",
    description: "How to clean a fabric sofa safely: check the care label, vacuum, treat stains and freshen upholstery without soaking it.",
    summary: "Check the label, vacuum, spot-treat and freshen without soaking.", minutes: 4, service: "deep-cleaning",
    intro: "Sofas collect dust, crumbs and body oils. A regular vacuum and a careful spot clean keep them looking good for longer.",
    sections: [
      steps("Method", ["Check the care label: W means water-based cleaner, S means solvent only, WS means either, and X means vacuum only", "Remove cushions, vacuum the seat, the sides and under the cushions with an upholstery tool", "Sprinkle bicarbonate of soda over the fabric, leave for an hour to absorb odours, then vacuum off", "Spot-treat stains by blotting, never rubbing, with a mild cleaner suited to the label, after testing a hidden area", "Let it dry fully, away from direct heat"]),
      bullets("Tips", ["Rotate and plump cushions weekly", "Treat spills straight away", "Leather needs a leather cleaner and conditioner, not water-based sprays"]),
      para("When to call a professional", "For large stains, delicate fabrics, or a sofa that smells or looks tired all over, professional upholstery cleaning gets deeper than a home clean without risking the fabric.")
    ],
    faq: ["Can I steam clean a sofa?", "Only if the care label allows it. Too much heat or water can damage some fabrics and padding."],
  }),
  guide({
    slug: "how-to-clean-a-mattress", title: "How to Clean and Freshen a Mattress",
    description: "How to clean a mattress: vacuum, treat stains, deodorise with bicarbonate of soda and keep it fresh, without soaking the fabric.",
    summary: "Vacuum, spot-treat, deodorise and let it dry fully.", minutes: 3, service: "deep-cleaning",
    intro: "A mattress absorbs sweat and dust over the years. Cleaning it every few months, and protecting it with a washable cover, keeps it fresher.",
    sections: [
      steps("Method", ["Strip the bed and wash the bedding on the hottest setting its label allows", "Vacuum the whole surface, including the seams and sides, with the upholstery tool", "Spot-treat stains with a little mild detergent on a damp cloth, blotting rather than rubbing", "Sprinkle bicarbonate of soda over the surface, leave for several hours, then vacuum it up", "Let the mattress air fully before remaking the bed"]),
      bullets("Keep it fresh", ["Use a washable mattress protector", "Rotate or flip the mattress as the manufacturer advises", "Never soak a mattress, because damp can lead to mould"]),
      para("When to replace it", "If a mattress sags, hurts your back, or has deep, persistent stains or mould, cleaning will not fix it. Most mattresses are worth replacing after around eight to ten years, according to common manufacturer guidance.")
    ],
    faq: ["How often should I clean my mattress?", "Vacuum it every few months and air it when you change the bedding."],
  }),
  guide({
    slug: "how-to-wash-pillows-and-duvets", title: "How to Wash Pillows and Duvets (and How Often)",
    description: "How to wash pillows and duvets at home: what the care labels mean, how to dry them properly and when to replace them.",
    summary: "Care labels, washing, drying and when to replace.", minutes: 3, service: "deep-cleaning",
    intro: "Pillows and duvets rarely get washed, but they hold dust and moisture. Most can go in a machine if the label allows it.",
    sections: [
      steps("Method", ["Check the care label for the temperature and whether the item is machine washable", "Wash pillows two at a time to balance the drum, and use a gentle cycle with a mild detergent", "Run an extra rinse to remove detergent", "Dry fully on a low heat in a tumble dryer with dryer balls, or outdoors in the air, because damp filling goes musty"]),
      bullets("How often", ["Pillows: a couple of times a year", "Duvets: once or twice a year, and wash the cover often", "Replace pillows that no longer hold their shape or smell musty after washing"]),
      para("Large duvets", "If a king-size duvet will not fit your machine, a launderette with large machines is a good alternative."),
    ],
    faq: ["Can all duvets be machine washed?", "No. Check the label, because some fillings and fabrics need specialist cleaning."],
  }),
  guide({
    slug: "how-to-clean-laminate-and-wood-floors", title: "How to Clean Laminate and Wood Floors Without Damaging Them",
    description: "How to clean laminate and wooden floors safely: sweeping, damp mopping, stains, and what to avoid so you do not warp or dull the surface.",
    summary: "Damp mopping, stains and what damages these floors.", minutes: 3, service: "house-cleaning",
    intro: "Laminate and wood floors dislike water. The golden rule is a barely damp mop and a gentle cleaner.",
    sections: [
      steps("Weekly clean", ["Sweep or vacuum with a hard-floor setting to remove grit that scratches", "Mop with a well-wrung microfibre mop dampened with water or a cleaner made for the floor", "Dry any wet patches straight away"]),
      bullets("Avoid", ["Soaking the floor or using a steam mop, unless the manufacturer says it is safe", "Abrasive cleaners and wax on laminate", "Dragging furniture, so use felt pads under the legs"]),
      para("Marks and scuffs", "Rub scuffs gently with a dry or slightly damp microfibre cloth, and treat sticky marks with a little washing-up liquid on a damp cloth."),
    ],
    faq: ["Can I use vinegar on a wooden floor?", "Strong or undiluted vinegar can dull some finishes, so use a cleaner designed for wood or the manufacturer's recommendation."],
  }),
  guide({
    slug: "how-to-clean-tiles-and-vinyl-floors", title: "How to Clean Tile and Vinyl Floors Properly",
    description: "How to mop tile and vinyl floors without streaks, clean the grout lines, and keep kitchen and bathroom floors looking fresh.",
    summary: "Mopping without streaks, and keeping grout lines clean.", minutes: 3, service: "house-cleaning",
    intro: "Hard floors show every footprint. Changing your mop water and using the right amount of cleaner prevents streaks.",
    sections: [
      steps("Method", ["Sweep or vacuum first, so you are not pushing grit around", "Mix warm water with a small amount of floor cleaner", "Mop in sections, wringing out the mop well, and change the water when it is dirty", "Rinse with clean water if the floor looks sticky, then dry or let it air dry"]),
      bullets("Tips", ["Use less cleaner, because too much leaves a film", "Use a soft brush on grout lines, and see our guide to cleaning grout", "Place mats at doors to reduce the dirt coming in"]),
      bullets("Different floors, different care", ["Ceramic and porcelain tile: handle most cleaners, but not abrasive ones on glazed finishes", "Natural stone: use a pH-neutral cleaner, never acid", "Vinyl: avoid excess water at the seams, and avoid harsh solvents", "Textured tiles: use a stiff brush so dirt is lifted out of the grooves"])
    ],
    faq: ["Why does my floor look streaky after mopping?", "Usually too much cleaner or dirty mop water. Use a small amount of product and fresh water."],
  }),
  guide({
    slug: "how-to-clean-skirting-boards-doors-and-switches", title: "How to Clean Skirting Boards, Doors and Light Switches",
    description: "The small jobs that make a home look clean: how to wipe skirting boards, door frames, handles and light switches safely.",
    summary: "The small, forgotten surfaces that make a room look clean.", minutes: 3, service: "deep-cleaning",
    intro: "Skirting boards, doors and switches are touched or splashed daily but rarely cleaned. They are among the first things noticed at an inspection.",
    sections: [
      steps("Method", ["Dust skirting boards and door frames first, with a dry microfibre cloth or the vacuum brush", "Wipe with a damp cloth and a drop of washing-up liquid, then dry", "Wipe door handles and the area around them, where hands leave marks", "Clean light switches and sockets with a lightly damp cloth, never spraying liquid directly on them, and turn the power off at the fuse box if you need to be careful"]),
      bullets("Tips", ["Work top to bottom", "Test on painted surfaces if you are using a stronger cleaner", "Use a magic sponge for scuff marks, gently"]),
      para("Why it matters", "These small surfaces frame every room. At a check-out or viewing, clean skirting, doors and switches signal that the whole property has been looked after.")
    ],
    faq: ["Can I use bleach on painted walls and skirting?", "It can discolour paint. Use mild soapy water first."],
  }),
  guide({
    slug: "how-to-clean-blinds-and-curtains", title: "How to Clean Blinds and Curtains",
    description: "How to clean roller, venetian and vertical blinds and wash or refresh curtains, with tips on what the care label allows.",
    summary: "Blinds, curtains and what the care label allows.", minutes: 3, service: "deep-cleaning",
    intro: "Blinds and curtains collect dust and cooking smells. Cleaning them makes a room look and smell fresher.",
    sections: [
      bullets("Blinds", ["Venetian: close them and wipe each slat with a damp microfibre cloth, or use a special slat cleaner, then open and wipe the other side", "Roller: vacuum with a soft brush, then spot-clean marks with a damp cloth", "Vertical: dust with a soft brush and wipe each vane", "Fabric blinds: check the label before using water"]),
      bullets("Curtains", ["Vacuum or shake out dust every month or so", "Machine-wash if the label allows, on a gentle cycle, and re-hang while slightly damp", "Dry-clean only labels must be respected, and lined curtains often need professional care"]),
      para("Easier next time", "Run a dry cloth or vacuum brush over blinds and curtains when you do your weekly dusting, so dirt never builds up to the point where it needs a full wash.")
    ],
    faq: ["How often should I wash my curtains?", "Once or twice a year, and more often in kitchens or homes with pets, smokers or allergies."],
  }),
  guide({
    slug: "how-to-dust-properly", title: "How to Dust Properly (So It Does Not Just Come Back)",
    description: "How to dust effectively: the right cloths, working top to bottom, the places people miss and how to stop dust settling so quickly.",
    summary: "Top to bottom, damp cloths and the spots people miss.", minutes: 3, service: "house-cleaning",
    intro: "Dusting with a dry feather duster mostly moves dust around. A few small changes capture it instead.",
    sections: [
      steps("The method", ["Open the window a little, and start at the top of the room", "Use a slightly damp microfibre cloth, which traps dust, rather than a feather duster", "Work from high to low: light fittings, shelves, picture frames, then furniture, skirting and floors", "Vacuum last, because dust falls as you work"]),
      bullets("Often missed", ["Tops of wardrobes and door frames", "Blinds, vents and the back of the TV", "Under the sofa and bed", "Ceiling fans and lampshades"]),
      para("Cut down on dust", "Wash bedding weekly, vacuum regularly with a good-filter vacuum, and keep clutter down, because every object is a dust-collector."),
    ],
    faq: ["Why is my house so dusty?", "Dust is made of fibres, skin and outdoor particles. More fabric, clutter, pets, open windows and heating all increase it."],
  }),
  guide({
    slug: "how-to-clean-a-tv-and-electronics", title: "How to Clean a TV, Screens and Electronics Safely",
    description: "How to clean TV screens, laptops, keyboards and remotes without damaging them, with the products to use and avoid.",
    summary: "What to use and what to avoid on screens and gadgets.", minutes: 3, service: "house-cleaning",
    intro: "Screens and electronics are easily damaged by the wrong cleaner. Less is more: a soft cloth and very little moisture.",
    sections: [
      steps("Screens", ["Switch the device off and unplug it", "Wipe with a dry microfibre cloth to remove dust", "For marks, lightly dampen the cloth with water, or a screen cleaner approved by the manufacturer, and wipe gently, never spraying the screen directly"]),
      bullets("Keyboards and remotes", ["Turn them upside down and tap out crumbs", "Use a soft brush or compressed air in the gaps", "Wipe the keys and buttons with a barely damp cloth, or a cloth with a little isopropyl alcohol if the maker allows it"]),
      bullets("Avoid", ["Glass cleaners, bleach and abrasive cloths on screens", "Soaking any electronic item", "Cleaning while it is plugged in"]),
    ],
    faq: ["Can I use wet wipes on a TV?", "Many contain chemicals that can damage coatings. Use a microfibre cloth and check the manufacturer's advice."],
  }),
  guide({
    slug: "how-to-clean-radiators", title: "How to Clean Radiators, Including Behind Them",
    description: "How to clean radiators, between the fins and the hard-to-reach space behind, so they heat well and stop spreading dust.",
    summary: "Between the fins and behind the radiator.", minutes: 3, service: "deep-cleaning",
    intro: "Dust collects between radiator fins and behind them, and gets blown around when the heating goes on. Autumn is the best time to clean them.",
    sections: [
      steps("Method", ["Switch the heating off and let the radiator cool", "Vacuum the top and the gaps between the fins with a narrow attachment", "Slide a damp microfibre cloth, wrapped around a ruler or a long, thin tool, down behind and between the fins", "Wipe the front and the pipework, and dry", "Put a towel on the floor to catch drips if you use a damp cloth"]),
      bullets("Tips", ["Do this once or twice a year", "Do not place furniture directly against a radiator", "Bleed radiators if they feel cold at the top, following the manufacturer's advice"]),
      para("Why autumn", "Cleaning radiators before you switch the heating on stops the first burn-off of dust, which can create a stale smell around the home.")
    ],
    faq: ["Do dirty radiators heat less well?", "Heavy dust can reduce airflow around them, so keeping them clean helps them work as designed."],
  }),
  guide({
    slug: "how-to-clean-a-balcony-and-patio", title: "How to Clean a Balcony, Patio and Outdoor Furniture",
    description: "How to clean a balcony or patio: sweeping, scrubbing paving, removing moss and algae, and cleaning outdoor furniture.",
    summary: "Sweeping, scrubbing, moss and outdoor furniture.", minutes: 3, service: "deep-cleaning",
    intro: "Outdoor spaces get dirty quickly and moss makes paving slippery. A simple routine keeps them safe and usable.",
    sections: [
      steps("Patio and balcony", ["Clear the furniture and sweep away leaves, dirt and debris", "Scrub with warm water, a stiff brush and a patio cleaner suited to the surface, working in small sections", "Rinse with clean water and let it dry", "Treat moss and algae with a moss remover, following the label, and keep the area ventilated"]),
      bullets("Furniture", ["Wipe plastic and metal with soapy water", "Clean wooden furniture with a wood cleaner, then re-oil if needed", "Wash cushion covers if the label allows"]),
      para("Be considerate", "If you are on a balcony, avoid dirty water running onto neighbours, and check your lease before using a pressure washer."),
    ],
    faq: ["Is it safe to use a pressure washer?", "On many paving surfaces, yes, but it can damage soft stone, mortar and decking, so check the surface and the manufacturer's guidance."],
  }),
];
