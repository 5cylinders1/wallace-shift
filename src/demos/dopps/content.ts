/**
 * Everything the Dopps Chiropractic concept says about the practice. Read
 * 2026-11-11 from the Google Business Profile (59 reviews) and the practice's own
 * site (doppskc.com, which redirects to doppschiropracticop.com). Sources are in
 * docs/demos/dopps.md. The symptom guide is general education written for the
 * concept and flagged there for Dr. Dopps to review.
 */

export const MEDIA = '/demos/dopps'

export const practice = {
  name: 'Dopps Chiropractic',
  doctor: 'Dr. Rory Dopps, D.C.',
  doctorShort: 'Dr. Rory',
  street: '7811 W 151st St',
  center: 'Stanley Square Shopping Center',
  city: 'Overland Park',
  region: 'KS',
  postal: '66223',
  phone: '(913) 608-5441',
  phoneHref: 'tel:+19136085441',
  email: 'dopps@doppskc.com',
  rating: '5.0',
  reviewCount: 59,
} as const

export const links = {
  square: 'https://app.squareup.com/appointments/book/21cg835i8s90c6/BA23V4FWFPBJ6/start',
  forms: 'https://www.doppschiropracticop.com/new-patient-forms',
  site: 'https://www.doppschiropracticop.com/',
  googleReviews: 'https://www.google.com/maps/search/?api=1&query=Dopps+Chiropractic+7811+W+151st+St+Overland+Park+KS',
  directions: 'https://www.google.com/maps/dir/?api=1&destination=Dopps+Chiropractic%2C+7811+W+151st+St%2C+Overland+Park%2C+KS+66223',
  facebook: 'https://www.facebook.com/doppskc',
  instagram: 'https://instagram.com/doppschiropracticop',
  youtube: 'https://youtube.com/@doppskc',
  tiktok: 'https://www.tiktok.com/@doppskc',
} as const

/** 0 = Sunday. Open Monday, Wednesday and Friday, 9 to 7 (Google and the site agree). */
export const HOURS: Record<number, { open: number; close: number } | null> = {
  0: null,
  1: { open: 9 * 60, close: 19 * 60 },
  2: null,
  3: { open: 9 * 60, close: 19 * 60 },
  4: null,
  5: { open: 9 * 60, close: 19 * 60 },
  6: null,
}

export const nav = [
  { href: '#spine', label: 'Your spine' },
  { href: '#symptoms', label: 'Symptoms' },
  { href: '#care', label: 'Care' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#visit', label: 'Visit' },
] as const

// ------------------------------------------------------------------ the journey

export type Region = 'cervical' | 'thoracic' | 'lumbar' | 'sacral'

export const CERVICAL = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']
export const THORACIC = Array.from({ length: 12 }, (_, i) => `T${i + 1}`)
export const LUMBAR = ['L1', 'L2', 'L3', 'L4', 'L5']
export const SACRAL = ['Sacrum', 'Coccyx']

export interface Chapter {
  id: string
  eyebrow: string
  title: string
  body: string
  facts: string[]
}

export const chapters: Chapter[] = [
  {
    id: 'overview',
    eyebrow: 'Your spine',
    title: 'Thirty-three vertebrae, one system.',
    body: 'Twenty-four moving vertebrae stack on the sacrum and coccyx, with a cushioning disc between each pair from C2 down. Three gentle curves let it carry your weight like a spring. When one part stops moving well, the rest picks up the slack, and that is often where pain shows up.',
    facts: ['7 cervical', '12 thoracic', '5 lumbar', 'sacrum + coccyx'],
  },
  {
    id: 'cervical',
    eyebrow: 'C1–C7 · Cervical',
    title: 'The neck holds up your head all day.',
    body: 'Seven small vertebrae let you nod, turn and tilt. Hours looking down at a phone or forward at a screen keep the muscles at the base of the skull working overtime, which is behind a lot of neck stiffness and tension headaches.',
    facts: ['Neck pain', 'Tension headaches', 'Arm tingling'],
  },
  {
    id: 'thoracic',
    eyebrow: 'T1–T12 · Thoracic',
    title: 'The mid-back is built to rotate.',
    body: 'Each thoracic vertebra anchors a pair of ribs around your heart and lungs. Sitting rounded for long stretches stiffens it, and the neck and low back end up doing the twisting it should be doing.',
    facts: ['Shoulder-blade tightness', 'Rounded shoulders', 'Mid-back pain'],
  },
  {
    id: 'lumbar',
    eyebrow: 'L1–L5 · Lumbar',
    title: 'The low back carries the load.',
    body: 'The five largest vertebrae take most of your body weight, and their discs are the thickest. Long days sitting, lifting with the back instead of the hips, and weak glutes all pile stress here.',
    facts: ['Low back pain', 'Disc irritation', 'Sciatica'],
  },
  {
    id: 'sacral',
    eyebrow: 'Sacrum · Pelvis',
    title: 'Where the spine meets the pelvis.',
    body: 'The sacrum is five vertebrae fused into one, wedged between the hip bones at the sacroiliac (SI) joints. Uneven hips, pregnancy and running form all show up here first.',
    facts: ['SI joint pain', 'Hip pain', 'Pregnancy back pain'],
  },
  {
    id: 'nerves',
    eyebrow: 'The nerves',
    title: 'Pain can start far from where you feel it.',
    body: 'A pair of nerves leaves the spine at every level. Irritate one near the L5 vertebra and you may feel it in your calf or foot; irritate one at C6 and your thumb may tingle. Finding the level that is actually involved is the point of a proper exam.',
    facts: ['Pinched nerves', 'Numbness', 'Radiating pain'],
  },
]

// ------------------------------------------------------------------ symptom guide

export interface Move {
  name: string
  how: string
  dose: string
  /** Seconds for the hold timer, if the move is a held stretch. */
  hold?: number
}

export interface Symptom {
  id: string
  label: string
  short: string
  region: Region
  bones: string[]
  nerves?: string[]
  summary: string
  causes: string[]
  moves: Move[]
  redFlags: string[]
  help: string[]
  quote: { text: string; name: string }
}

const NECK_FLAGS = 'A stiff neck with fever, or neck pain after a fall or car accident'

export const symptoms: Symptom[] = [
  {
    id: 'neck',
    label: 'Neck pain & stiffness',
    short: 'Neck',
    region: 'cervical',
    bones: ['C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
    summary: 'Usually muscles and small joints that have been held in one position too long, rather than anything broken.',
    causes: [
      'Head forward over a screen or phone for hours at a time',
      'Sleeping with the neck twisted or on a pillow that is too high',
      'A strain from a sudden movement, lifting or a whiplash-type jolt',
      'Stiff joints between the vertebrae, which grow less forgiving with age',
    ],
    moves: [
      { name: 'Chin tucks', how: 'Sit tall. Glide your chin straight back, as if making a double chin, without tipping your head down.', dose: 'Hold 3 seconds · 10 times · a few times a day' },
      { name: 'Upper trap stretch', how: 'Sit on your right hand. Tip your left ear toward your left shoulder until you feel a gentle stretch on the right side.', dose: 'Hold 30 seconds · each side', hold: 30 },
      { name: 'Screen check', how: 'Raise your screen so the top third sits at eye level, and stand up or look away every 30 minutes.', dose: 'Every workday' },
    ],
    redFlags: [NECK_FLAGS, 'Numbness, weakness or clumsiness in the arms or legs', 'Trouble walking or keeping your balance'],
    help: ['A hands-on exam and posture analysis', 'X-rays when they will change the plan', 'Spinal adjustments and soft tissue work', 'Exercises to keep it from coming back'],
    quote: { text: 'The tightness I’ve been dealing with has finally began to subside and I no longer deal with persistent migraines.', name: 'Kent Jones' },
  },
  {
    id: 'headaches',
    label: 'Tension headaches',
    short: 'Headaches',
    region: 'cervical',
    bones: ['C1', 'C2', 'C3'],
    summary: 'A band of pressure around the head or at the base of the skull, often tied to tight neck muscles and the top joints of the neck.',
    causes: [
      'Tight muscles where the skull meets the neck',
      'Forward head posture and long screen sessions',
      'Clenching the jaw, stress and poor sleep',
      'Dehydration, skipped meals and eye strain',
    ],
    moves: [
      { name: 'Chin tucks', how: 'Sit tall and glide your chin straight back. You should feel the back of your neck lengthen.', dose: 'Hold 3 seconds · 10 times' },
      { name: 'Towel release', how: 'Lie on your back with a rolled hand towel under the base of your skull. Let your head rest heavy and nod slightly yes.', dose: '2 minutes', hold: 120 },
      { name: '20-20-20 break', how: 'Every 20 minutes, look at something about 20 feet away for 20 seconds, and drink some water.', dose: 'All day', hold: 20 },
    ],
    redFlags: ['A sudden, severe headache, or the worst headache of your life', 'Headache with confusion, slurred speech, vision loss or weakness', 'Headache after a head injury, or with fever and a stiff neck'],
    help: ['A neck exam to see which levels are stiff or sore', 'Gentle adjustments of the upper neck', 'Soft tissue therapy for the muscles at the skull', 'Posture and desk advice'],
    quote: { text: 'Went to Dr. Dopps with chronic tension headaches and have already experienced substantial relief after 1 week of treatment.', name: 'Jordan Chapman' },
  },
  {
    id: 'arm',
    label: 'Tingling or pain down the arm',
    short: 'Arm tingling',
    region: 'cervical',
    bones: ['C4', 'C5', 'C6', 'C7', 'T1'],
    nerves: ['C5', 'C6', 'C7', 'C8'],
    summary: 'When a nerve root in the lower neck is irritated, you can feel it in the shoulder, arm or fingers. The pattern hints at the level.',
    causes: [
      'A disc or joint narrowing the space where a nerve leaves the neck',
      'Muscle tension around the collarbone and chest',
      'Sleeping on the arm, or long hours with bent elbows and wrists',
      'Wrist problems such as carpal tunnel, which can feel similar',
    ],
    moves: [
      { name: 'Chin tucks', how: 'Glide your chin straight back and hold. Stop if the arm symptoms spread further down.', dose: 'Hold 3 seconds · 10 times' },
      { name: 'Doorway chest stretch', how: 'Forearms on a door frame at shoulder height. Step through until you feel a stretch across the chest.', dose: 'Hold 30 seconds · 2–3 times', hold: 30 },
      { name: 'Position breaks', how: 'Change position before the tingling starts: straighten your elbows, drop your shoulders and take a short walk.', dose: 'Every 30 minutes' },
    ],
    redFlags: ['Weakness that is getting worse, or dropping things', 'Symptoms in both arms, or in your legs as well', 'Trouble with balance or walking'],
    help: ['A neurological exam: reflexes, strength and sensation', 'Finding the level involved', 'Adjustments and therapy aimed at that level', 'Referral when imaging or a specialist is needed'],
    quote: { text: 'From first seeing him when I needed a cane to walk at the age of 31, to now where I am standing up straight naturally and have hardly any pain…', name: 'Todd Moore' },
  },
  {
    id: 'upper-back',
    label: 'Upper back & shoulder-blade tightness',
    short: 'Upper back',
    region: 'thoracic',
    bones: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    summary: 'The knot between the shoulder blades that never quite lets go. Usually a stiff mid-back with overworked muscles on top.',
    causes: [
      'Rounded shoulders at a desk or steering wheel',
      'A thoracic spine that has stopped rotating and extending',
      'Weak muscles between the shoulder blades',
      'Shallow breathing from the upper chest under stress',
    ],
    moves: [
      { name: 'Chair back extension', how: 'Sit in a firm chair with the backrest at shoulder-blade height. Hands behind your head, gently lean back over the top.', dose: '5–8 slow reps' },
      { name: 'Open book', how: 'Lie on your side, knees bent, arms straight in front. Open the top arm across to the other side and follow it with your eyes.', dose: '8 per side' },
      { name: 'Wall angels', how: 'Back against a wall, arms in a goal-post shape. Slide them up and down, keeping as much contact as is comfortable.', dose: '8–10 reps' },
    ],
    redFlags: ['Chest pressure, shortness of breath or sweating with the pain: call 911', 'Pain that spreads into the jaw or left arm', 'Pain after a fall, especially with osteoporosis'],
    help: ['Posture analysis', 'Thoracic adjustments to restore movement', 'Soft tissue therapy', 'Strength work for the shoulder blades'],
    quote: { text: 'He’s been able to ease my headaches and years of tightness and pain are feeling better everyday!', name: 'Lindsay Cunningham' },
  },
  {
    id: 'posture',
    label: 'Rounded shoulders & posture',
    short: 'Posture',
    region: 'thoracic',
    bones: ['C5', 'C6', 'C7', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
    summary: 'Not a character flaw. Posture follows what you do most, and it changes when the joints and muscles involved change.',
    causes: [
      'Long hours sitting, driving or on a phone',
      'A stiff upper back and tight chest muscles',
      'Weak upper-back and neck muscles',
      'Old injuries the body has learned to protect',
    ],
    moves: [
      { name: 'Wall angels', how: 'Head, upper back and hips against the wall. Slide your arms up and down slowly.', dose: '8–10 reps' },
      { name: 'Band pull-aparts', how: 'Hold a light band at shoulder height, arms straight. Pull it apart by squeezing your shoulder blades together.', dose: '12–15 reps · 2 sets' },
      { name: 'Doorway chest stretch', how: 'Forearms on the frame, step through gently.', dose: 'Hold 30 seconds', hold: 30 },
    ],
    redFlags: ['A curve that is changing quickly in a child or teen', 'Back pain that wakes you at night and does not ease with movement'],
    help: ['Posture analysis and correction', 'Adjustments for stiff segments', 'Therapeutic exercise', 'Workstation and lifestyle advice'],
    quote: { text: 'My back and neck feel so much better and I’m standing straighter than I ever have.', name: 'Kevin Keith' },
  },
  {
    id: 'low-back',
    label: 'Low back pain',
    short: 'Low back',
    region: 'lumbar',
    bones: ['L1', 'L2', 'L3', 'L4', 'L5'],
    summary: 'The most common reason people see a chiropractor. Most episodes are mechanical: muscles, joints or discs under more load than they are used to.',
    causes: [
      'Long periods of sitting, then a sudden lift or twist',
      'Lifting by bending the back instead of hinging at the hips',
      'Weak core and glute muscles, tight hip flexors',
      'An irritated disc or joint at one of the lower levels',
    ],
    moves: [
      { name: 'Walk', how: 'Short, easy walks keep the low back moving. Staying active usually beats resting in bed.', dose: '10–20 minutes · 1–3 times a day', hold: 600 },
      { name: 'Cat–cow', how: 'On hands and knees, slowly round your back up, then let it sag gently. Move within comfort.', dose: '10 slow cycles' },
      { name: 'Glute bridge', how: 'Lie on your back, knees bent. Squeeze your glutes and lift your hips until they line up with your knees and shoulders.', dose: 'Hold 2 seconds · 10–12 reps' },
    ],
    redFlags: ['Numbness in the groin or inner thighs', 'New trouble controlling your bladder or bowels', 'Leg weakness that is getting worse', 'Back pain with fever, or after a serious fall'],
    help: ['An exam and X-rays to find the source', 'Lumbar and pelvic adjustments', 'Soft tissue therapy', 'Core and hip exercises to keep it away'],
    quote: { text: 'One of the first things Dr. Dopps did was take X-rays of my back and walk me through what was wrong and how we could fix it.', name: 'Eldon Cunningham' },
  },
  {
    id: 'sciatica',
    label: 'Sciatica: pain down the leg',
    short: 'Sciatica',
    region: 'lumbar',
    bones: ['L4', 'L5', 'Sacrum'],
    nerves: ['L4', 'L5', 'S1', 'S2', 'sciatic'],
    summary: 'Pain, tingling or numbness that travels from the low back or buttock down the leg, following the sciatic nerve.',
    causes: [
      'A lumbar disc irritating the L4, L5 or S1 nerve root',
      'Narrowing where those roots leave the spine',
      'A tight piriformis muscle deep in the buttock',
      'Pregnancy, as the pelvis and posture change',
    ],
    moves: [
      { name: 'Walk', how: 'Gentle walking often calms sciatica. Avoid sitting for long stretches.', dose: '10–20 minutes', hold: 600 },
      { name: 'Figure-4 stretch', how: 'Lie on your back, cross one ankle over the opposite knee, and pull that thigh gently toward your chest.', dose: 'Hold 30 seconds · each side', hold: 30 },
      { name: 'Sciatic nerve glide', how: 'Sit tall. Straighten one knee while looking up, then bend it while looking down. Smooth and easy.', dose: '8–10 reps · stop if symptoms spread' },
    ],
    redFlags: ['Numbness in the groin or inner thighs', 'New bladder or bowel problems', 'Foot drop or leg weakness that is getting worse', 'Sciatica in both legs'],
    help: ['A neurological exam of reflexes and strength', 'Finding which root is involved', 'Adjustments and therapy for the lumbar spine and pelvis', 'Nerve and core exercises'],
    quote: { text: 'Awesome job fixing my back and sciatica issues. I went from good posture being painful to preferring it and the big pain issues were gone', name: 'Shaun Plumb' },
  },
  {
    id: 'hip',
    label: 'Hip or SI joint pain',
    short: 'Hip / SI',
    region: 'sacral',
    bones: ['L5', 'Sacrum', 'Coccyx'],
    summary: 'A one-sided ache near the dimple at the back of the pelvis, or in the hip itself, that often comes with stiffness getting up.',
    causes: [
      'A sacroiliac joint that moves too much or too little',
      'Uneven loading from running, standing on one leg or a limp',
      'Weak glutes and tight hip flexors',
      'Pregnancy hormones loosening the pelvic ligaments',
    ],
    moves: [
      { name: 'Clamshells', how: 'Lie on your side, knees bent, feet together. Open the top knee without rolling your pelvis back.', dose: '12–15 per side' },
      { name: 'Hip flexor stretch', how: 'Half-kneel, tuck your tailbone under, then shift forward until you feel it in the front of the hip.', dose: 'Hold 30 seconds · each side', hold: 30 },
      { name: 'Glute bridge', how: 'Squeeze both glutes evenly as you lift. If one side does all the work, slow down.', dose: '10–12 reps' },
    ],
    redFlags: ['You can’t bear weight after a fall', 'A hot, swollen joint or fever', 'Groin pain with a limp in a child'],
    help: ['Pelvic and SI joint assessment', 'Pelvic and extremity adjustments', 'Gait and running mechanics', 'Hip strength work'],
    quote: { text: 'After dealing with pain in my hip and knee for two years, I decided to give chiropractic care a try. I really wish I made that decision sooner.', name: 'Stacy Wymer' },
  },
  {
    id: 'pregnancy',
    label: 'Back pain in pregnancy',
    short: 'Pregnancy',
    region: 'sacral',
    bones: ['L3', 'L4', 'L5', 'Sacrum'],
    nerves: ['L5', 'S1', 'sciatic'],
    summary: 'As the baby grows, the low back arches more and the pelvic ligaments loosen. Low back, SI and sciatic pain are all common.',
    causes: [
      'A growing curve in the low back',
      'Relaxin softening the pelvic ligaments',
      'Pressure near the sciatic nerve',
      'Less sleep and more time on your feet',
    ],
    moves: [
      { name: 'Cat–cow', how: 'On hands and knees, round and gently arch your back with your breath.', dose: '10 slow cycles' },
      { name: 'Pelvic tilts', how: 'Stand with your back against a wall and gently flatten your low back into it, then release.', dose: '10–15 reps' },
      { name: 'Side-lying with a pillow', how: 'Sleep on your side with a pillow between your knees to keep your pelvis level.', dose: 'Every night' },
    ],
    redFlags: ['Back pain with cramping, bleeding or leaking fluid: call your OB or midwife', 'Fever or painful urination', 'Sudden swelling, severe headache or vision changes'],
    help: ['Prenatal chiropractic care', 'Gentle pelvic adjustments', 'Positions and stretches for each trimester', 'Care for mom and, later, baby'],
    quote: { text: 'Dr. Rory’s expertise in treating pregnancy-related sciatic nerve issues was a game-changer for me.', name: 'Ashlee Campbell' },
  },
]

// ------------------------------------------------------------------ care

export const services = [
  { name: 'Spinal adjustments', line: 'Specific, measured adjustments to restore movement where it is missing.' },
  { name: 'Posture analysis & correction', line: 'See where you are carrying stress, then change it with care and exercise.' },
  { name: 'Sports injury rehab', line: 'For runners, lifters and team athletes, with a plan back to full speed.' },
  { name: 'Chiropractic neurology', line: 'Balance, reflex and sensory testing for nerve-related problems such as neuropathy and vertigo.' },
  { name: 'Prenatal chiropractic', line: 'Gentle care for the changes pregnancy brings to the back and pelvis.' },
  { name: 'Pediatric chiropractic', line: 'From newborns up, with an approach kids are comfortable with.' },
  { name: 'Soft tissue therapy', line: 'Hands-on work for the muscles that tighten around a sore joint.' },
  { name: 'Therapeutic exercise', line: 'Stretches and strength work you can do at home between visits.' },
  { name: 'Extremity adjustments', line: 'Shoulders, wrists, hips, knees and ankles, not only the spine.' },
  { name: 'Nutrition & wellness counseling', line: 'Food, supplements and habits that support recovery.' },
] as const

export const firstVisit = [
  { title: 'Paper-lite check-in', body: 'Fill in your forms on your phone or computer before you arrive.' },
  { title: 'Discovery exam', body: 'History, posture, movement and, when needed, neurological tests.' },
  { title: 'X-rays & posture analysis', body: 'A picture of what is going on inside, walked through with you.' },
  { title: 'Your plan', body: 'Dr. Rory explains what he found and recommends a plan.' },
  { title: 'First adjustment & therapy', body: 'Treatment starts the same day.' },
] as const

export const doctor = {
  name: 'Dr. Rory Dopps',
  facts: [
    { k: 'Education', v: 'Doctor of Chiropractic, Parker University, Dallas (2004). Biology and anatomy at the University of Kansas.' },
    { k: 'Experience', v: 'Started practice in his hometown of Wichita before opening in Overland Park.' },
    { k: 'Sports', v: 'Official chiropractor for the Wichita Thunder (hockey), Wichita Wingnuts (baseball) and Wichita Junior Thunder.' },
    { k: 'Family', v: 'Sixteen members of his family practice chiropractic.' },
  ],
  body: 'Dr. Rory treats everyone from newborns to the elderly, expecting mothers and athletes, including professional golfers, powerlifters, college volleyball players, Special Olympic athletes and Bellator MMA fighters. His focus is corrective care: finding why something hurts and changing it, not only easing it for a day.',
}

// ------------------------------------------------------------------ reviews

export type ReviewTag = 'back' | 'neck' | 'nerves' | 'family' | 'sports' | 'experience'

export const reviewFilters: { id: 'all' | ReviewTag; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'back', label: 'Back pain' },
  { id: 'neck', label: 'Neck & headaches' },
  { id: 'nerves', label: 'Nerves & sciatica' },
  { id: 'family', label: 'Kids & family' },
  { id: 'sports', label: 'Athletes' },
  { id: 'experience', label: 'The experience' },
]

export interface Review {
  name: string
  when: string
  text: string
  tags: ReviewTag[]
  /** True when the text is an excerpt of a longer review. */
  excerpt?: boolean
}

/** Verbatim from Google (all 59 are 5 stars). Long reviews are excerpted and marked. */
export const reviews: Review[] = [
  { name: 'Kevin Keith', when: '2 years ago', tags: ['back', 'experience', 'family'], text: 'Rory does an amazing job! I have seen several chiropractors and he is the only one that has set me up for recovery and not just temporary relief. He took x-rays and explained everything to me. He is detailed in his adjustments and uses many techniques to get the best results. My back and neck feel so much better and I’m standing straighter than I ever have.', excerpt: true },
  { name: 'Pierce and Shaylee Larson', when: '3 months ago', tags: ['family', 'sports', 'experience'], text: 'I’ve been seeing Dr. Rory for over 10 years, and I truly can’t recommend him highly enough. … Over the years, he’s cared for me through adolescence, young adulthood, pregnancy, postpartum, and now even my son during his first year of life. … From newborns to professional hockey players, Dr. Rory has an incredible depth of knowledge and experience.', excerpt: true },
  { name: 'Jennifer Lewis', when: 'a month ago', tags: ['experience', 'family', 'back'], text: 'The staff here is great!!! Delta is worth of employee of the month! Always greets me with a smile. Dr. Rory Dopps is great too! I always feel great when I leave and he has recommended alot of stretches and what i should i do based off my lifestyle. I have brought my mother here as well after she hurt her back, she has noticed a big difference.', excerpt: true },
  { name: 'Eldon Cunningham', when: 'a year ago', tags: ['back', 'family', 'experience'], text: 'I had been dealing with chronic back and hip pain from my time in the military. One of the first things Dr. Dopps did was take X-rays of my back and walk me through what was wrong and how we could fix it. … My son has also been seeing Dr. Dopps during this time. He usually gets nervous around doctors, but Dr. Dobbs was fantastic with him.', excerpt: true },
  { name: 'Kent Jones', when: 'a year ago', tags: ['neck', 'experience'], text: 'I had been dealing with tightness in my upper trap/scapula/neck for close to two years before coming to see Dr. Rory at Dopps Chiropractic. … He did an X-Ray of my spine to give me a true picture of what was really going on inside. … He’s upfront and honest with you; doesn’t sugar coat anything when it comes to your healing.', excerpt: true },
  { name: 'Luke Lauber', when: 'a year ago', tags: ['experience'], text: 'I am very grateful for Dr. Dopps. When I first went in I didn’t know what to expect, but he was so informative and helpful. He was honest about what needed to happen and the results have been life changing. It took time and it wasn’t overnight but things that I had dealt with for a long time began to change and get better. I appreciate that he focuses on whole body health and the body functioning the way it was made to.' },
  { name: 'Jonathan Jost', when: '3 years ago', tags: ['sports', 'experience'], text: 'Dr. Rory was extremely thorough in finding the source of my pain and developed a plan to help me feel better and stay pain free. He worked hard to understand my active lifestyle and helped ensure I can pursue all of my passions. He is friendly and welcoming. Overall a great experience. Would recommend him to everyone!' },
  { name: 'Ashlee Campbell', when: '3 years ago', tags: ['nerves', 'family'], text: 'Dr. Rory’s expertise in treating pregnancy-related sciatic nerve issues was a game-changer for me. His skilled and gentle approach helped alleviate my discomfort and allowed me to enjoy my pregnancy more fully. I’m grateful for his attentive care and would highly recommend him to any expectant mothers dealing with similar challenges.' },
  { name: 'Todd Moore', when: '3 years ago', tags: ['nerves', 'neck', 'back'], text: 'I’ve seen Dopps multiple times over the last year and a half when I first started experiencing very little to no mobility in my back, neck and shoulders due to pinched nerves. From first seeing him when I needed a cane to walk at the age of 31, to now where I am standing up straight naturally and have hardly any pain, I can attest that he is one of the best around!', excerpt: true },
  { name: 'Jordan Chapman', when: '2 years ago', tags: ['neck', 'experience'], text: 'Went to Dr. Dopps with chronic tension headaches and have already experienced substantial relief after 1 week of treatment. Dr Dopps leads with education and a genuine care and understanding for the problems that his clients are facing. Very impressed with his approach and very pleased with my experience.' },
  { name: 'Stacy Wymer', when: '2 years ago', tags: ['back', 'sports'], text: 'After dealing with pain in my hip and knee for two years, I decided to give chiropractic care a try. I really wish I made that decision sooner. Dr. Dopps was very thorough in his diagnosis of my issues and explained in detail how he could help me. Within a couple of visits my pain decreased significantly and I am able to be more active again.', excerpt: true },
  { name: 'holli schletzbaum', when: '9 years ago', tags: ['sports'], text: 'Dr. Rory helped me love running again! As a former college athlete, I am used to having an active lifestyle. The aches and pains got to be too much for me to continue running until I started getting treatment from Dr. Rory! I appreciate everything Dr. Rory has done for me. I highly recommend him to current and former athletes!' },
  { name: 'Stephan Thomas', when: '2 years ago', tags: ['sports', 'experience'], text: 'I have seen several chiropractors over the years in California for many football related injuries Head to feet. Since moving to KC I had tried several Chiropractors and none were remotely in the class of Rory. I live up North and drive 45 minutes to get my adjustments and its worth every mile.', excerpt: true },
  { name: 'Shaun Plumb', when: '6 months ago', tags: ['nerves', 'back'], text: 'Awesome job fixing my back and sciatica issues. I went from good posture being painful to preferring it and the big pain issues were gone' },
  { name: 'christian jenkins', when: '3 months ago', tags: ['experience'], text: 'I was a patient of Rory back in Wichita 10 + years ago. When I moved up here I had to look him up because he was hands down the best chiropractor I’ve had. he even remembered me and he takes his time and sets up a plan to try to help .' },
  { name: 'Lindsay Cunningham', when: 'a year ago', tags: ['neck', 'experience'], text: 'After years of being apprehensive towards chiropractic care, I cannot thank Dr. Dopps enough! His knowledge and demeanor helps create a comfortable environment and put his patients at ease during treatment. He’s been able to ease my headaches and years of tightness and pain are feeling better everyday!' },
  { name: 'Abdalla Osman', when: 'a year ago', tags: ['back'], text: 'I highly recommend Dr. Rory Dopps! After struggling with lower back pain, I was amazed at the relief I felt after just two visits. He’s knowledgeable, professional, and truly cares about his patients’ well-being.', excerpt: true },
  { name: 'Casey Kline', when: '2 years ago', tags: ['back', 'experience'], text: 'Rory does a fantastic job listening to your needs. Came in with a back injury and he definitely helped relieve alot of pain. He also did a great job educating me about my injury. Highly recommend him. He is very flexible with your schedule as well.' },
  { name: 'Gavin middendorf', when: '3 years ago', tags: ['sports'], text: 'Great work! Super in depth analysis on my sports injury and got my spine fixed in a very academic and professional way.' },
  { name: 'Kory Kirkegaard', when: '7 years ago', tags: ['experience'], text: 'Awesome experience with Dr. Dopps! Extremely knowledgeable and great bedside manner. I enjoyed how thorough his explanation of the radiographs he took were and I liked that he adds an objective measurement to my treatment! Would definitely recommend.' },
  { name: 'Trena Ward', when: '3 years ago', tags: ['experience'], text: 'I highly recommend Dr. Rory. He is friendly and easy to talk to. He listens to what you are saying and has very gentle approach when making adjustments. He really cares about helping relieve your pain.' },
  { name: 'Chris Hill', when: '2 years ago', tags: ['experience'], text: 'Dr Dopps was excellent. He took the time to carefully explain my diagnosis in detail, asked me questions about my history and developed a care plan that made perfect sense! I literally felt relief after only the first adjustment.' },
]
