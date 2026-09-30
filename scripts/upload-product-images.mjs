// Uploads every image in assets/products/ to the public Storage bucket `vitrina-products`.
//
// Usage: npm run images:upload   (reads SUPABASE_URL and SUPABASE_SECRET_KEY from .env.scripts)
//
// NOTE: `supabase db reset` wipes the Storage metadata, so run this again after every reset.
// This script uses the secret key: it must never be imported from the app.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const BUCKET = 'vitrina-products';
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.scripts.example to .env.scripts and fill them in ' +
      '(local values: `supabase status`).',
  );
  process.exit(1);
}

const dir = fileURLToPath(new URL('../assets/products/', import.meta.url));
const files = (await readdir(dir)).filter((name) => name.endsWith('.webp')).sort();
const client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let uploaded = 0;
for (const name of files) {
  const { error } = await client.storage
    .from(BUCKET)
    .upload(name, await readFile(join(dir, name)), {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '31536000',
    });
  if (error) {
    console.error(`Failed to upload ${name}: ${error.message}`);
    process.exit(1);
  }
  uploaded += 1;
}
console.log(`Uploaded ${uploaded} image(s) to ${BUCKET}.`);
