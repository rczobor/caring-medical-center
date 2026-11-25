import { localeOf, type Locale } from './locale';

/**
 * The words the templates and components set themselves, in both languages. Page copy
 * lives in src/content; this is the frame around it: buttons, headings, labels, messages.
 */
const hu = {
  skipToContent: 'Ugrás a tartalomra',
  /** The link to the same page in the other language, labelled in that language. */
  otherLanguage: { label: 'English', lang: 'en', hreflang: 'en' },
  header: { logoAlt: 'Caring Medical Center – főoldal', nav: 'Fő navigáció', menu: 'Menü' },
  book: 'Időpontfoglalás',
  bookOnline: 'Online foglalás',
  bookOnlineAt: (...names: string[]) => `Online foglalás, ${names.join(', ')}`,
  /** A call button's accessible name, starting with what it shows. */
  call: (phone: string, clinic: string) => `${phone}, ${clinic} hívása`,
  directions: 'Útvonaltervezés a Google Térképen',
  breadcrumbs: 'Morzsamenü',
  search: {
    label: 'Keresés',
    title: 'Keresés – Caring Medical Center',
    description: 'Keressen vizsgálatra, panaszra, szakrendelésre vagy orvosra a Caring Medical Center oldalain.',
    question: 'Mit keres?',
    placeholder: 'Például: térd MR, gerinc, Berkes',
    results: 'Találatok',
    noScript: { before: 'A keresés JavaScript nélkül nem működik. Hívja rendelőnket, vagy nézze meg, ', link: 'miben segíthetünk', after: '.' },
    /** Set by the search script; a query or a count goes between the parts. */
    script: {
      unavailable: 'A keresés most nem érhető el. Kérjük, próbálja újra később.',
      none: ['Nincs találat erre: „', '”. Próbáljon egy másik szót, például a panaszát vagy a vizsgálat nevét.'] as [string, string],
      many: [' találat, az első ', ' látszik.'] as [string, string],
      count: ' találat',
      countOne: ' találat',
    },
  },
  homeCrumb: 'Főoldal',
  footer: {
    nav: 'További oldalak',
    links: [
      { href: '/paciensinformaciok', label: 'Páciensinformációk' },
      { href: '/orvosaink', label: 'Orvosaink' },
      { href: '/adatkezelesi-tajekoztato', label: 'Adatkezelési tájékoztató' },
      { href: '/impresszum', label: 'Impresszum' },
    ],
  },
  bookingPanel: {
    // "a Medicall vagy a MyMedio oldalán": where online booking continues.
    intro: (clinics: number, systems: string[]) =>
      `${clinics} rendelőnkben végezzük ezt a vizsgálatot. Foglaljon online vagy telefonon. Az online foglalás a ${systems.join(' vagy a ')} oldalán folytatódik.`,
  },
  clinicPanel: { title: 'Foglalás és elérhetőség', metro: 'Metró:' },
  closingCta: { eyebrow: 'Várjuk hívását!', title: 'Foglaljon időpontot rendelőnkbe!' },
  doctorsTitle: 'Orvosaink',
  deposit: { terms: 'A foglalási díj teljes feltételei' },
  /** Around a lowest price: "57 900 Ft-tól". */
  priceFrom: { before: '', after: '-tól' },
  facts: { price: 'Ár', time: 'Vizsgálati idő', result: 'Lelet', referral: 'Beutaló', askByPhone: 'Telefonon érdeklődjön' },
  serviceSteps: 'A vizsgálat menete',
  clinicMap: {
    list: 'Rendelőink a térképen',
    you: 'Ön',
    nearest: 'Melyik van hozzám legközelebb?',
    /** Placed by the map script. */
    script: {
      locating: 'Helymeghatározás…',
      tag: 'Legközelebb Önhöz',
      answer: 'Önhöz legközelebb: ',
      within1km: '1 km-en belül',
      about: 'kb. ',
      crowFlies: 'légvonalban',
      denied: 'A böngésző nem engedte a helymeghatározást.',
      failed: 'Nem sikerült meghatározni a helyét.',
    },
    places: { Buda: 'Buda', Pest: 'Pest', Duna: 'Duna' } as Record<string, string>,
  },
  streetMap: {
    load: 'Utcatérkép betöltése',
    note: 'Az utcatérkép (Mapbox) csak kattintásra töltődik be.',
    script: { loading: 'Betöltés…', retry: 'Nem sikerült. Újra', failed: 'Az utcatérképet nem sikerült betölteni.', label: 'Utcatérkép: ' },
  },
  form: {
    title: 'Segítségre van szüksége?',
    intro: 'Küldjön nekünk üzenetet, és kapcsolatba lépünk önnel 24 órán belül!',
    heading: 'Kapcsolatfelvétel',
    name: 'Teljes Név',
    email: 'Email cím',
    phone: 'Telefonszám',
    clinic: 'Melyik rendelőnkbe jönne?',
    clinicUnknown: 'Még nem tudom',
    message: 'Üzenet',
    messageTip: 'Kérjük, leletet vagy részletes egészségügyi adatot ne küldjön üzenetben.',
    messagePlaceholder: 'Miben segíthetünk?',
    website: 'Weboldal',
    consent: { before: 'Elolvastam és elfogadom az ', link: 'adatkezelési tájékoztatót', after: '.' },
    submit: 'Üzenet Elküldése',
    sentTitle: 'Köszönjük, üzenetét megkaptuk.',
    sentText: 'Hamarosan felvesszük Önnel a kapcsolatot.',
    /** Set by the form script. */
    script: {
      name: 'Kérjük, adja meg a nevét.',
      emailMissing: 'Kérjük, adja meg az email címét.',
      emailInvalid: 'Kérjük, ellenőrizze az email címet, például: nev@pelda.hu.',
      phone: 'Kérjük, adja meg a telefonszámát, hogy visszahívhassuk.',
      message: 'Kérjük, írja le, miben segíthetünk.',
      consent: 'Az üzenet elküldéséhez el kell fogadnia az adatkezelési tájékoztatót.',
      required: 'Kérjük, töltse ki ezt a mezőt.',
      sending: 'Üzenet küldése…',
      failed: 'Az üzenetet most nem sikerült elküldeni. Kérjük, próbálja újra később, vagy hívjon minket: ',
    },
  },
  priceList: {
    pricesCrumb: 'Árak',
    heroAlt: 'Radiográfus készíti elő a pácienst az MR-vizsgálatra',
    search: 'Vizsgálat keresése',
    searchPlaceholder: 'Például: térd, gerinc, kontrasztos',
    /** Set by the search script. */
    script: { results: ' találat', result: ' találat', none: 'Nincs találat. Próbáljon rövidebb keresőszót, például: térd.' },
    xrayMri: { crumb: 'Röntgen és MR árak', xray: 'Röntgenvizsgálatok', mri: 'MR vizsgálatok', extras: 'Kiegészítő díjak' },
    ct: { crumb: 'CT árak', ct: 'CT vizsgálatok' },
    rehab: { crumb: 'Rehabilitáció és szakrendelések', list: 'Árlista' },
  },
  home: {
    exams: 'Vizsgálatok',
    prices: 'Árak',
    clinics: 'Rendelőink',
    heroAlt: 'Recepciós munkatársunk fogad egy pácienst',
    /** Phones show a few reviews; this opens the rest. */
    moreQuotes: (n: number) => `További vélemények (${n})`,
    /** The quote marks around a testimonial. */
    quote: { open: '„', close: '”' },
  },
  contact: {
    crumb: 'Kapcsolat',
    lead: 'Válassza ki a vizsgálatot, majd a rendelőt. Foglaljon online vagy telefonon.',
    what: 'Mit szeretne foglalni?',
    heroAlt: 'A Caring Medical Point folyosója az orvosi szobák ajtajaival',
    clinics: 'Rendelőink',
  },
  diagnosticsCrumb: 'Diagnosztika',
  exam: {
    title: (exam: string) => `${exam} - MR Vizsgálatok – Caring Medical Center | Precíz Diagnosztika`,
    description: (exam: string) => `${exam}: árak, vizsgálati idő és időpontfoglalás a Caring Medical Centerben.`,
    about: 'A vizsgálatról',
    prices: 'Árak és vizsgálati idő',
    noPrice: 'Erre a vizsgálatra nincs külön ár az árlistán. Az aktuális árról érdeklődjön telefonon.',
    fullList: { before: 'A teljes árlista, a felárak és a kiegészítő díjak az ', link: 'MR árlistán', after: ' találhatók.' },
    others: 'További MR vizsgálatok',
  },
  page: { pathway: 'Így segítünk', backToNews: 'Vissza a hírekhez', bookableHere: 'Itt foglalható:', fromPrices: 'Legalacsonyabb árak' },
  news: { eyebrow: 'Hírek', byYear: 'Hírek évenként', more: 'További hírek', heroAlt: 'A Caring Medical Budaörs világos váróterme' },
  doctors: { others: 'További orvosaink' },
};

type Ui = typeof hu;

const en: Ui = {
  skipToContent: 'Skip to content',
  otherLanguage: { label: 'Magyar', lang: 'hu', hreflang: 'hu' },
  header: { logoAlt: 'Caring Medical Center – home', nav: 'Main navigation', menu: 'Menu' },
  book: 'Book an appointment',
  bookOnline: 'Book online',
  bookOnlineAt: (...names) => `Book online, ${names.join(', ')}`,
  call: (phone, clinic) => `${phone}, call ${clinic}`,
  directions: 'Directions on Google Maps',
  breadcrumbs: 'Breadcrumbs',
  search: {
    label: 'Search',
    title: 'Search – Caring Medical Center',
    description: 'Search Caring Medical Center’s pages for an exam, a complaint, a specialist clinic or a doctor.',
    question: 'What are you looking for?',
    placeholder: 'For example: knee MRI, spine, Berkes',
    results: 'Results',
    noScript: { before: 'Search doesn’t work without JavaScript. Call our clinic, or see ', link: 'how we can help', after: '.' },
    script: {
      unavailable: 'Search isn’t available right now. Please try again later.',
      none: ['No results for “', '”. Try another word, such as your complaint or the name of the exam.'],
      many: [' results, showing the first ', '.'],
      count: ' results',
      countOne: ' result',
    },
  },
  homeCrumb: 'Home',
  footer: {
    nav: 'More pages',
    links: [
      { href: '/paciensinformaciok', label: 'Patient information' },
      { href: '/orvosaink', label: 'Our doctors' },
      // The legal pages are Hungarian only.
      { href: '/adatkezelesi-tajekoztato', label: 'Privacy notice (in Hungarian)' },
      { href: '/impresszum', label: 'Legal notice (in Hungarian)' },
    ],
  },
  bookingPanel: {
    intro: (clinics, systems) =>
      `${clinics} of our clinics offer this exam. Book online or by phone. Online booking continues on the ${systems.join(' or ')} website.`,
  },
  clinicPanel: { title: 'Booking and contact', metro: 'Metro:' },
  closingCta: { eyebrow: 'We look forward to your call', title: 'Book an appointment at one of our clinics' },
  doctorsTitle: 'Our doctors',
  deposit: { terms: 'Full terms of the booking deposit' },
  priceFrom: { before: 'from', after: '' },
  facts: { price: 'Price', time: 'Exam time', result: 'Report', referral: 'Referral', askByPhone: 'Ask by phone' },
  serviceSteps: 'How the exam works',
  clinicMap: {
    list: 'Our clinics on the map',
    you: 'You',
    nearest: 'Which clinic is nearest to me?',
    script: {
      locating: 'Finding your location…',
      tag: 'Nearest to you',
      answer: 'Nearest to you: ',
      within1km: 'within 1 km',
      about: 'about ',
      crowFlies: 'as the crow flies',
      denied: 'Your browser did not allow location access.',
      failed: 'We could not find your location.',
    },
    places: { Buda: 'Buda', Pest: 'Pest', Duna: 'Danube' },
  },
  streetMap: {
    load: 'Load street map',
    note: 'The street map (Mapbox) loads only when you ask for it.',
    script: { loading: 'Loading…', retry: 'Failed. Try again', failed: 'The street map could not be loaded.', label: 'Street map: ' },
  },
  form: {
    title: 'Need help?',
    intro: 'Send us a message and we will get back to you within 24 hours.',
    heading: 'Get in touch',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number',
    clinic: 'Which of our clinics would you like to visit?',
    clinicUnknown: 'I don’t know yet',
    message: 'Message',
    messageTip: 'Please do not send medical reports or detailed health information in your message.',
    messagePlaceholder: 'How can we help?',
    website: 'Website',
    consent: { before: 'I have read and accept the ', link: 'privacy notice (in Hungarian)', after: '.' },
    submit: 'Send message',
    sentTitle: 'Thank you, we have received your message.',
    sentText: 'We will contact you soon.',
    script: {
      name: 'Please enter your name.',
      emailMissing: 'Please enter your email address.',
      emailInvalid: 'Please check the email address, for example: name@example.com.',
      phone: 'Please enter your phone number so we can call you back.',
      message: 'Please tell us how we can help.',
      consent: 'To send the message, please accept the privacy notice.',
      required: 'Please fill in this field.',
      sending: 'Sending message…',
      failed: 'The message could not be sent right now. Please try again later, or call us: ',
    },
  },
  priceList: {
    pricesCrumb: 'Prices',
    heroAlt: 'A radiographer prepares a patient for an MRI scan',
    search: 'Search for an exam',
    searchPlaceholder: 'For example: knee, spine, contrast',
    script: { results: ' results', result: ' result', none: 'No results. Try a shorter word, for example: knee.' },
    xrayMri: { crumb: 'X-ray and MRI prices', xray: 'X-ray exams', mri: 'MRI exams', extras: 'Additional fees' },
    ct: { crumb: 'CT prices', ct: 'CT exams' },
    rehab: { crumb: 'Rehabilitation and specialist clinics', list: 'Price list' },
  },
  home: {
    exams: 'Exams',
    prices: 'Prices',
    clinics: 'Our clinics',
    heroAlt: 'Our receptionist welcomes a patient',
    moreQuotes: (n) => `More reviews (${n})`,
    quote: { open: '“', close: '”' },
  },
  contact: {
    crumb: 'Contact',
    lead: 'Choose the exam, then the clinic. Book online or by phone.',
    what: 'What would you like to book?',
    heroAlt: 'The corridor at Caring Medical Point, lined with consulting-room doors',
    clinics: 'Our clinics',
  },
  diagnosticsCrumb: 'Diagnostics',
  exam: {
    title: (exam) => `${exam} – Caring Medical Center Budapest`,
    description: (exam) => `${exam}: prices, exam time and booking at Caring Medical Center in Budapest.`,
    about: 'About the exam',
    prices: 'Prices and exam time',
    noPrice: 'This exam has no separate price on the price list. Please call us for the current price.',
    fullList: { before: 'The full price list, surcharges and additional fees are on the ', link: 'MRI price list', after: '.' },
    others: 'Other MRI exams',
  },
  page: { pathway: 'How we can help', backToNews: 'Back to news', bookableHere: 'Book here:', fromPrices: 'Lowest prices' },
  news: { eyebrow: 'News', byYear: 'News by year', more: 'More news', heroAlt: 'The bright waiting room at Caring Medical Budaörs' },
  doctors: { others: 'Our other doctors' },
};

export const ui: Record<Locale, Ui> = { hu, en };

/** The interface words for the page at this URL. */
export const uiFor = (url: URL) => ui[localeOf(url)];
