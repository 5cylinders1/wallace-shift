import type { PostEntry } from './types'

export const troubleshooting: PostEntry[] = [
  {
    slug: 'why-is-there-no-hot-water', title: 'Why Is There No Hot Water in My House?',
    description: 'Find out why hot water stops or runs out early. Learn which symptoms point to a single fixture, a capacity issue or a water heater that needs service.',
    intro: 'Before blaming the water heater, try the hot tap at a second fixture. If the kitchen still gets hot but the shower doesn’t, the shower valve may be the problem. Cold water at several taps points toward the heater or the hot water supply.',
    sections: [
      ['If the water starts hot, then turns cold', 'Think about what was running just before the problem. A tank can run out after several showers and a load of laundry close together. Colder incoming water in winter can also reduce how much usable hot water you get. If a familiar routine suddenly uses up the hot water, a failed heating element, a damaged dip tube or mineral buildup could be involved.'],
      ['If the water never warms up', 'Note whether the unit has power and whether an external display shows an error code. On an electric model, the problem may be the power supply, thermostat or an element. On a gas model, ignition or a safety control may be involved. Don’t open electrical panels on the heater, bypass controls or repeatedly reset a breaker that trips.'],
      ['When to stop checking and call', 'If you smell gas, leave immediately and call the gas utility or 911 from a safe location. If there’s water near electrical equipment, don’t touch the unit or step into the water. For a routine outage, tell the technician whether all taps are affected, what the display says and when the issue started.'],
    ], related: ['water-heater-repair-or-replacement', 'water-heater-leaking-rust-sediment', 'what-size-water-heater-do-i-need'],
  },
  {
    slug: 'water-heater-leaking-rust-sediment', title: 'Water Heater Leaking? What Rust and Sediment Can Tell You',
    description: 'Learn what water at the base, rusty hot water, white particles, tank noise or a dripping relief valve might mean and when to call for service.',
    intro: 'The important question isn’t just whether you see water, but where it first appears. A drip from a fitting can travel down the side and collect under a sound tank. Water coming through the tank itself is a different story and usually calls for replacement.',
    sections: [
      ['A dripping relief pipe needs attention', 'The temperature and pressure relief valve is a safety device. Discharge can signal excess pressure, overheating, thermal expansion or a valve problem. Never plug or cap the outlet. If discharge is heavy or you see steam, keep clear and get urgent help. If water is near electrical equipment, stay out of the wet area.'],
      ['Compare the hot and cold taps', 'Rusty water only on the hot side may come from the heater or hot water piping. A depleted anode can leave the tank more vulnerable to corrosion, but color alone doesn’t identify the source. If both hot and cold water are discolored, the supply or household piping may be involved. White particles can be mineral deposits or pieces of a deteriorating plastic dip tube.'],
      ['Listen for changes, and keep a record', 'Popping or rumbling during a heating cycle can come from sediment in a storage tank. Note when it happens, whether hot water runs out earlier and whether there’s visible moisture. Ask a technician whether inspection, flushing or anode service makes sense for the age and condition of your unit. Avoid opening a hot or pressurized tank yourself.'],
    ], related: ['water-heater-repair-or-replacement', 'water-heater-permits-and-expansion-tanks', 'how-long-do-water-heaters-last'],
  },
  {
    slug: 'best-water-heater-temperature', title: 'What Temperature Should a Water Heater Be Set To?',
    description: 'Learn why 120°F is a common starting point, how to check tap temperature and when to ask about mixing valves or different storage settings.',
    intro: 'For many households, 120°F is a reasonable starting point. It can reduce energy use and the chance of a scald compared with a higher setting. It doesn’t eliminate the risk of burns, and it isn’t the right answer for every system or household.',
    sections: [
      ['Check the water at the tap', 'The thermostat setting and the temperature at the faucet aren’t necessarily the same. If you can do it safely, let the hot tap run until the temperature stabilizes, then measure with a suitable thermometer without putting your hand in the stream. Follow your model’s instructions. If adjustment means opening an electrical cover, have a professional handle it.'],
      ['Storage temperature and delivery temperature can differ', 'Some setups need a different storage temperature for sanitation or equipment requirements. Lower storage temperatures may favor the growth of bacteria such as Legionella in some systems, while hotter water raises the risk of scalding. A qualified plumber can explain whether a thermostatic mixing valve is appropriate to limit temperature at fixtures. Get individual advice if anyone in the household is at elevated risk.'],
      ['Don’t turn it up to hide a hot water problem', 'If showers have started running cold sooner than usual, look for a cause rather than raising the temperature. Changes in demand, colder supply water or a faulty component can all reduce the hot water you have available. If the water is unexpectedly hot or the relief valve is discharging, arrange service.'],
    ], related: ['why-is-there-no-hot-water', 'energy-efficient-water-heater-savings'],
  },
];