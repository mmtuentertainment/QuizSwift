/**
 * One-time script to delete malformed questions from database
 *
 * These questions were generated before format validation was implemented:
 * - cmkttd7pa0004swcehesfrmsn: Bad T/F (comparison question)
 * - cmkttd7pa0005swcefpq0y4we: Missing blank marker
 * - cmkttd7pa0007swceju7ag4ds: Missing blank marker
 *
 * Run with: npx tsx prisma/scripts/delete-bad-questions.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const BAD_QUESTION_IDS = [
  'cmkttd7pa0004swcehesfrmsn', // Bad T/F (comparison question)
  'cmkttd7pa0005swcefpq0y4we', // Missing blank marker
  'cmkttd7pa0007swceju7ag4ds', // Missing blank marker
];

/**
 * Delete the predefined malformed questions from the CuratedQuestion table in the database.
 *
 * Connects to the database using DATABASE_URL, logs any matching rows found, deletes the
 * questions with the IDs specified in BAD_QUESTION_IDS, verifies deletion, and closes the
 * database connection.
 *
 * @throws If the `DATABASE_URL` environment variable is not set.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  // Use SSL with certificate verification (Neon provides valid certificates)
  // Set DISABLE_SSL_VERIFICATION=true only for local development with self-signed certs
  const pool = new Pool({
    connectionString,
    ssl:
      process.env.DISABLE_SSL_VERIFICATION === 'true'
        ? { rejectUnauthorized: false }
        : true,
  });

  console.log('Deleting malformed questions...');
  console.log(`Target IDs: ${BAD_QUESTION_IDS.join(', ')}\n`);

  // Check if questions exist before deletion
  const beforeCheck = await pool.query(
    `SELECT id, "questionType"::text as type, LEFT("questionText", 50) as text_preview
     FROM "CuratedQuestion"
     WHERE id = ANY($1)`,
    [BAD_QUESTION_IDS]
  );

  if (beforeCheck.rows.length === 0) {
    console.log('No matching questions found in database (may have been already deleted).');
    await pool.end();
    return;
  }

  console.log(`Found ${beforeCheck.rows.length} questions to delete:`);
  for (const row of beforeCheck.rows) {
    console.log(`  - ${row.id} (${row.type}): "${row.text_preview}..."`);
  }
  console.log('');

  // Delete the questions
  const deleteResult = await pool.query(
    `DELETE FROM "CuratedQuestion" WHERE id = ANY($1)`,
    [BAD_QUESTION_IDS]
  );

  console.log(`Deleted ${deleteResult.rowCount} questions\n`);

  // Verify they're gone
  const afterCheck = await pool.query(
    `SELECT id FROM "CuratedQuestion" WHERE id = ANY($1)`,
    [BAD_QUESTION_IDS]
  );

  if (afterCheck.rows.length > 0) {
    console.error('WARNING: Some questions still exist:', afterCheck.rows.map(r => r.id));
  } else {
    console.log('All bad questions successfully deleted.');
  }

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  });
