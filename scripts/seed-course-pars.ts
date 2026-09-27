/** Verified factual pars only. Default is a read-only preview; --apply fills missing holes.
 * Never overwrites existing course data or changes a saved round. */
import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', quiet: true });
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing Supabase configuration');
const db = createClient(url, key, { auth: { persistSession: false } });
async function main() {
  const courses = JSON.parse(
    await readFile(new URL('../data/courses/space-coast-pars.json', import.meta.url), 'utf8'),
  ) as {
    name: string;
    lat: number;
    lng: number;
    source: string;
    checked: string;
    pars: number[];
  }[];
  for (const course of courses) {
    if (
      course.pars.length !== 18 ||
      course.pars.some((p) => !Number.isInteger(p) || p < 3 || p > 6)
    )
      throw new Error(`Invalid pars: ${course.name}`);
    const { data, error } = await db
      .from('courses')
      .select('id,name,lat,lng,hole_count')
      .eq('name', course.name);
    if (error) throw error;
    const matches = data.filter(
      (c) =>
        c.lat != null &&
        c.lng != null &&
        Math.abs(c.lat - course.lat) < 0.01 &&
        Math.abs(c.lng - course.lng) < 0.01 &&
        c.hole_count === 18,
    );
    if (matches.length !== 1) throw new Error(`Expected one geographic match for ${course.name}`);
    const rows = course.pars.map((par, i) => ({
      course_id: matches[0]!.id,
      hole_number: i + 1,
      par,
      tee_box: 'default',
    }));
    if (process.argv.includes('--apply')) {
      const { error } = await db
        .from('course_holes')
        .upsert(rows, { onConflict: 'course_id,hole_number,tee_box', ignoreDuplicates: true });
      if (error) throw error;
      const { data: saved, error: readError } = await db
        .from('course_holes')
        .select('hole_number,par')
        .eq('course_id', matches[0]!.id)
        .eq('tee_box', 'default')
        .order('hole_number');
      if (readError) throw readError;
      if (
        !saved ||
        saved.length !== 18 ||
        saved.some((h, i) => h.hole_number !== i + 1 || h.par !== course.pars[i])
      )
        throw new Error(`Existing data differs for ${course.name}; review manually`);
    }
    console.log(
      `${process.argv.includes('--apply') ? 'Verified' : 'Preview'}: ${course.name}, 18 holes, par ${course.pars.reduce((a, b) => a + b, 0)}`,
    );
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
