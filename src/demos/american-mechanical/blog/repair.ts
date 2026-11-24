import type { PostEntry } from './types'

export const repair: PostEntry[] = [
  {
    slug: 'how-long-do-water-heaters-last', title: 'How Long Do Water Heaters Last?',
    description: 'Expect roughly 8 to 12 years from many tank water heaters and 15 to 20 years or more from a well maintained tankless unit. Know what can shorten that lifespan.',
    intro: 'A conventional storage tank often lasts around 8 to 12 years. A tankless unit can reach 15 to 20 years or more with proper care. Those ranges are useful for planning, but they aren’t expiration dates. A unit’s condition tells you more than its age alone.',
    sections: [
      ['Find the age before making a decision', 'Start with your invoice or installation sticker. If it’s missing, take a photo of the model and serial number on the label. A manufacturer can usually look up the production date, which is a useful fallback when you don’t know when it went into service. Check the warranty separately because parts, labor and the tank may have different coverage.'],
      ['What wears out first?', 'In a storage heater, the sacrificial anode helps protect the steel tank from corrosion. Water chemistry, mineral buildup and maintenance all affect how long that protection lasts. Tankless units don’t have a storage tank to corrode, but mineral scale can affect the heat exchanger. Follow the service schedule for your model and water conditions.'],
      ['Plan while the heater still works', 'If the unit is older but still keeping up, use the time to measure the opening, compare replacement options and ask about changes to hookups. If you see water at the base, corrosion around the tank or a sudden drop in hot water, get it checked sooner. A small puddle can come from a connection, so locate the source before buying a new heater.'],
    ], related: ['water-heater-repair-or-replacement', 'water-heater-leaking-rust-sediment'],
  },
  {
    slug: 'water-heater-repair-or-replacement', title: 'Should You Repair or Replace Your Water Heater?',
    description: 'Compare repair and replacement based on the failed part, tank condition, warranty and installed price. Know when a leak means it’s time to replace.',
    intro: 'Ask what failed before you ask what a new heater costs. A bad heating element in a sound electric tank is a very different problem from water leaking through the bottom of the tank itself.',
    sections: [
      ['When repair makes sense', 'A thermostat, heating element or accessible connection can often be repaired without replacing the whole unit. Repair is easier to justify when the equipment is otherwise in good condition, met your needs before the failure and hasn’t needed repeated service. Ask what the quote covers and whether the failed part is under warranty.'],
      ['When replacement makes sense', 'A leak through the storage tank generally means replacing the heater. Water on the floor alone isn’t proof of a failed tank. A fitting, drain valve or relief discharge can also leave a puddle. With an aging unit that’s had several repairs, compare the cost of fixing the immediate problem with a complete replacement that addresses the underlying condition.'],
      ['Compare real quotes, not a rule of thumb', 'Ask for the diagnosis, repair total and installed replacement total. Include permits where required, disposal, any hookup changes and warranty terms. If the heater has never supplied enough hot water, tell the installer before pricing a replacement so you aren’t paying to put the same problem back in.'],
    ], related: ['how-long-do-water-heaters-last', 'water-heater-replacement-cost-and-time', 'water-heater-leaking-rust-sediment'],
  },
];