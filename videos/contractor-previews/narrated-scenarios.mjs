import {narratedRoofing} from './narrated-roofing.mjs'
import {narratedOther} from './narrated-other.mjs'

// Velar remains the separately validated pilot in narrated-pilot.mjs.
export const narratedScenarios = [...narratedRoofing, ...narratedOther]
