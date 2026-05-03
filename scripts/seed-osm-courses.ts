// Run with: npx tsx scripts/seed-osm-courses.ts
//
// Required env in .env.local:
//   EXPO_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY      (from Supabase dashboard → Settings → API)
//
// Pulls golf courses from OpenStreetMap via the Overpass API for the
// continental US bbox and upserts into the `courses` table. Idempotent
// via courses.osm_id (UNIQUE).

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Expo's convention is .env.local; dotenv's auto-load only reads .env.
loadEnv({ path: '.env.local' });
loadEnv();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) throw new Error('EXPO_PUBLIC_SUPABASE_URL required (check .env.local)');
if (!SERVICE_ROLE) throw new Error('SUPABASE_SERVICE_ROLE_KEY required (check .env.local)');

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// US continental bbox (south, west, north, east).
const OVERPASS_QUERY = `
[out:json][timeout:300];
(
  way["leisure"="golf_course"](24.0,-125.0,49.5,-66.0);
  relation["leisure"="golf_course"](24.0,-125.0,49.5,-66.0);
);
out center tags;
`;

type OsmElement = {
  type: 'way' | 'relation' | 'node';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type CourseRow = {
  osm_id: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  hole_count: number;
  source: 'osm';
  verified: boolean;
};

async function main(): Promise<void> {
  console.log('fetching from Overpass…');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(OVERPASS_QUERY),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!res.ok) throw new Error(`Overpass ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { elements?: OsmElement[] };
  const elements = json.elements ?? [];
  console.log(`got ${elements.length} elements`);

  const rows: CourseRow[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const lat = el.center?.lat ?? el.lat;
    const lng = el.center?.lon ?? el.lon;
    const name = tags.name;
    if (!name || lat == null || lng == null) continue;
    const holesStr = tags.holes;
    const holesParsed = holesStr && /^\d+$/.test(holesStr) ? parseInt(holesStr, 10) : 18;
    const hole_count = [9, 18, 27, 36].includes(holesParsed) ? holesParsed : 18;
    rows.push({
      osm_id: el.id,
      name: name.slice(0, 200),
      city: tags['addr:city'] ?? null,
      state: tags['addr:state'] ?? null,
      country: tags['addr:country'] ?? 'US',
      lat,
      lng,
      hole_count,
      source: 'osm',
      verified: false,
    });
  }
  console.log(`prepared ${rows.length} rows`);

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await admin
      .from('courses')
      .upsert(slice, { onConflict: 'osm_id', ignoreDuplicates: true });
    if (error) {
      console.error(`chunk ${i}: ${error.message}`);
    } else {
      inserted += slice.length;
      console.log(`upserted ${inserted} / ${rows.length}`);
    }
  }
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
