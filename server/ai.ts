import { FIGURES } from '../src/domain/figures.ts';
import type { Mode, ParsedTrip, Place } from '../src/domain/types.ts';
import { distance } from '../src/domain/geo.ts';

const OPENAI = 'https://api.openai.com/v1';
const FAL_3D = 'https://queue.fal.run/fal-ai/hunyuan3d-v3/image-to-3d';

function openaiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return key;
}

async function ok(res: Response) {
  if (!res.ok) throw new Error(`${res.url} → ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return res.json();
}

export async function transcribe(audio: Buffer, mime: string): Promise<string> {
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), `voice.${ext}`);
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
  const json = await ok(await fetch(`${OPENAI}/audio/transcriptions`, {
    method: 'POST', headers: { Authorization: `Bearer ${openaiKey()}` }, body: form,
  }));
  return json.text;
}

const allFigures = Object.values(FIGURES).flat();

const schema = {
  type: 'object', additionalProperties: false, required: ['title', 'stops'],
  properties: {
    title: { type: 'string' },
    stops: {
      type: 'array',
      items: {
        // the way in lives on the stop itself: a separate legs array drifted out of step with stops on long trips
        type: 'object', additionalProperties: false, required: ['name', 'query', 'lat', 'lng', 'mode', 'figure'],
        properties: {
          mode: { type: 'string', enum: ['air', 'ground', 'water'], description: 'How the traveller arrived here from the previous stop (ignored for the first stop)' },
          figure: { type: 'string', enum: allFigures },
          name: { type: 'string', description: 'Short display name in English, e.g. "Istanbul"' },
          query: { type: 'string', description: 'Geocoding query: the place\'s common English/OSM name, fixing typos, plus city/region and country, e.g. "Fushiogami-oji, Tanabe, Wakayama, Japan"' },
          lat: { type: 'number' }, lng: { type: 'number' },
        },
      },
    },
  },
};

const system = `You turn a free-form travel story into an ordered itinerary.
Return every place visited in order as stops (include the starting point).
Keep the user's order exactly: never reorder, merge or drop places, even if another order looks more logical. Revisiting a place is a new stop.
If the user lists segments (start → end), stops are the first start followed by each segment's end, in the given order.
Skip anything marked optional / alternative unless the user asks to include it. Each stop's mode/figure is how the traveller got there from the previous stop.
mode: air for flights, water for ferries/boats/cruises, ground for everything else.
figure must match the mode: ${Object.entries(FIGURES).map(([m, f]) => `${m}: ${f.join(', ')}`).join('; ')}. Pick what the user says (motorbike → motorcycle, train → train), otherwise airplane / car / ship.
lat/lng: your best coordinates for the place. title: short catchy trip title.`;

export async function parseTrip(text: string): Promise<ParsedTrip> {
  const json = await ok(await fetch(`${OPENAI}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [{ role: 'system', content: system }, { role: 'user', content: text }],
      response_format: { type: 'json_schema', json_schema: { name: 'trip', strict: true, schema } },
    }),
  }));
  const plan = JSON.parse(json.choices[0].message.content) as {
    title: string; stops: { name: string; query: string; lat: number; lng: number; mode: Mode; figure: string }[];
  };
  const stops: ParsedTrip['stops'] = await Promise.all(plan.stops.map(async (s, i) => {
    // the AI knows roughly where a place is but not exactly; geocoders know exactly but hit namesakes (Paris, Texas)
    const nearest = (found: Place[]) => found.map((p) => ({ p, d: distance([p.lng, p.lat], [s.lng, s.lat]) })).filter((x) => x.d < 60_000).sort((a, b) => a.d - b.d)[0]?.p;
    // Photon only for Nominatim misses: firing it for every stop at once gets 503s
    const hit = nearest(await nominatim(s.query).catch(() => [])) ?? nearest(await geocode(s.query, 5).catch(() => []));
    const leg = i > 0 ? { mode: s.mode, figure: FIGURES[s.mode].includes(s.figure) ? s.figure : FIGURES[s.mode][0] } : undefined;
    return hit ? { name: s.name, lng: hit.lng, lat: hit.lat, leg } : { name: s.name, lng: s.lng, lat: s.lat, approx: true, leg };
  }));
  return { title: plan.title, stops };
}

export async function geocode(q: string, limit = 6): Promise<Place[]> {
  return places(await ok(await fetch(`https://photon.komoot.io/api/?lang=en&limit=${limit}&q=${encodeURIComponent(q)}`)), q);
}

// Nominatim allows 1 request/s and requires an identifying User-Agent
let nominatimSlot = Promise.resolve();
export function nominatim(q: string): Promise<Place[]> {
  const run = nominatimSlot.then(async () => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=en&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'trip-animator (local single-user app)' } });
    return (await ok(res)).map((p: any) => ({ name: p.name || q, label: p.display_name, lng: Number(p.lon), lat: Number(p.lat) }));
  });
  nominatimSlot = run.then(() => new Promise((r) => setTimeout(r, 1100)), () => new Promise((r) => setTimeout(r, 1100)));
  return run;
}

export async function reverse(lng: number, lat: number): Promise<Place | undefined> {
  return places(await ok(await fetch(`https://photon.komoot.io/reverse?lang=en&lon=${lng}&lat=${lat}`)), '')[0];
}

function places(json: any, q: string): Place[] {
  return json.features.map((f: any) => {
    const p = f.properties;
    return {
      name: p.name || p.city || p.district || p.locality || p.county || p.street || q,
      label: [p.name, p.city !== p.name ? p.city : null, p.state, p.country].filter(Boolean).join(', '),
      lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
    };
  });
}


function falKey() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not set');
  return key;
}

/** queues a photo → 3D job; returns the queue response_url used as task id */
export async function photoTo3dCreate(image: Buffer, mime: string): Promise<string> {
  const json = await ok(await fetch(FAL_3D, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_image_url: `data:${mime};base64,${image.toString('base64')}` }),
  }));
  return json.response_url;
}

export async function photoTo3dStatus(responseUrl: string): Promise<{ status: string; glb?: string }> {
  const headers = { Authorization: `Key ${falKey()}` };
  const { status } = await ok(await fetch(`${responseUrl}/status`, { headers }));
  if (status !== 'COMPLETED') return { status };
  // a failed job surfaces as an error response on the result URL
  const res = await fetch(responseUrl, { headers });
  const glb = res.ok ? (await res.json()).model_glb?.url : undefined;
  return glb ? { status, glb } : { status: 'FAILED' };
}
