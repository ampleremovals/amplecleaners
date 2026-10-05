import { bullets, guide, para, steps } from "@/lib/seo/guide-kit";

/** Batch 2: kitchen, appliances and bathroom how-tos. */
export const KITCHEN_BATH_GUIDES = [
  guide({
    slug: "how-to-clean-a-microwave", title: "How to Clean a Microwave Quickly (No Scrubbing)",
    description: "Clean a microwave in minutes with steam and a cloth: the simple method, how to remove smells, and the mistakes to avoid.",
    summary: "A steam method that loosens baked-on splatters in minutes.", minutes: 3, service: "deep-cleaning",
    intro: "Splatters bake on every time you reheat, which makes them harder to remove. Steam loosens them so you wipe instead of scrub.",
    sections: [
      steps("Method", ["Put a microwave-safe bowl with water and a few slices of lemon, or a splash of white vinegar, inside", "Heat on high for around three to five minutes, until the window is steamed up", "Leave the door closed for five minutes, so the steam keeps working", "Carefully remove the bowl, which will be hot, and wipe the inside with a damp cloth", "Wipe the turntable, which you can wash in hot soapy water, and the door seal"]),
      bullets("Tips", ["Cover food to stop splatters in the first place", "Wipe up spills the same day", "Do not use abrasive pads on the interior, and never run the microwave empty"]),
      bullets("Common mistakes", ["Using metal scourers that scratch the interior", "Leaving splatters for weeks so they bake on harder", "Forgetting the door seal and the ceiling of the cavity"])
    ],
    faq: ["How do I get a burnt smell out of a microwave?", "Steam a bowl of water with lemon or vinegar, wipe the inside, and leave the door open to air for a while."],
  }),
  guide({
    slug: "how-to-clean-a-fridge-and-freezer", title: "How to Clean a Fridge and Freezer (and Keep Them Fresh)",
    description: "A step-by-step guide to cleaning a fridge and freezer: emptying, defrosting, wiping, removing smells and organising so food stays fresh.",
    summary: "Empty, defrost, wipe, deodorise and reorganise.", minutes: 4, service: "deep-cleaning",
    intro: "A fridge deserves a proper clean every few months. It keeps food safer, removes smells, and is one of the jobs checked at move-out.",
    sections: [
      steps("Fridge", ["Empty it, checking use-by dates and binning anything expired", "Remove shelves and drawers and wash them in warm soapy water", "Wipe the inside with a mild solution of bicarbonate of soda and warm water", "Clean the door seals, where mould often hides, with a soft brush", "Dry everything, put it back, and group food by type"]),
      steps("Freezer", ["Switch off, empty into a cool box, and let it defrost with towels to catch the water", "Wipe the interior, rinse and dry thoroughly", "Switch back on and restock once it is cold again"]),
      bullets("Keep it fresh", ["Store open bicarbonate of soda or coffee grounds to absorb smells", "Wipe spills as they happen", "Check the temperature and do not overfill"]),
    ],
    faq: ["How often should I clean my fridge?", "A quick wipe weekly, and a full clean every three months, is a good routine."],
  }),
  guide({
    slug: "how-to-clean-a-dishwasher", title: "How to Clean a Dishwasher and Stop It Smelling",
    description: "How to clean a dishwasher filter, spray arms and seals, and run a maintenance cycle to remove smells and limescale.",
    summary: "Filter, spray arms, seals and a maintenance cycle.", minutes: 3, service: "deep-cleaning",
    intro: "A dishwasher cleans dishes, but food debris and limescale build up inside it. A little care every month or two stops smells and keeps it working well.",
    sections: [
      steps("Monthly clean", ["Remove the bottom rack and take out the filter, then rinse it under warm water with a soft brush", "Check the spray arms for blocked holes and clear them with a toothpick", "Wipe the door seal and edges, where grime collects", "Run a maintenance cycle with a dishwasher cleaner, following the label, or as the manufacturer advises"]),
      bullets("Prevent smells", ["Scrape, do not rinse, plates before loading", "Leave the door slightly open after a cycle so it dries", "Use rinse aid and salt if you have hard water, as your manual recommends"]),
      bullets("Signs it needs cleaning", ["A musty smell when you open the door", "Cloudy glasses or a gritty film on dishes", "Standing water at the bottom after a cycle", "White limescale marks on the interior"])
    ],
    faq: ["Can I use vinegar in a dishwasher?", "Some manufacturers advise against it because it can affect rubber seals, so check your manual first."],
  }),
  guide({
    slug: "how-to-clean-a-washing-machine", title: "How to Clean a Washing Machine (Drum, Drawer and Seal)",
    description: "Clean a washing machine properly: the drum, detergent drawer, rubber seal and filter, plus how to stop it smelling musty.",
    summary: "Drum, drawer, seal and filter, plus how to stop musty smells.", minutes: 4, service: "deep-cleaning",
    intro: "A musty washing machine usually means detergent residue and damp. Cleaning the parts that hold water, and letting it dry, fixes it.",
    sections: [
      steps("Clean it", ["Remove the detergent drawer and wash it in warm soapy water, brushing out the housing", "Wipe the rubber door seal and pull back the folds, where mould and grime hide", "Clean the filter, usually behind a small hatch at the bottom, with a towel and bowl ready for water", "Run an empty hot cycle with a washing machine cleaner, as the manufacturer advises"]),
      bullets("Prevent smells", ["Leave the door and drawer ajar between washes", "Take out wet washing promptly", "Do not use too much detergent, and run a hot wash now and then"]),
      bullets("Signs it needs cleaning", ["A musty smell on clothes after washing", "Black mould on the door seal", "Residue or slime in the detergent drawer", "Water draining slowly, which can mean a blocked filter"])
    ],
    faq: ["How often should I clean my washing machine?", "A monthly maintenance wash and a wipe of the seal keeps most machines fresh."],
  }),
  guide({
    slug: "how-to-descale-a-kettle", title: "How to Descale a Kettle in 15 Minutes",
    description: "Descale a kettle with white vinegar or citric acid: the quick method, how to rinse safely, and how to slow limescale returning.",
    summary: "A quick vinegar or citric acid method and how to rinse safely.", minutes: 2, service: "deep-cleaning",
    intro: "Limescale makes a kettle slower, noisier and can leave flakes in your tea. Descaling takes a few minutes and costs very little.",
    sections: [
      steps("Method", ["Fill the kettle halfway with equal parts water and white vinegar, or water with a spoonful of citric acid", "Bring to the boil, then switch off and leave for about fifteen minutes", "Pour it away and scrub any remaining scale with a soft brush", "Fill with clean water, boil and discard it two or three times to remove the taste"]),
      bullets("Slow it down", ["Empty the kettle after use instead of leaving old water in it", "Use a filter jug in hard-water areas", "Descale every month or two"]),
      bullets("Good to know", ["Do not descale with the kettle plugged in and boiling over", "Rinse thoroughly, and discard the first boil after descaling", "Check your kettle's manual, because some manufacturers recommend a specific descaler"])
    ],
    faq: ["Is limescale harmful?", "It is not usually harmful, but it makes a kettle less efficient and can look and taste unpleasant."],
  }),
  guide({
    slug: "how-to-clean-an-induction-or-ceramic-hob", title: "How to Clean an Induction or Ceramic Hob Without Scratching It",
    description: "Clean an induction or ceramic glass hob safely: daily wipes, burnt-on food, limescale marks and the products to avoid.",
    summary: "Daily wipes, burnt-on food and what never to use.", minutes: 3, service: "deep-cleaning",
    intro: "Glass hobs look sleek but scratch easily. The right tools make cleaning simple and keep the surface smooth.",
    sections: [
      steps("Everyday clean", ["Wait until the hob is cool, then wipe off spills with a damp cloth and a drop of washing-up liquid", "Dry with a microfibre cloth to avoid streaks", "Use a hob cleaner occasionally for a polished finish"]),
      steps("Burnt-on food", ["Apply hob cleaner or a paste of bicarbonate of soda and water, and leave for a few minutes", "Use a hob scraper, held at a shallow angle, to lift the residue gently", "Wipe clean and polish"]),
      bullets("Avoid", ["Abrasive pads and powders", "Dragging pans across the glass", "Cleaning while the hob is hot"]),
    ],
    faq: ["What removes white marks from a ceramic hob?", "Those are usually limescale or sugar. A hob cleaner, or a little white vinegar on a cloth, normally lifts them."],
  }),
  guide({
    slug: "how-to-clean-a-kitchen-sink-and-drain", title: "How to Clean a Kitchen Sink and Banish Drain Smells",
    description: "How to clean a stainless steel or ceramic sink, remove stains and limescale, and clear the smells from a drain safely.",
    summary: "Stainless and ceramic sinks, stains, limescale and drain smells.", minutes: 3, service: "house-cleaning",
    intro: "The kitchen sink is one of the dirtiest places in the home and also one of the most visible. Regular cleaning prevents stains and smells.",
    sections: [
      bullets("Clean the sink", ["Stainless steel: wash with washing-up liquid, rub in the direction of the grain, and buff dry", "Ceramic or porcelain: use a non-scratch cream cleaner and a soft sponge", "Limescale: use white vinegar on a cloth, leave for a few minutes, then rinse", "Do not leave wet cloths or metal items sitting in the sink"]),
      steps("Freshen the drain", ["Remove food debris from the plughole and strainer", "Pour a kettle of hot water down the drain", "Add a spoonful of bicarbonate of soda, followed by a cup of white vinegar, and leave it to fizz for a few minutes", "Flush with hot water"]),
      para("When to get help", "A drain that stays slow or smelly after cleaning may be blocked further down, and a plumber is the safer option than strong chemicals."),
    ],
    faq: ["Can I use bleach in a kitchen sink?", "Use it sparingly and never mixed with other products. Washing-up liquid and a good rinse handle most jobs."],
  }),
  guide({
    slug: "how-to-clean-a-toilet-properly", title: "How to Clean a Toilet Properly (Including Under the Rim)",
    description: "How to clean every part of a toilet: bowl, under the rim, seat, hinges, cistern and floor, and how to remove limescale rings.",
    summary: "Every part, from under the rim to the base and floor.", minutes: 3, service: "house-cleaning",
    intro: "Most toilet cleaning stops at the bowl. The seat, hinges, base and floor around it are where odours and marks come from.",
    sections: [
      steps("Method", ["Put on gloves and apply toilet cleaner under the rim and around the bowl, then leave it for the time on the label", "Clean the seat, lid and hinges with a bathroom spray and a dedicated cloth", "Wipe the cistern, the flush handle and the pipework", "Brush the bowl, under the rim and the waterline, then flush", "Clean the base and the floor around it last"]),
      bullets("Limescale rings", ["Use a descaler designed for toilets, and leave it to work", "Scrub with a toilet brush or a pumice stick made for porcelain", "Never mix bleach with limescale remover or any other product"]),
      bullets("Good habits", ["Use a separate cloth and gloves for the toilet, and wash them afterwards", "Put the lid down before flushing to cut spray", "Replace the toilet brush when it is worn, and keep its holder clean"])
    ],
    faq: ["How often should I clean a toilet?", "Once or twice a week is typical, with a quick wipe of the seat and handle more often in busy households."],
  }),
  guide({
    slug: "how-to-clean-grout", title: "How to Clean Bathroom and Kitchen Grout",
    description: "How to clean dirty tile grout: the right products, a simple scrubbing method, and how to keep grout lines clean and sealed.",
    summary: "Products, method and how to keep grout clean for longer.", minutes: 3, service: "deep-cleaning",
    intro: "Grout is porous, so it soaks up dirt, grease and damp. Cleaning it brings a whole room back to life, and it is a common check-out item.",
    sections: [
      steps("Method", ["Sweep or vacuum the area and ventilate the room", "Apply a grout cleaner, or a paste of bicarbonate of soda and water, along the lines", "Leave for ten to fifteen minutes", "Scrub with a grout brush or an old toothbrush, rinse and dry"]),
      bullets("Be careful", ["Test on a hidden spot, especially on natural stone, where acids such as vinegar can damage the surface", "Do not mix bleach with other products", "For stubborn black mould, a mould remover is better than scrubbing harder"]),
      para("Keeping it clean", "Wipe tiles dry after showers, keep the room ventilated, and consider sealing grout if the installer advises it."),
    ],
    faq: ["Can I replace grout instead of cleaning it?", "If it is cracked or crumbling, yes. Regrouting is a small job that also stops water getting behind the tiles."],
  }),
  guide({
    slug: "how-to-clean-a-shower-head-and-screen", title: "How to Clean a Shower Head and Glass Screen",
    description: "Unblock a limescale-clogged shower head and clean a glass shower screen without streaks, using simple, safe products.",
    summary: "Unblock the shower head and keep glass clear.", minutes: 3, service: "deep-cleaning",
    intro: "Limescale blocks shower holes and fogs glass, and it builds up quickly in hard-water areas such as most of London.",
    sections: [
      steps("Shower head", ["Unscrew the head if you can, and soak it in a bowl of white vinegar and water for an hour", "Brush the nozzles with an old toothbrush, then rinse and refit", "If it is fixed, fill a bag with vinegar and tie it around the head for an hour, then wipe and run the water"]),
      steps("Glass screen", ["Wet the glass and apply a limescale remover or vinegar spray, leaving it for a few minutes", "Wipe with a microfibre cloth, then squeegee from top to bottom", "Dry the edges and the seals"]),
      bullets("Keep it clear", ["Squeegee after every shower", "Leave the door open to air out the bathroom", "Clean the head every month or two"]),
    ],
    faq: ["Can vinegar damage a shower head?", "Not on most chrome or plastic heads, but avoid long soaks on brass or gold finishes and check the manufacturer's guidance."],
  }),
  guide({
    slug: "how-to-clean-a-bath-and-shower-tray", title: "How to Clean a Bath and Shower Tray",
    description: "How to clean an acrylic, enamel or ceramic bath and shower tray: soap scum, limescale, stains and what not to use.",
    summary: "Soap scum, limescale and stains on baths and shower trays.", minutes: 3, service: "house-cleaning",
    intro: "Baths and trays collect soap scum and limescale, which dull the surface. The right cleaner for your material matters more than elbow grease.",
    sections: [
      steps("Method", ["Rinse the surface, then apply a non-abrasive bathroom cleaner", "Leave it for a few minutes to loosen the scum", "Wipe with a soft sponge, working from the top down, and rinse", "Treat limescale around taps with vinegar on a cloth, then rinse and dry"]),
      bullets("Avoid", ["Abrasive powders and scourers on acrylic, which scratch easily", "Bleach on coloured baths", "Mixing cleaners, especially bleach and descalers"]),
      para("Stained or yellowed baths", "A paste of bicarbonate of soda and water, left briefly and rinsed, can lift light staining. For heavy discolouration, a professional deep clean may be quicker and safer for the finish."),
    ],
    faq: ["Why does my bath get a grey ring?", "It is usually soap scum and body oils. Regular cleaning with a non-abrasive cleaner prevents it."],
  }),
];
