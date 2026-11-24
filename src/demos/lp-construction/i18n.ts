/**
 * Every interface string on the LP Construction concept, in English and
 * Spanish. Page-level facts and service copy are in content.ts. The owner
 * answers Spanish requests himself (intake #17); the Spanish is Claude's and
 * awaits his review.
 */
import type { IdeaFinishId, IdeaStyleId } from './ideas/styles'
import type { Contact, Customer, Job, Language, Timing } from './request/types'
import { business, type StageId } from './content'

const phone = business.phoneDisplay
const minimum = `$${business.minimumJob}`

export interface Strings {
  locale: string
  /** The other language: its name in its own language, and its code. */
  other: { name: string; lang: Language; label: string }
  skip: string
  menu: { open: string; close: string; label: string }
  nav: { services: string; work: string; area: string; request: string; call: string }
  footer: { blurb: string; services: string; contact: string; call: string; text: string; request: string; instagram: string; newTab: string; rights: (year: number) => string; concept: string }
  talk: { call: string; text: string; textBody: string }
  crumbs: { home: string; services: string }
  hero: { eyebrow: string; titleA: string; titleB: string; lede: string; areaHeading: string; stagesLabel: string; scroll: string; choose: string; illustrated: string }
  stages: Record<StageId, string>
  facts: { label: string; items: [string, string][] }
  home: { servicesEyebrow: string; servicesTitle: string; ideasEyebrow: string; ideasTitle: string; ideasLede: string; workEyebrow: string; workTitle: string; workAll: string; stepsEyebrow: string; stepsTitle: string }
  steps: { title: string; text: string }[]
  closing: { title: string; text: string; request: string; otherPrompt: string; otherLink: string }
  servicesPage: { title: string; lede: string; label: string }
  servicePage: { request: string; includes: string; price: string; minimum: string; more: (name: string) => string; areaTitle: string; areaText: (minutes: number) => string; other: string }
  areaPage: { title: string; lede: (minutes: number) => string; check: string; cities: string; edge: string; edgeText: string; note: string; states: Record<'MO' | 'KS', string> }
  workPage: { title: string; lede: string; label: string; filter: string; all: string; empty: string; instagram: string }
  requestPage: { label: string; asideTitle: string; asideText: string; next: string }
  ideas: {
    step1: string; sample: string; myPhoto: string; anotherPhoto: string; photoLabel: string; hint: string; photoError: string
    step2: string; step3: string; crown: string; costTitle: string; costText: string
    sampleAlt: string; sampleAfterAlt: (style: string) => string; sampleShows: (shown: string, style: string) => string
    yourPhotoAlt: string; conceptAlt: (style: string) => string
    captionSample: string; captionConcept: string; captionPhoto: string
    checking: string; consent: string; make: string; making: string; liveOff: string; liveOffSuffix: string; failed: string
    requestLook: string; sendPhoto: string; request: string
    styles: Record<IdeaStyleId, string>; finishes: Record<IdeaFinishId, string>
  }
  compare: { label: string; before: string; after: string; value: (after: number) => string }
  area: {
    label: string
    button: string
    inside: (zip: string) => string
    edge: (zip: string) => string
    outside: (zip: string) => string
    unknown: (zip: string) => string
    invalid: string
    request: string
    textBody: (zip: string) => string
  }
  form: {
    title: string
    lede: string
    zip: string
    who: string
    customers: Record<Customer, string>
    what: string
    jobs: Record<Job, string>
    details: string
    detailsHint: string
    size: string
    sizeHint: string
    timing: string
    timings: Record<Timing, string>
    photos: string
    photosHint: string
    addPhotos: string
    removePhoto: string
    photoError: string
    idea: string
    ideaCrown: string
    removeIdea: string
    contactLegend: string
    name: string
    phone: string
    email: string
    emailHint: string
    contact: string
    contacts: Record<Contact, string>
    minimum: string
    submit: string
    sending: string
    errors: { zip: string; jobs: string; name: string; phone: string; email: string; summary: string }
    sent: (name: string, method: string) => string
    notSent: string
    failed: string
    limited: string
    callOrText: string
    call: string
  }
}

export const strings: Record<Language, Strings> = {
  en: {
    locale: 'en_US',
    other: { name: 'Español', lang: 'es', label: 'Ver esta página en español' },
    skip: 'Skip to content',
    menu: { open: 'Menu', close: 'Close', label: 'Menu' },
    nav: { services: 'Services', work: 'Our work', area: 'Service area', request: 'Request an estimate', call: 'Call' },
    footer: {
      blurb: 'Finish carpentry across the Kansas City area, on both sides of the state line.',
      services: 'Services', contact: 'Contact', call: 'Call', text: 'Text', request: 'Request an estimate', instagram: 'Instagram', newTab: '(opens in a new tab)',
      rights: year => `© ${year} ${business.name}. Licensed & insured. Free estimates, no trip charge.`,
      concept: 'Website concept. The foyer timelapse and the sample room are illustrations; project photos are LP Construction’s own work.',
    },
    talk: { call: 'Call', text: 'Text us', textBody: 'Hi, I’d like a free estimate.' },
    crumbs: { home: 'Home', services: 'Services' },
    hero: {
      eyebrow: 'Finish carpentry · Kansas City',
      titleA: 'Stairs, walls and trim that ',
      titleB: 'finish the room.',
      lede: 'Carpeted stairs, flat walls and plain trim, turned into the work people notice. We install it, then caulk, fill and paint it ourselves.',
      areaHeading: 'Do we work in your area?',
      stagesLabel: 'Foyer transformation',
      scroll: 'Scroll to build it',
      choose: 'Choose a stage',
      illustrated: 'Illustrated foyer',
    },
    stages: { before: 'Before', torn: 'Torn out', built: 'Built', primed: 'Caulked & primed', finished: 'Finished' },
    facts: {
      label: 'Working with LP Construction',
      items: [['Free estimates', 'No trip charge'], ['Install to paint', 'We caulk, fill and paint it ourselves'], ['Se habla español', 'Requests in Spanish welcome'], ['Homes and new builds', 'For homeowners and builders']],
    },
    home: {
      servicesEyebrow: 'What we build', servicesTitle: 'Five kinds of work, one finish carpenter.',
      ideasEyebrow: 'Room ideas', ideasTitle: 'See a plain wall with new trim.',
      ideasLede: 'Try a style on the sample room, or use a photo of your own wall. Then send it with your request so we can see what you have in mind.',
      workEyebrow: 'Recent work', workTitle: 'From our job sites.', workAll: 'See all our work →',
      stepsEyebrow: 'How it works', stepsTitle: 'Three steps, no surprises.',
    },
    steps: [
      { title: 'Check your ZIP and send a request', text: 'Add a photo if you can. It helps us understand the space before we visit.' },
      { title: 'Free estimate visit', text: 'We look at the space, talk through options and materials, and price the job. There’s no trip charge.' },
      { title: 'We build it and finish it', text: 'We install, then caulk, fill and paint it ourselves. No hand-off to a painter.' },
    ],
    closing: {
      title: 'Ready to finish the room?',
      text: `Free estimates across the Kansas City area. Jobs start at ${minimum}.`,
      request: 'Request a free estimate',
      otherPrompt: '¿Prefiere español?',
      otherLink: 'Vea el sitio en español',
    },
    servicesPage: { title: 'Finish carpentry services', lede: 'Staircases, walls, ceilings, trim and built-ins across the Kansas City area. We install it, then caulk, fill and paint it ourselves.', label: 'Services' },
    servicePage: {
      request: 'Request a free estimate',
      includes: 'What we do',
      price: 'What changes the price',
      minimum: `Jobs start at ${minimum}. We do the caulk, fill and paint too, so there’s no painter to schedule.`,
      more: name => `More ${name.toLowerCase()}`,
      areaTitle: 'Do we work in your area?',
      areaText: minutes => `We work within about ${minutes} minutes of downtown Kansas City, MO, in Missouri and Kansas.`,
      other: 'Other services',
    },
    areaPage: {
      title: 'Where we work',
      lede: minutes => `Within about ${minutes} minutes of downtown Kansas City, MO, on both sides of the state line. Enter your ZIP to check.`,
      check: 'Check your ZIP',
      cities: 'Cities we serve',
      edge: 'At the edge of our area',
      edgeText: 'Call or text and we’ll confirm.',
      note: `Drive times are estimates without traffic, measured to the middle of each ZIP code. Not listed? Check your ZIP above, or call or text ${phone}.`,
      states: { MO: 'Missouri', KS: 'Kansas' },
    },
    workPage: {
      title: 'Our work',
      lede: 'Photos from LP Construction’s jobs around Kansas City: stairs, paneling, ceilings, mantels and built-ins, many of them in new homes.',
      label: 'Photos', filter: 'Show photos of', all: 'All work',
      empty: 'Photos of recent work are on', instagram: 'LP Construction’s Instagram',
    },
    requestPage: { label: 'Request an estimate', asideTitle: 'Rather talk it through?', asideText: `Call or text ${phone}.`, next: 'What happens next' },
    ideas: {
      step1: '1. Start with a room', sample: 'Use the sample room', myPhoto: 'Use my photo', anotherPhoto: 'Choose another photo', photoLabel: 'Photo of your room',
      hint: 'Stand back and face one wall. Your photo is resized on your device and its location data is removed.',
      photoError: 'That photo couldn’t be opened. Try a JPG or PNG, or take a screenshot of it and use that.',
      step2: '2. Pick a style', step3: '3. Finish', crown: 'Add crown molding and taller baseboards',
      costTitle: 'What would it cost?',
      costText: `We price every job at a free estimate visit, because materials and the condition of the wall change it most. There’s no trip charge, and jobs start at ${minimum}.`,
      sampleAlt: 'Sample living room with a plain painted wall behind a linen sofa',
      sampleAfterAlt: style => `The same room with ${style.toLowerCase()} on the wall behind the sofa`,
      sampleShows: (shown, style) => `The sample room shows ${shown}. Use your own photo to see ${style.toLowerCase()}.`,
      yourPhotoAlt: 'Your room as photographed',
      conceptAlt: style => `Concept of your room with ${style.toLowerCase()}`,
      captionSample: 'Sample room: an illustration.',
      captionConcept: 'Concept image, made by AI from your photo. The real design is set at your estimate.',
      captionPhoto: 'Your photo.',
      checking: 'Checking whether live concepts are on…',
      consent: 'Send this photo to OpenAI to make the concept. It isn’t stored.',
      make: 'Show me this look', making: 'Making your concept… about a minute',
      liveOff: 'Live concepts are switched off on this preview site.', liveOffSuffix: 'Your photo can still go with your request.',
      failed: 'The concept couldn’t be made. Please try again later, or send your photo with a request.',
      requestLook: 'Request this look', sendPhoto: 'Send my photo with a request', request: 'Request an estimate',
      styles: { frames: 'Picture-frame molding', grid: 'Board & batten grid', slats: 'Vertical slat wall', wainscot: 'Wainscoting & chair rail', geometric: 'Geometric panels' },
      finishes: { match: 'Match the wall', white: 'Soft white', dark: 'Deep charcoal', oak: 'Natural oak' },
    },
    compare: { label: 'Compare before and after', before: 'Before', after: 'After', value: after => `${after}% after` },
    area: {
      label: 'Your ZIP code',
      button: 'Check my area',
      inside: zip => `Good news: ${zip} is in our area.`,
      edge: zip => `${zip} is right at the edge of our area. Call or text and we’ll confirm.`,
      outside: zip => `Sorry, ${zip} is outside our area. We work within about 45 minutes of downtown Kansas City.`,
      unknown: zip => `We couldn’t place ${zip}. Call or text and we’ll tell you.`,
      invalid: 'Enter a 5-digit ZIP code.',
      request: 'Request a free estimate',
      textBody: zip => `Hi, is ${zip} in your service area?`,
    },
    form: {
      title: 'Request a free estimate',
      lede: 'Tell us about the job and we’ll reply to set up a free estimate visit. There’s no trip charge.',
      zip: 'ZIP code of the job',
      who: 'I’m a',
      customers: { homeowner: 'Homeowner', builder: 'Builder or contractor' },
      what: 'What do you need?',
      jobs: {
        staircases: 'Staircases & railings', 'wall-paneling': 'Accent walls & paneling', 'crown-ceilings': 'Crown molding & ceilings',
        'trim-doors': 'Baseboards, doors & windows', 'built-ins': 'Built-ins & mantels', unsure: 'Not sure yet',
      },
      details: 'Tell us about it',
      detailsHint: 'Which rooms, what’s there now, and what you’d like.',
      size: 'Rough size (optional)',
      sizeHint: 'For example: 14 stairs, or one 12-foot wall with 9-foot ceilings.',
      timing: 'When would you like it done?',
      timings: { soon: 'As soon as possible', quarter: 'In the next 3 months', later: 'Later this year', pricing: 'Just getting prices' },
      photos: 'Photos (optional)',
      photosHint: 'Up to 3 photos of the space. They’re resized on your device, and location data is removed.',
      addPhotos: 'Add photos',
      removePhoto: 'Remove photo',
      photoError: 'That photo couldn’t be opened. Try a JPG or PNG, or take a screenshot of it.',
      idea: 'Your room idea',
      ideaCrown: 'with crown and tall baseboards',
      removeIdea: 'Remove idea',
      contactLegend: 'How we reach you',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      emailHint: 'Optional unless you choose email.',
      contact: 'Best way to reach you',
      contacts: { call: 'Call', text: 'Text', email: 'Email' },
      minimum: `Jobs start at ${minimum}.`,
      submit: 'Send request',
      sending: 'Sending…',
      errors: {
        zip: 'Enter the 5-digit ZIP code of the job.',
        jobs: 'Choose at least one.',
        name: 'Enter your name.',
        phone: 'Enter a phone number we can call or text.',
        email: 'Enter an email address, or choose call or text.',
        summary: 'Please check the fields marked below.',
      },
      sent: (name, method) => `Thanks, ${name}. Your request is in, and we’ll reply by ${method}.`,
      notSent: `This is a website preview, so your request was not sent. To reach LP Construction now, call or text ${phone}.`,
      failed: `Something went wrong and your request was not sent. Please call or text ${phone}.`,
      limited: `Too many requests from this connection. Please call or text ${phone}.`,
      callOrText: 'Text us',
      call: 'Call',
    },
  },
  es: {
    locale: 'es_US',
    other: { name: 'English', lang: 'en', label: 'View this page in English' },
    skip: 'Ir al contenido',
    menu: { open: 'Menú', close: 'Cerrar', label: 'Menú' },
    nav: { services: 'Servicios', work: 'Nuestro trabajo', area: 'Área de servicio', request: 'Pedir un presupuesto', call: 'Llamar al' },
    footer: {
      blurb: 'Carpintería de acabados en el área de Kansas City, en los dos lados de la línea estatal.',
      services: 'Servicios', contact: 'Contacto', call: 'Llamar al', text: 'Mensaje al', request: 'Pedir un presupuesto', instagram: 'Instagram', newTab: '(se abre en una pestaña nueva)',
      rights: year => `© ${year} ${business.name}. Con licencia y seguro. Presupuestos gratis, sin cargo por la visita.`,
      concept: 'Concepto de sitio web. El recibidor que se construye al bajar y el cuarto de ejemplo son ilustraciones; las fotos de proyectos son trabajo de LP Construction.',
    },
    talk: { call: 'Llamar al', text: 'Enviar mensaje', textBody: 'Hola, quisiera un presupuesto gratis.' },
    crumbs: { home: 'Inicio', services: 'Servicios' },
    hero: {
      eyebrow: 'Carpintería de acabados · Kansas City',
      titleA: 'Escaleras, paredes y molduras que ',
      titleB: 'terminan el cuarto.',
      lede: 'Escaleras con alfombra, paredes lisas y molduras sencillas, convertidas en el trabajo que todos notan. Lo instalamos y luego sellamos, resanamos y pintamos nosotros mismos.',
      areaHeading: '¿Trabajamos en su área?',
      stagesLabel: 'Transformación del recibidor',
      scroll: 'Baje para construirlo',
      choose: 'Elija una etapa',
      illustrated: 'Recibidor ilustrado',
    },
    stages: { before: 'Antes', torn: 'Desmontado', built: 'Construido', primed: 'Sellado y con primer', finished: 'Terminado' },
    facts: {
      label: 'Trabajar con LP Construction',
      items: [['Presupuestos gratis', 'Sin cargo por la visita'], ['De la instalación a la pintura', 'Sellamos, resanamos y pintamos nosotros mismos'], ['Hablamos español', 'Solicitudes en español bienvenidas'], ['Casas y construcción nueva', 'Para propietarios y constructores']],
    },
    home: {
      servicesEyebrow: 'Lo que construimos', servicesTitle: 'Cinco tipos de trabajo, un carpintero de acabados.',
      ideasEyebrow: 'Ideas para su cuarto', ideasTitle: 'Vea una pared lisa con molduras nuevas.',
      ideasLede: 'Pruebe un estilo en el cuarto de ejemplo, o use una foto de su propia pared. Luego mándela con su solicitud para que veamos lo que tiene en mente.',
      workEyebrow: 'Trabajos recientes', workTitle: 'De nuestras obras.', workAll: 'Ver todo nuestro trabajo →',
      stepsEyebrow: 'Cómo funciona', stepsTitle: 'Tres pasos, sin sorpresas.',
    },
    steps: [
      { title: 'Revise su código postal y mande su solicitud', text: 'Agregue una foto si puede. Nos ayuda a entender el espacio antes de la visita.' },
      { title: 'Visita de presupuesto gratis', text: 'Vemos el espacio, platicamos de opciones y materiales, y le damos el precio. No cobramos la visita.' },
      { title: 'Lo construimos y lo terminamos', text: 'Instalamos y luego sellamos, resanamos y pintamos nosotros mismos. Sin pasarle el trabajo a un pintor.' },
    ],
    closing: {
      title: '¿Listo para terminar el cuarto?',
      text: `Presupuestos gratis en el área de Kansas City. Los trabajos empiezan en ${minimum}.`,
      request: 'Pedir un presupuesto gratis',
      otherPrompt: 'Prefer English?',
      otherLink: 'View the site in English',
    },
    servicesPage: { title: 'Servicios de carpintería de acabados', lede: 'Escaleras, paredes, techos, molduras y muebles empotrados en el área de Kansas City. Lo instalamos y luego sellamos, resanamos y pintamos nosotros mismos.', label: 'Servicios' },
    servicePage: {
      request: 'Pedir un presupuesto gratis',
      includes: 'Lo que hacemos',
      price: 'Qué cambia el precio',
      minimum: `Los trabajos empiezan en ${minimum}. También sellamos, resanamos y pintamos, así que no hay que contratar a un pintor.`,
      more: name => `Más fotos: ${name.toLowerCase()}`,
      areaTitle: '¿Trabajamos en su área?',
      areaText: minutes => `Trabajamos a unos ${minutes} minutos del centro de Kansas City, MO, en Missouri y Kansas.`,
      other: 'Otros servicios',
    },
    areaPage: {
      title: 'Dónde trabajamos',
      lede: minutes => `A unos ${minutes} minutos del centro de Kansas City, MO, en los dos lados de la línea estatal. Escriba su código postal para revisar.`,
      check: 'Revise su código postal',
      cities: 'Ciudades donde trabajamos',
      edge: 'En el límite de nuestra área',
      edgeText: 'Llámenos o envíenos un mensaje y se lo confirmamos.',
      note: `Los tiempos de manejo son aproximados, sin tráfico, medidos al centro de cada código postal. ¿No ve su ciudad? Revise su código postal arriba, o llame o envíe un mensaje al ${phone}.`,
      states: { MO: 'Missouri', KS: 'Kansas' },
    },
    workPage: {
      title: 'Nuestro trabajo',
      lede: 'Fotos de trabajos de LP Construction en Kansas City: escaleras, paneles, techos, chimeneas y muebles empotrados, muchos en casas nuevas.',
      label: 'Fotos', filter: 'Ver fotos de', all: 'Todo',
      empty: 'Hay fotos de trabajos recientes en', instagram: 'el Instagram de LP Construction',
    },
    requestPage: { label: 'Pedir un presupuesto', asideTitle: '¿Prefiere hablarlo?', asideText: `Llame o envíe un mensaje al ${phone}.`, next: 'Qué sigue' },
    ideas: {
      step1: '1. Empiece con un cuarto', sample: 'Usar el cuarto de ejemplo', myPhoto: 'Usar mi foto', anotherPhoto: 'Elegir otra foto', photoLabel: 'Foto de su cuarto',
      hint: 'Aléjese y tome la foto de frente a una pared. La foto se reduce en su dispositivo y se quitan los datos de ubicación.',
      photoError: 'No pudimos abrir esa foto. Pruebe con JPG o PNG, o tome una captura de pantalla y use esa.',
      step2: '2. Elija un estilo', step3: '3. Acabado', crown: 'Agregar moldura de corona y zócalos más altos',
      costTitle: '¿Cuánto costaría?',
      costText: `Le damos el precio de cada trabajo en una visita de presupuesto gratis, porque los materiales y el estado de la pared son lo que más lo cambia. No cobramos la visita, y los trabajos empiezan en ${minimum}.`,
      sampleAlt: 'Sala de ejemplo con una pared lisa pintada detrás de un sofá de lino',
      sampleAfterAlt: style => `La misma sala con ${style.toLowerCase()} en la pared detrás del sofá`,
      sampleShows: (shown, style) => `El cuarto de ejemplo muestra ${shown}. Use su propia foto para ver ${style.toLowerCase()}.`,
      yourPhotoAlt: 'Su cuarto como aparece en la foto',
      conceptAlt: style => `Idea de su cuarto con ${style.toLowerCase()}`,
      captionSample: 'Cuarto de ejemplo: una ilustración.',
      captionConcept: 'Imagen de concepto hecha con IA a partir de su foto. El diseño real se define en su presupuesto.',
      captionPhoto: 'Su foto.',
      checking: 'Revisando si las ideas en vivo están disponibles…',
      consent: 'Enviar esta foto a OpenAI para crear la idea. No se guarda.',
      make: 'Mostrar este estilo', making: 'Creando su idea… como un minuto',
      liveOff: 'Las ideas en vivo están apagadas en este sitio de prueba.', liveOffSuffix: 'Su foto todavía puede ir con su solicitud.',
      failed: 'No se pudo crear la idea. Intente más tarde, o mande su foto con una solicitud.',
      requestLook: 'Pedir este estilo', sendPhoto: 'Mandar mi foto con una solicitud', request: 'Pedir un presupuesto',
      styles: { frames: 'Molduras tipo marco', grid: 'Cuadrícula de listones', slats: 'Pared de listones verticales', wainscot: 'Lambrín con moldura de silla', geometric: 'Paneles geométricos' },
      finishes: { match: 'Igual que la pared', white: 'Blanco suave', dark: 'Carbón oscuro', oak: 'Roble natural' },
    },
    compare: { label: 'Comparar antes y después', before: 'Antes', after: 'Después', value: after => `${after}% después` },
    area: {
      label: 'Su código postal',
      button: 'Revisar mi área',
      inside: zip => `Buenas noticias: el ${zip} está dentro de nuestra área.`,
      edge: zip => `El ${zip} está en el límite de nuestra área. Llámenos o envíenos un mensaje y se lo confirmamos.`,
      outside: zip => `Lo sentimos, el ${zip} está fuera de nuestra área. Trabajamos a unos 45 minutos del centro de Kansas City.`,
      unknown: zip => `No pudimos ubicar el ${zip}. Llámenos o envíenos un mensaje y le decimos.`,
      invalid: 'Escriba un código postal de 5 dígitos.',
      request: 'Pedir un presupuesto gratis',
      textBody: zip => `Hola, ¿el ${zip} está dentro de su área de servicio?`,
    },
    form: {
      title: 'Pida un presupuesto gratis',
      lede: 'Cuéntenos sobre el trabajo y le responderemos para programar una visita de presupuesto gratis. No cobramos la visita.',
      zip: 'Código postal del trabajo',
      who: 'Soy',
      customers: { homeowner: 'Propietario de vivienda', builder: 'Constructor o contratista' },
      what: '¿Qué necesita?',
      jobs: {
        staircases: 'Escaleras y barandales', 'wall-paneling': 'Paredes decorativas y paneles', 'crown-ceilings': 'Molduras de corona y techos',
        'trim-doors': 'Zócalos, puertas y ventanas', 'built-ins': 'Muebles empotrados y chimeneas', unsure: 'Aún no estoy seguro',
      },
      details: 'Cuéntenos más',
      detailsHint: 'Qué cuartos, qué hay ahora y qué le gustaría.',
      size: 'Tamaño aproximado (opcional)',
      sizeHint: 'Por ejemplo: 14 escalones, o una pared de 12 pies con techos de 9 pies.',
      timing: '¿Cuándo le gustaría hacerlo?',
      timings: { soon: 'Lo antes posible', quarter: 'En los próximos 3 meses', later: 'Más adelante este año', pricing: 'Solo estoy comparando precios' },
      photos: 'Fotos (opcional)',
      photosHint: 'Hasta 3 fotos del espacio. Se reducen en su dispositivo y se quitan los datos de ubicación.',
      addPhotos: 'Agregar fotos',
      removePhoto: 'Quitar foto',
      photoError: 'No pudimos abrir esa foto. Pruebe con JPG o PNG, o tome una captura de pantalla.',
      idea: 'Su idea para el cuarto',
      ideaCrown: 'con moldura de corona y zócalos altos',
      removeIdea: 'Quitar idea',
      contactLegend: 'Cómo comunicarnos con usted',
      name: 'Nombre',
      phone: 'Teléfono',
      email: 'Correo electrónico',
      emailHint: 'Opcional, a menos que elija correo.',
      contact: 'La mejor forma de contactarle',
      contacts: { call: 'Llamada', text: 'Mensaje de texto', email: 'Correo' },
      minimum: `Los trabajos empiezan en ${minimum}.`,
      submit: 'Enviar solicitud',
      sending: 'Enviando…',
      errors: {
        zip: 'Escriba el código postal de 5 dígitos del trabajo.',
        jobs: 'Elija al menos una opción.',
        name: 'Escriba su nombre.',
        phone: 'Escriba un teléfono al que podamos llamar o enviar mensajes.',
        email: 'Escriba un correo electrónico, o elija llamada o mensaje.',
        summary: 'Por favor revise los campos marcados abajo.',
      },
      sent: (name, method) => `Gracias, ${name}. Recibimos su solicitud y le responderemos por ${method}.`,
      notSent: `Este sitio es una vista previa, así que su solicitud no se envió. Para comunicarse con LP Construction ahora, llame o envíe un mensaje al ${phone}.`,
      failed: `Algo salió mal y su solicitud no se envió. Por favor llame o envíe un mensaje al ${phone}.`,
      limited: `Demasiadas solicitudes desde esta conexión. Por favor llame o envíe un mensaje al ${phone}.`,
      callOrText: 'Enviar mensaje',
      call: 'Llamar',
    },
  },
}
