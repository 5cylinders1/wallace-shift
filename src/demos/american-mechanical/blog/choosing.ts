import type { PostEntry } from './types'

export const choosing: PostEntry[] = [
  {
    slug: 'best-type-of-water-heater', title: 'Which Type of Water Heater Is Best for Your Home?',
    description: 'Compare storage tank, tankless, heat pump and solar water heaters by installed cost, energy use and space before choosing a replacement.',
    intro: 'If your water heater quit this morning, a storage tank that fits the existing hookups may make more sense than a major upgrade. If you’re planning a replacement before the old unit fails, you have time to compare what each type costs to put in and what it takes to run.',
    sections: [
      ['Storage tank: the straightforward replacement', 'A conventional gas or electric tank keeps a reserve of hot water ready to use. A similar replacement often costs less to install when the hookups and venting are suitable. The tradeoff is that the heater uses some energy keeping water hot between uses, and the tank needs time to recover after heavy demand.'],
      ['Tankless: more floor space, but not unlimited flow', 'A tankless unit heats water as it passes through. It can keep one shower hot for a long time, but it still has a maximum flow rate. If two showers and a sink run together, size for all three at your winter inlet temperature. Get the price of any gas, electrical or venting changes before you compare quotes.'],
      ['Heat pump: a strong candidate for an electric replacement', 'A heat pump water heater moves warmth from the surrounding air into the tank. It can use considerably less electricity than a standard electric tank, but it needs adequate airflow and somewhere to drain condensate. Check room temperature, overhead clearance and noise before choosing a model.'],
      ['Solar: start with the property, not the equipment', 'Solar thermal systems collect heat from sunlight and store it for later use. Roof exposure, installation cost and freeze protection matter, and a backup heater usually covers cloudy days or unusually high demand. Compare the complete system cost with a heat pump before committing.'],
    ], related: ['what-size-water-heater-do-i-need', 'is-a-tankless-water-heater-worth-it', 'energy-efficient-water-heater-savings'],
  },
  {
    slug: 'what-size-water-heater-do-i-need', title: 'What Size Water Heater Do I Need?',
    description: 'Size a storage tank by first hour rating or a tankless water heater by peak flow and temperature rise. See a worked example for each.',
    intro: 'The right size depends more on when you use hot water than on how many people live in the house. Two adults who shower at the same time may put more demand on a heater than a larger family that spreads showers throughout the day.',
    sections: [
      ['For tanks, compare the first hour rating', 'The first hour rating tells you how much hot water a fully heated tank can supply in its first hour of use. It accounts for stored hot water and how quickly the unit heats more. Two tanks with the same capacity can have different ratings. If your busiest hour uses an estimated 55 gallons of hot water, look for a first hour rating that meets that demand, not necessarily a 55 gallon tank.'],
      ['For tankless, size for two numbers', 'Add the hot water flow of fixtures you expect to use at the same time. If two showers each need 1.5 gallons of hot water per minute and a sink needs another 0.5, the target is 3.5 GPM. Then subtract the incoming water temperature from the heater’s outlet target. With 45°F incoming water and a 120°F target, that’s a 75°F rise. Look for a model that delivers 3.5 GPM at that rise, not one that lists 3.5 GPM under warmer test conditions.'],
      ['Tell your installer what your current heater can’t do', 'Write down when you run short, which fixtures were in use and whether it happens only in winter. Share the existing model number if you can read it safely. That gives the installer a starting point for deciding whether the issue is capacity, recovery or a fault in the equipment.'],
    ], related: ['best-type-of-water-heater', 'is-a-tankless-water-heater-worth-it', 'why-is-there-no-hot-water'],
  },
  {
    slug: 'is-a-tankless-water-heater-worth-it', title: 'Is a Tankless Water Heater Worth It?',
    description: 'Find out when switching to tankless makes sense, from winter flow and continuous hot water to venting, electrical upgrades and maintenance.',
    intro: 'Tankless can solve a problem a bigger tank can’t: a long stretch of back to back showers with no time for a tank to recover. It’s a less obvious upgrade if your current tank keeps up and the switch calls for expensive changes to the house.',
    sections: [
      ['Check the cost of the conversion', 'A gas model may need a larger gas line, different venting or a condensate drain. A whole house electric model can require substantial electrical capacity. Ask for a quote that separates the equipment, labor and any upgrades. Compare that total with a similar tank replacement rather than comparing appliance prices alone.'],
      ['Check what happens when two fixtures run', 'Continuous hot water means the unit doesn’t run out of stored water. It does not mean every fixture can run at once. A properly sized unit should cover your busiest combination of fixtures even when Kansas City’s incoming water is cold. Tankless also won’t shorten the trip through a long pipe to a distant shower.'],
      ['Budget for maintenance, not just fuel', 'Ask how often the manufacturer calls for descaling under your water conditions and whether the quote includes service valves that make that work easier. If the value for you is more space or longer showers, say so up front. Those benefits may justify the cost, even when energy savings alone wouldn’t.'],
    ], related: ['what-size-water-heater-do-i-need', 'water-heater-replacement-cost-and-time', 'energy-efficient-water-heater-savings'],
  },
];