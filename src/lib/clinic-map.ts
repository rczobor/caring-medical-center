/**
 * The area the clinic overview map (src/assets/clinic-map.svg) covers, and how a clinic's
 * `geo` lands on it. scripts/clinic-map.ts draws the base map from these same bounds, so
 * markers placed with `project` line up with the streets. Change the bounds, then rerun it.
 */
// Larger than any crop the page shows: phones see the middle 3:2, wide screens a 3:1 band.
// The height sets the phone scale: tall enough that the outer clinics' labels fit inside the
// map on a 360 px wide phone, which also gives the wide band even room above and below.
export const bounds = { west: 18.712, east: 19.304, south: 47.405, north: 47.605 };

// Over a city this small, a flat projection scaled by cos(latitude) matches Web Mercator to
// within a pixel, and it keeps the script and the page in step without a map library.
const xScale = Math.cos((((bounds.north + bounds.south) / 2) * Math.PI) / 180);
export const width = 1200;
export const height = Math.round((width * (bounds.north - bounds.south)) / ((bounds.east - bounds.west) * xScale));

/** Position on the base map, in its viewBox units (`width` × `height`). */
export const project = ({ lat, lng }: { lat: number; lng: number }) => ({
  x: ((lng - bounds.west) / (bounds.east - bounds.west)) * width,
  y: ((bounds.north - lat) / (bounds.north - bounds.south)) * height,
});

/**
 * Through the city the Danube runs close to this longitude. A clinic's label hangs on the
 * side away from it, so a Buda clinic's label never reaches across the river into Pest.
 */
export const danubeLng = 19.05;

/**
 * Place names set over the drawn map, so a patient can find their bearings. Phones leave out
 * "Buda": on the small map it sits by the Buda clinic's label and reads as its name. "Pest"
 * sits east of the metro lines, clear of the Point clinic's label at every width.
 */
export const places = [
  { name: 'Buda', lat: 47.503, lng: 18.958, kind: 'area', phone: false },
  { name: 'Pest', lat: 47.488, lng: 19.168, kind: 'area', phone: true },
  { name: 'Duna', lat: 47.466, lng: 19.083, kind: 'water', phone: true },
] as const;

/**
 * Motorway badges on the overview map, for patients who drive. Each sits on its motorway at
 * the point nearest `near` (scripts/clinic-map.ts snaps it), placed inside both the phone and
 * the desktop crop and clear of the clinic labels.
 */
export const motorwayBadges = [{ ref: 'M1;M7', label: 'M1 · M7', near: { lat: 47.468, lng: 18.985 } }];

/** Straight-line distance in metres; flat-earth is plenty at city scale. */
export const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) * 111_320;

/** A metro station counts as the clinic's stop within this walk, as the crow flies. */
export const stopRadius = 1000;

/** The clinic names all start with the brand; labels set it small over the part that differs. */
export const brand = 'Caring Medical';
export const splitName = (name: string) =>
  name.startsWith(`${brand} `) ? { brand, short: name.slice(brand.length + 1) } : { brand: undefined, short: name };
