/**
 * Everything the OTV concept page says about OTV | Open Television.
 *
 * OTV is a real Chicago nonprofit. Every fact below was read on its own
 * properties on 2026-11-06 (weareo.tv home, /vision, /otvstudio, /fellows,
 * /donate, /submit, /pitchplease, /activations/tablereadclub, otvatlas.com,
 * beyondthescreen.live and the watch.weareo.tv catalog). Nothing is invented:
 * no figures, partners, quotes or dates beyond what those pages state.
 * Sources per item are in docs/demos/otv.md. Every action links to OTV's real
 * destination; this page sells, collects and submits nothing itself.
 */

export const MEDIA = '/demos/otv'

export const org = {
  name: 'OTV | Open Television',
  short: 'OTV',
  city: 'Chicago',
  founded: 2015,
  tagline: 'the future of storytelling is intersectional.',
  // /donate: "501 (c) 3 non-for-profit organization based in Chicago, Illinois
  // and operating globally through the World Wide Web."
  legal: 'OTV | Open Television is a 501(c)(3) nonprofit based in Chicago, Illinois, and operating globally through the web.',
}

export const links = {
  home: 'https://www.weareo.tv/',
  watch: 'https://watch.weareo.tv/',
  browse: 'https://watch.weareo.tv/browse',
  trial: 'https://watch.weareo.tv/checkout/subscribe/signup',
  submit: 'https://www.weareo.tv/submit',
  studioBooking: 'https://otv.submittable.com/submit/519618e1-ea73-4728-b9cb-709b96039cb7/otv-studio-bookings-reservations-form/eligibility',
  studioEmail: 'mailto:studio@weareo.tv',
  studioPage: 'https://www.weareo.tv/otvstudio',
  donate: 'https://givebutter.com/otv-open-television-inc',
  giftMembership: 'https://www.weareo.tv/support',
  partner: 'https://www.weareo.tv/build',
  vision: 'https://www.weareo.tv/vision',
  research: 'https://www.weareo.tv/research',
  contact: 'https://www.weareo.tv/contact',
  newsletter: 'http://eepurl.com/hdQNh1',
  // Store links exactly as the weareo.tv home page lists them.
  apple: 'https://apps.apple.com/us/app/otv-open-television/id1526181279',
  android: 'https://play.google.com/store/apps/details?id=com.weareotv',
  roku: 'https://channelstore.roku.com/details/db3ea74c5872083f6d02f5ba2bb0b93f/otv-open-television',
  fireTv: 'https://www.amazon.com/gp/product/B08F72SFBY',
}

export const stores = [
  { label: 'iPhone', href: links.apple },
  { label: 'Android', href: links.android },
  { label: 'Roku', href: links.roku },
  { label: 'Fire TV', href: links.fireTv },
]

export const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com/weareotv' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@weareotv' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/weareotv' },
  { label: 'Linktree', href: 'https://linktr.ee/weareotv' },
]

export type Channel = {
  slug: string
  title: string
  collection: string
  image: string
  /** `object-position` for the phone crop, centred on the subject. */
  focus: string
  /** `object-position` for wide screens, where the picture sits right of the copy. */
  focusWide: string
}

/** Real catalog titles from watch.weareo.tv. Stills are the catalog's own key art. */
export const channels: Channel[] = [
  { slug: 'quare-life', title: 'Quare Life', collection: 'Queer Love', image: 'quarelife', focus: '50% 40%', focusWide: '38% 40%' },
  { slug: 'nupita-obama-creates-vogua', title: 'Nupita Obama Creates Vogua', collection: 'Queer Love', image: 'nupita', focus: '56% 45%', focusWide: '45% 45%' },
  { slug: 'youresotalented', title: "You're So Talented", collection: 'Queer Love', image: 'youresotalented', focus: '42% 35%', focusWide: '22% 35%' },
  { slug: 'seeds', title: 'SEEDS', collection: 'Queer Love', image: 'seeds', focus: '62% 50%', focusWide: '55% 50%' },
  { slug: 'the-t-series', title: 'The T', collection: 'Queer Love', image: 'thet', focus: '50% 45%', focusWide: '40% 45%' },
  { slug: 'eat', title: 'Eat', collection: 'Created by #OTVAtlas Ambassadors', image: 'eat', focus: '50% 45%', focusWide: '35% 45%' },
  { slug: 'afternoonsnatch', title: 'Afternoon Snatch', collection: 'Queer Love', image: 'afternoonsnatch', focus: '50% 45%', focusWide: '40% 45%' },
]

export const channelSrc = (image: string, width: 1280 | 1920) => `${MEDIA}/channels/${image}-${width}.webp`

export type Title = { slug: string; title: string; image: string; poster?: boolean }

/** The three collections shown on the catalog's browse page, in its order. */
export const collections: { id: string; label: string; note: string; titles: Title[] }[] = [
  {
    id: 'new',
    label: 'New & upcoming',
    note: 'Fresh releases and premieres on the OTV app.',
    titles: [
      { slug: 'rapbrarian', title: 'Rapbrarian: Reading Came First', image: 'rapbrarian', poster: true },
      { slug: 'brewer', title: 'Brewer', image: 'brewer', poster: true },
      { slug: 'noir', title: 'NOIR', image: 'noir', poster: true },
      { slug: 'la-yeni', title: 'LA´ YÉNI', image: 'layeni', poster: true },
    ],
  },
  {
    id: 'queer-love',
    label: 'Queer love',
    note: 'Series and shorts from the Queer Love collection.',
    titles: [
      { slug: 'f-ck-yes', title: 'F*ck Yes', image: 'fckyes' },
      { slug: 'country-love', title: 'Country Love', image: 'countrylove' },
      { slug: 'night-night', title: 'Night Night', image: 'nightnight' },
      { slug: 'kissing-walls', title: 'Kissing Walls', image: 'kissingwalls' },
      { slug: 'nupita-obama-creates-vogua', title: 'Nupita Obama Creates Vogua', image: 'nupita' },
      { slug: 'the-t-series', title: 'The T', image: 'thet' },
      { slug: 'afternoonsnatch', title: 'Afternoon Snatch', image: 'afternoonsnatch' },
      { slug: 'youresotalented', title: "You're So Talented", image: 'youresotalented' },
      { slug: 'quare-life', title: 'Quare Life', image: 'quarelife' },
      { slug: 'seeds', title: 'SEEDS', image: 'seeds' },
      { slug: 'ldr', title: 'LDR', image: 'ldr' },
      { slug: 'been-t-here', title: 'Been T/Here', image: 'beenthere' },
    ],
  },
  {
    id: 'atlas',
    label: '#OTVAtlas ambassadors',
    note: 'Made by #OTVAtlas ambassadors.',
    titles: [
      { slug: 'hunts-trading-post', title: "Hunt's Trading Post", image: 'hunts' },
      { slug: 'oriki-oshun', title: 'Oríkì Oshun', image: 'oriki' },
      { slug: 'eat', title: 'Eat', image: 'eat' },
      { slug: 'her-fight-his-name', title: 'Her Fight, His Name', image: 'herfight' },
      { slug: 'noir', title: 'NOIR', image: 'noir' },
      { slug: 'plenum', title: 'PLENUM', image: 'plenum' },
      { slug: 'brewer', title: 'Brewer', image: 'brewer' },
      { slug: 'sleepher', title: "Sleep'her", image: 'sleepher' },
      { slug: 'noor', title: 'Noor', image: 'noor' },
    ],
  },
]

export const titleHref = (slug: string) => `https://watch.weareo.tv/${slug}`
export const titleSrc = (t: Title) => `${MEDIA}/${t.poster ? 'posters' : 'catalog'}/${t.image}.webp`

export type Door = { id: string; index: string; label: string; title: string; body: string; actions: { label: string; href: string }[] }

export const doors: Door[] = [
  {
    id: 'watch',
    index: '01',
    label: 'For viewers',
    title: 'watch it.',
    body: 'Hundreds of intersectional pilots, series, short films and video art, on the web, iPhone, Android, Roku and Fire TV.',
    actions: [
      { label: 'Start a free trial', href: links.trial },
      { label: 'Browse the catalog', href: links.browse },
    ],
  },
  {
    id: 'make',
    index: '02',
    label: 'For artists',
    title: 'make it.',
    body: 'Submit finished pilots, shorts, series or video art for non-exclusive distribution, book the studio, or find the program that fits your next step.',
    actions: [
      { label: 'Submit your work', href: links.submit },
      { label: 'Book the studio', href: '#studio' },
    ],
  },
  {
    id: 'support',
    index: '03',
    label: 'For supporters',
    title: 'keep it on air.',
    body: 'OTV is a 501(c)(3) nonprofit. Donations and gift memberships back the artists, programs and studio behind every story.',
    actions: [
      { label: 'Donate', href: links.donate },
      { label: 'Gift a membership', href: links.giftMembership },
    ],
  },
]

export type Milestone = {
  year: string
  /** Position on the 2015–2026 ruler, in years from 2015. */
  at: number
  title: string
  body: string
  visual: { kind: 'photo'; src: string; alt: string; credit?: string } | { kind: 'card'; big: string; small: string }
}

export const milestones: Milestone[] = [
  {
    year: '2015',
    at: 0,
    title: 'OTV goes on air.',
    body: 'OTV begins as part of a research project at Northwestern University: a nonprofit distribution platform for artists and communities marginalized by race, gender, sexuality, class, religion, disability or nationality.',
    visual: { kind: 'card', big: 'on air', small: 'Chicago · 2015' },
  },
  {
    year: '2019',
    at: 4,
    title: 'Fellows and Brave Futures.',
    body: 'The OTV Fellowship starts backing emerging storytellers with stipends, mentorship and consultation, and Brave Futures launches as a 48-hour intersectional film competition.',
    visual: { kind: 'photo', src: `${MEDIA}/photos/fellows-sundance.webp`, alt: 'OTV Fellows in a mentorship session around a conference table' },
  },
  {
    year: '2020',
    at: 5,
    title: 'Study Hall and the OTV app.',
    body: 'Study Hall opens masterclass-style film and TV courses for intersectional writers, directors and producers. At the end of the year, the OTV app arrives on Apple, Android, Roku and Amazon Fire.',
    visual: { kind: 'photo', src: `${MEDIA}/photos/study-hall.webp`, alt: 'A grid of video-call participants in an OTV Study Hall session' },
  },
  {
    year: '2022',
    at: 7,
    title: 'The studio opens.',
    body: 'A 3,000 sq ft storefront in Humboldt Park, formerly Reunion Chicago, opens as a one-stop home base for intersectional artists.',
    visual: { kind: 'photo', src: `${MEDIA}/photos/studio-neon.webp`, alt: 'The OTV neon sign glowing inside the studio', credit: 'OTV Studio' },
  },
  {
    year: '2024',
    at: 9,
    title: 'Pitch, Please!',
    body: 'With SeriesFest, OTV Fellows pitch for up to $30,000 in resources and prizes. Six fellowship cohorts and more than two dozen storytellers have come through since 2019.',
    visual: { kind: 'card', big: '$30,000', small: 'Pitch, Please! · with SeriesFest' },
  },
  {
    year: '2025',
    at: 10,
    title: 'Ten years on air.',
    body: 'OTV marks its tenth anniversary and pauses its marquee development programs while it pilots an experimental initiative for what comes next.',
    visual: { kind: 'card', big: '10', small: 'years of open television' },
  },
  {
    year: 'Now',
    at: 11,
    title: 'Table Read Club is live.',
    body: 'A traveling, one-night-only series of live table reads for bold original scripts, with stops in London, Johannesburg, Chicago, Guadalajara and Mexico City. Beyond the Screen, an audio series and book, looks back on a decade of unfiltered television.',
    visual: { kind: 'card', big: 'live', small: 'London · Johannesburg · Chicago · Guadalajara · Mexico City' },
  },
]

/** Program tracks for the editing-timeline ruler: start and end in years from 2015. */
export const tracks: { label: string; from: number; to: number; tone: 'red' | 'blue' | 'mint' | 'yellow' | 'magenta' | 'cyan' }[] = [
  { label: 'OTV', from: 0, to: 11.6, tone: 'red' },
  { label: 'Fellows', from: 4, to: 9.9, tone: 'mint' },
  { label: 'Brave Futures', from: 4, to: 11.6, tone: 'yellow' },
  { label: 'Study Hall', from: 5, to: 11.6, tone: 'cyan' },
  { label: 'OTV app', from: 5.9, to: 11.6, tone: 'blue' },
  { label: 'Studio', from: 7.7, to: 11.6, tone: 'magenta' },
]

export type Program = {
  ch: string
  name: string
  tag: string
  body: string
  audience: string
  status: string
  live: boolean
  href: string
  cta: string
  preview: { kind: 'photo'; src: string; alt: string } | { kind: 'card'; big: string }
}

export const programs: Program[] = [
  {
    ch: '01', name: 'OTV app', tag: '#otvapp', live: true, status: 'Streaming',
    body: 'Hundreds of intersectional pilots, series, short films and video art.',
    audience: 'Viewers', href: links.watch, cta: 'Start watching',
    preview: { kind: 'photo', src: `${MEDIA}/photos/otv-app.webp`, alt: 'A host in a red suit beside a television showing the OTV app' },
  },
  {
    ch: '02', name: 'Table Read Club', tag: '#tablereadclub', live: true, status: 'Live',
    body: 'One-night-only live reads of bold original scripts, with anonymous audience polls in real time.',
    audience: 'Writers, directors, actors', href: 'https://www.weareo.tv/activations/tablereadclub', cta: 'See the tour',
    preview: { kind: 'card', big: 'live reads' },
  },
  {
    ch: '03', name: 'OTV Studio', tag: '#otvstudio', live: true, status: 'Bookings by lottery',
    body: 'A Humboldt Park storefront for table reads, rehearsals, casting, screenings and micro-productions.',
    audience: 'Artists, partners, community', href: '#studio', cta: 'Plan a booking',
    preview: { kind: 'photo', src: `${MEDIA}/photos/studio-camera.webp`, alt: 'A camera operator framing a shot inside the OTV Studio' },
  },
  {
    ch: '04', name: 'Study Hall', tag: '#otvstudyhall', live: true, status: 'On demand',
    body: 'Masterclass-style film and TV courses for intersectional writers, directors and producers.',
    audience: 'Writers, directors, producers', href: 'https://watch.weareo.tv/otvstudyhall', cta: 'Watch the courses',
    preview: { kind: 'photo', src: `${MEDIA}/photos/study-hall.webp`, alt: 'A grid of video-call participants in an OTV Study Hall session' },
  },
  {
    ch: '05', name: 'Brave Futures', tag: '#bravefutures', live: true, status: 'Films streaming',
    body: 'A 48-hour intersectional film competition: make a film that makes your world more brave.',
    audience: 'Filmmakers', href: 'https://watch.weareo.tv/bravefutures-film-race', cta: 'Stream the films',
    preview: { kind: 'photo', src: `${MEDIA}/photos/brave-futures.webp`, alt: 'Filmmakers shooting on a phone beside a lake for Brave Futures' },
  },
  {
    ch: '06', name: 'Beyond the Screen', tag: '#beyondthescreen', live: true, status: 'Listen + read',
    body: 'An audio series and book celebrating a decade of unfiltered television.',
    audience: 'Everyone', href: 'https://www.beyondthescreen.live/', cta: 'Listen now',
    preview: { kind: 'card', big: 'a decade, unfiltered' },
  },
  {
    ch: '07', name: 'OTV Atlas', tag: '#otvatlas', live: true, status: 'Resource hub',
    body: 'A curated hub of resources and guidance for intersectional storytellers, new to filmmaking or not.',
    audience: 'New and working filmmakers', href: 'https://www.otvatlas.info/', cta: 'Explore Atlas',
    preview: { kind: 'photo', src: `${MEDIA}/posters/rapbrarian.webp`, alt: 'Poster for Rapbrarian: Reading Came First, an #OTVAtlas premiere' },
  },
  {
    ch: '08', name: 'Pitch, Please!', tag: '#pitchplease', live: false, status: '2024 edition streaming',
    body: 'An artist-driven launch pad where OTV Fellows pitch for funding, held with SeriesFest in 2024.',
    audience: 'OTV Fellows', href: 'https://watch.weareo.tv/pitch-please', cta: 'Stream the pitches',
    preview: { kind: 'card', big: 'up to $30k' },
  },
  {
    ch: '09', name: 'OTV Fellows', tag: '#otvfellows', live: false, status: 'On hiatus',
    body: 'Stipends, mentorship and consultation for emerging storytellers. Six cohorts since 2019, with alumni opportunities at Netflix, Showtime, CBS, Hulu and Sundance.',
    audience: 'Emerging storytellers', href: 'https://www.weareo.tv/fellows', cta: 'Meet the cohorts',
    preview: { kind: 'photo', src: `${MEDIA}/photos/fellows-sundance.webp`, alt: 'OTV Fellows in a mentorship session around a conference table' },
  },
]

export const studio = {
  where: 'Humboldt Park, Chicago',
  corner: 'W. North Ave & Rockwell',
  size: '3,000 sq ft storefront',
  inside: ['Editing bay', '15-seat cinema room', 'Gear room', 'Kitchenette', 'Two accessible restrooms', 'Two entrances'],
  goodFor: ['Table reads', 'Rehearsals', 'Casting calls', 'Team meetings', 'Retreats', 'Co-working', 'Private screenings', 'Micro-productions'],
  booking: 'About 12 bookings a quarter, chosen by lottery. Fellows, artists, partners and community members come first, and replies take up to two weeks.',
  chairs: [1, 2, 3, 4, 5].map((n) => `${MEDIA}/photos/studio-chair-${n}.webp`),
  // Filenames of OTV's soft-launch set name the photographer.
  photoCredit: 'Soft-launch portraits by Felton Edward Kizer',
}

/** End-credits proof. Each line is OTV's own claim, worded as OTV words it. */
export const credits: { role: string; names: string[]; note?: string }[] = [
  { role: 'Recognition', names: ['Emmy', 'Webby', 'Gotham', 'Streamy'], note: 'Wins and nominations' },
  { role: 'Development deals', names: ['HBO', 'Lionsgate', 'Hulu', 'Red Arrow Entertainment'] },
  { role: 'Fellows alumni opportunities', names: ['Netflix', 'Showtime', 'CBS', 'Hulu', 'Sundance Institute', 'Toronto International Film Festival', 'SeriesFest'] },
  { role: 'In the press', names: ['The New York Times', 'Chicago Tribune', 'Chicago Reader', 'The A.V. Club', 'Elle'] },
  { role: 'Partners in programs', names: ['Sundance Institute', 'SeriesFest'] },
  { role: 'Roots', names: ['A research project at Northwestern University'] },
]

export const nav = [
  { href: '#watch', label: 'Watch' },
  { href: '#programs', label: 'Programs' },
  { href: '#studio', label: 'Studio' },
  { href: '#story', label: 'About' },
]
