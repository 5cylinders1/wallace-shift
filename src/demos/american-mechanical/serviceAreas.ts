// City reference points are from the U.S. Census Bureau, except Stilwell (unincorporated).
export interface ServiceAreaState { state: string; abbreviation: 'MO' | 'KS'; cities: [string, number, number][] }

export const serviceAreas: ServiceAreaState[] = [
  { state: 'Missouri', abbreviation: 'MO', cities: [
    ['Kansas City', 39.1252, -94.5503], ['North Kansas City', 39.1396, -94.5652],
    ['Independence', 39.0855, -94.3521], ['Raytown', 38.9943, -94.4615],
    ["Lee's Summit", 38.9216, -94.3848], ['Blue Springs', 39.012, -94.2676],
    ['Liberty', 39.2413, -94.4194], ['Gladstone', 39.213, -94.559],
    ['Grandview', 38.8814, -94.5227], ['Belton', 38.8187, -94.5296],
    ['Raymore', 38.8033, -94.4583], ['Parkville', 39.2146, -94.7044],
    ['Riverside', 39.1722, -94.6325], ['Platte City', 39.3597, -94.7563],
    ['Kearney', 39.3551, -94.3586], ['Smithville', 39.3969, -94.571],
    ['Greenwood', 38.8424, -94.3337], ['Grain Valley', 39.0152, -94.2138],
    ['Buckner', 39.1325, -94.1968], ['Sugar Creek', 39.1428, -94.4058],
    ['Pleasant Valley', 39.2172, -94.4809], ['Claycomo', 39.1986, -94.4788],
    ['Avondale', 39.1545, -94.5452], ['Randolph', 39.1561, -94.4931],
    ['Birmingham', 39.1676, -94.4501], ['Glenaire', 39.2197, -94.4515],
    ['Oakview', 39.2085, -94.5704], ['Oakwood Park', 39.2047, -94.5738],
    ['Northmoor', 39.1845, -94.6055], ['Houston Lake', 39.1901, -94.6202],
    ['Lake Waukomis', 39.2327, -94.6378], ['Weatherby Lake', 39.2344, -94.6961],
    ['Platte Woods', 39.2289, -94.6521], ['Lake Tapawingo', 39.0224, -94.3139],
    ['Lake Lotawana', 38.9038, -94.2584], ['Lake Winnebago', 38.8211, -94.3623],
    ['Unity Village', 38.959, -94.4009],
  ] },
  { state: 'Kansas', abbreviation: 'KS', cities: [
    ['Kansas City', 39.1225, -94.7418], ['Overland Park', 38.889, -94.6906],
    ['Olathe', 38.8798, -94.82], ['Lenexa', 38.9653, -94.8039],
    ['Shawnee', 39.0175, -94.8058], ['Leawood', 38.9073, -94.6252],
    ['Prairie Village', 38.9868, -94.6362], ['Merriam', 39.0176, -94.694],
    ['Mission', 39.0268, -94.657], ['Mission Hills', 39.014, -94.6174],
    ['Mission Woods', 39.0342, -94.6106], ['Roeland Park', 39.0359, -94.6374],
    ['Fairway', 39.0245, -94.6287], ['Westwood', 39.0394, -94.6156],
    ['Westwood Hills', 39.0389, -94.6097], ['Lake Quivira', 39.0402, -94.7685],
    ['Bonner Springs', 39.0754, -94.8717], ['Edwardsville', 39.0782, -94.8188],
    ['Leavenworth', 39.3227, -94.925], ['Lansing', 39.2429, -94.8979],
    ['Stilwell', 38.7673, -94.6592], ['De Soto', 38.9448, -94.987],
  ] },
];