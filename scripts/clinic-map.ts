/**
 * Draws the base of the clinic overview map, src/assets/clinic-map.svg, from OpenStreetMap
 * (© OpenStreetMap contributors, ODbL: the page credits it under the map): the Danube, the
 * Budapest boundary and the main roads, and src/assets/clinic-map-metro.svg: the metro lines
 * alone, on the same viewBox, so a clinic's close-up can leave them out when it has no stop.
 * It also writes src/assets/clinic-map.json: the metro stations and where the motorway badges
 * sit, for the page to set as text. The page adds the clinic markers.
 *
 * Usage: NODE_USE_ENV_PROXY=1 node scripts/clinic-map.ts
 * Rerun after changing the bounds in src/lib/clinic-map.ts. The output is committed, so the
 * build never calls Overpass.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { bounds, height, metres as distance, motorwayBadges, project, width } from '../src/lib/clinic-map.ts';

type Point = { lat: number; lon: number };
type Node = { type: 'node'; tags?: Record<string, string> } & Point;
type Way = { type: 'way'; tags?: Record<string, string>; geometry?: Point[] };
type Relation = { type: 'relation'; tags?: Record<string, string>; members: { type: string; role: string; geometry?: Point[] }[] };

const { south, west, north, east } = bounds;
const bbox = `${south},${west},${north},${east}`;
const query = `[out:json][timeout:120];
(
  relation["natural"="water"]["water"="river"](${bbox});
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${bbox});
  relation["boundary"="administrative"]["admin_level"="6"]["name"="Budapest"];
  relation["route"="subway"](${bbox});
  node["railway"="station"]["station"="subway"](${bbox});
);
out geom;`;

const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  // Overpass turns away requests without a User-Agent of their own.
  headers: { 'User-Agent': 'clinic-map-script/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ data: query }),
});
if (!response.ok) throw new Error(`Overpass answered ${response.status}`);
const { elements, remark } = (await response.json()) as { elements: (Way | Relation | Node)[]; remark?: string };
// A timeout or memory limit still answers 200, with a remark and only part of the data.
if (remark) throw new Error(`Overpass: ${remark}`);

/** Douglas–Peucker: drops points that move the line less than `tolerance` viewBox units. */
function simplify(points: { x: number; y: number }[], tolerance: number): { x: number; y: number }[] {
  if (points.length < 3) return points;
  const first = points[0]!;
  const last = points.at(-1)!;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const length = Math.hypot(dx, dy) || 1;
  let index = 0;
  let max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    const distance = Math.abs(dy * p.x - dx * p.y + last.x * first.y - last.y * first.x) / length;
    if (distance > max) [index, max] = [i, distance];
  }
  if (max <= tolerance) return [first, last];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

// Lines reach a little past the edge, so nothing ends visibly inside the frame.
const margin = 40;
const inFrame = ({ x, y }: { x: number; y: number }) => x > -margin && x < width + margin && y > -margin && y < height + margin;

function pathData(lines: Point[][]) {
  return lines
    .flatMap((line) => {
      const points = line.map(({ lat, lon }) => project({ lat, lng: lon }));
      // Keep the runs of the line that are in the frame, so the file holds no off-map detail.
      const runs: { x: number; y: number }[][] = [[]];
      points.forEach((p, i) => {
        const near = inFrame(p) || (points[i - 1] && inFrame(points[i - 1]!)) || (points[i + 1] && inFrame(points[i + 1]!));
        if (near) runs.at(-1)!.push(p);
        else if (runs.at(-1)!.length) runs.push([]);
      });
      return runs.filter((run) => run.length > 1).map((run) => simplify(run, 0.6));
    })
    .map((run) => 'M' + run.map(({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L'))
    .join('');
}

const ways = (match: (tags: Record<string, string>) => boolean) =>
  elements.flatMap((e) => (e.type === 'way' && e.geometry && match(e.tags ?? {}) ? [e.geometry] : []));
const boundary = elements.flatMap((e) =>
  e.type === 'relation' && e.tags?.boundary ? e.members.flatMap((m) => (m.type === 'way' && m.role === 'outer' && m.geometry ? [m.geometry] : [])) : [],
);

/**
 * The Danube is mapped as a few water areas, each a relation of bank segments. Joining the
 * segments end to end gives closed rings; filled even-odd, the islands stay land.
 */
function rings(segments: Point[][]) {
  const same = (a: Point, b: Point) => a.lat === b.lat && a.lon === b.lon;
  const open = [...segments];
  const done: Point[][] = [];
  while (open.length) {
    let ring = open.pop()!;
    while (!same(ring[0]!, ring.at(-1)!)) {
      const i = open.findIndex((s) => same(s[0]!, ring.at(-1)!) || same(s.at(-1)!, ring.at(-1)!));
      if (i < 0) break;
      const [next] = open.splice(i, 1);
      ring = [...ring, ...(same(next![0]!, ring.at(-1)!) ? next! : next!.toReversed()).slice(1)];
    }
    done.push(ring);
  }
  return done;
}
const water = elements.flatMap((e) =>
  e.type === 'relation' && e.tags?.natural === 'water'
    ? rings(e.members.flatMap((m) => (m.type === 'way' && m.geometry ? [m.geometry] : [])))
    : [],
);

/** Closed rings as SVG path data. */
function ringData(list: Point[][]) {
  return (
    list
      .map((ring) => ring.map(({ lat, lon }) => project({ lat, lng: lon })))
      // A closed ring starts and ends on one point, which leaves Douglas–Peucker no baseline,
      // so each half is simplified on its own.
      .map((ring) => {
        const mid = Math.floor(ring.length / 2);
        return [...simplify(ring.slice(0, mid + 1), 0.6).slice(0, -1), ...simplify(ring.slice(mid), 0.6)];
      })
      .map((ring) => 'M' + ring.map(({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z')
      .join('')
  );
}

/** One route relation per metro line (each runs in both directions): its tracks and colour. */
const metro = new Map<string, { colour: string; tracks: Point[][] }>();
for (const e of elements) {
  if (e.type !== 'relation' || e.tags?.route !== 'subway' || !e.tags.ref || metro.has(e.tags.ref)) continue;
  // Platforms are members too; the tracks are the ways without a role.
  const tracks = e.members.flatMap((m) => (m.type === 'way' && m.role === '' && m.geometry ? [m.geometry] : []));
  metro.set(e.tags.ref, { colour: e.tags.colour ?? '#55524a', tracks });
}
if (!metro.size) throw new Error('No metro lines in the Overpass answer');

const metres = (a: Point, b: Point) => distance({ lat: a.lat, lng: a.lon }, { lat: b.lat, lng: b.lon });

/** Metres from `p` to the track: to its nearest segment, as tunnels are long straight runs. */
function toTrack(p: Point, track: Point[]) {
  const k = Math.cos((p.lat * Math.PI) / 180);
  const xy = (q: Point) => ({ x: q.lon * k, y: q.lat });
  const o = xy(p);
  let best = Infinity;
  for (let i = 1; i < track.length; i++) {
    const [a, b] = [xy(track[i - 1]!), xy(track[i]!)];
    const [dx, dy] = [b.x - a.x, b.y - a.y];
    const t = Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(o.x - a.x - t * dx, o.y - a.y - t * dy) * 111_320);
  }
  return best;
}

// Stations, with every line that stops there: the lines whose track passes within 40 m of
// one of the station's nodes (an interchange such as Deák Ferenc tér has a node per line,
// each on its own track; a station merely near another line's tunnel stays off it).
const stations = new Map<string, { name: string; lines: string[]; lat: number; lng: number }>();
for (const e of elements) {
  if (e.type !== 'node' || !e.tags?.name) continue;
  const lines = [...metro].filter(([, { tracks }]) => tracks.some((track) => toTrack(e, track) <= 40)).map(([ref]) => ref);
  if (!lines.length) continue;
  const station = stations.get(e.tags.name) ?? { name: e.tags.name, lines: [], lat: e.lat, lng: e.lon };
  station.lines = [...new Set([...station.lines, ...lines])].sort();
  stations.set(e.tags.name, station);
}

// Each motorway badge snaps to the nearest point of its motorway, so it sits on the line.
const badges = motorwayBadges.map(({ ref, label, near }) => {
  const points = ways((t) => t.highway === 'motorway' && t.ref === ref).flat();
  const [best] = points.map((p) => ({ p, d: metres(p, { lat: near.lat, lon: near.lng }) })).sort((a, b) => a.d - b.d);
  if (!best || best.d > 3000) throw new Error(`No ${ref} motorway near the ${label} badge`);
  return { label, lat: best.p.lat, lng: best.p.lon };
});

const layers = {
  city: ringData(rings(boundary)),
  river: ringData(water),
  secondary: pathData(ways((t) => t.highway === 'secondary')),
  primary: pathData(ways((t) => t.highway === 'primary')),
  motorway: pathData(ways((t) => t.highway === 'motorway' || t.highway === 'trunk')),
  boundary: pathData(boundary),
};
for (const [name, d] of Object.entries(layers)) if (!d) throw new Error(`No ${name} data in the Overpass answer`);
// Metro lines in their own colours, which Budapest knows them by, thin and faded so the gold
// clinic markers stay the strongest thing on the map. A fixed 2 px at every zoom
// (non-scaling), so they neither vanish on a phone nor swell on a clinic's close-up.
const metroPaths = [...metro.values()]
  .map(
    ({ colour, tracks }) =>
      `<path d="${pathData(tracks)}" stroke="${colour}" stroke-width="2" stroke-opacity="0.6" vector-effect="non-scaling-stroke"/>`,
  )
  .join('\n');

// Colours are the site's palette (src/styles/global.css); the water is the one hue it lacks.
// Content sits on white, so the land is white and only the city is cream, which also shows
// where Budapest ends. Roads go over the river, so the bridges show.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" stroke-linecap="round" stroke-linejoin="round">
<rect width="${width}" height="${height}" fill="#ffffff"/>
<path d="${layers.city}" fill="#fbfaef"/>
<path d="${layers.river}" fill="#c9d9df" fill-rule="evenodd"/>
<path d="${layers.secondary}" stroke="#ebe7d9" stroke-width="1.25"/>
<path d="${layers.primary}" stroke="#d9d2bb" stroke-width="2"/>
<path d="${layers.motorway}" stroke="#c4b78f" stroke-width="3.5"/>
<path d="${layers.boundary}" stroke="#b3a774" stroke-width="1.5" stroke-dasharray="1 6"/>
</svg>
`;
const metroSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" stroke-linecap="round" stroke-linejoin="round">
${metroPaths}
</svg>
`;
for (const [file, content] of [['clinic-map.svg', svg], ['clinic-map-metro.svg', metroSvg]] as const) {
  const out = path.join(import.meta.dirname, '../src/assets', file);
  writeFileSync(out, content);
  console.log(`Wrote ${path.relative(process.cwd(), out)} (${(content.length / 1024).toFixed(0)} KB, ${width}×${height})`);
}

const lineColours = Object.fromEntries([...metro].map(([ref, { colour }]) => [ref, colour]));
const data = { lineColours, stations: [...stations.values()], badges };
const dataOut = path.join(import.meta.dirname, '../src/assets/clinic-map.json');
writeFileSync(dataOut, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), dataOut)} (${data.stations.length} stations, ${badges.length} badges)`);
