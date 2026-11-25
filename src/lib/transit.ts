/**
 * Metro and motorway data for the clinic maps, from src/assets/clinic-map.json, which
 * scripts/clinic-map.ts writes from OpenStreetMap. Kept apart from clinic-map.ts because the
 * script imports that file and must not depend on its own output.
 */
import mapData from '../assets/clinic-map.json';
import { metres, stopRadius } from './clinic-map';

export const { lineColours, stations, badges } = mapData;

/** A clinic's metro stop: the nearest station, when it is a short walk away. */
export const stopFor = (geo: { lat: number; lng: number }) => {
  const [nearest] = stations.map((s) => ({ ...s, d: metres(geo, s) })).sort((a, b) => a.d - b.d);
  return nearest && nearest.d <= stopRadius ? nearest : undefined;
};

/**
 * One roundel per line on the overview, at an end that sits inside every crop and clear of
 * the clinic labels, so the coloured lines say which line they are.
 */
export const lineEnds = ['Mexikói út', 'Örs vezér tere', 'Kőbánya-Kispest', 'Kelenföld vasútállomás'].map((name) => {
  // A terminus renamed in OpenStreetMap would otherwise drop its roundel without a word.
  const station = stations.find((s) => s.name === name);
  if (!station) throw new Error(`No metro station "${name}" in clinic-map.json: update lineEnds`);
  return { ...station, line: station.lines[0]! };
});
