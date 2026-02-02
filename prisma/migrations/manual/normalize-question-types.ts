/**
 * Manual migration: Normalize legacy question type values to canonical forms
 *
 * This migration updates database records that contain legacy question type aliases:
 * - 'true_false_justify' -> 'true_false'
 * - 'fill_blank' -> 'fill_in_blank'
 *
 * Run with: npx tsx prisma/migrations/manual/normalize-question-types.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const LEGACY_MAPPINGS: Record<string, string> = {
  true_false_justify: 'true_false',
  fill_blank: 'fill_in_blank',
};

/**
 * Perform a manual migration that normalizes legacy questionType values to their canonical forms in the database.
 *
 * Connects to the Postgres database using the `DATABASE_URL` environment variable, logs current distributions of
 * question types for CuratedQuestion and ExtractedQuestion, updates legacy values according to LEGACY_MAPPINGS,
 * re-verifies distributions after the updates, reports any remaining legacy values, and closes the database connection.
 *
 * @throws Error if `DATABASE_URL` is not set in the environment.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Starting question type normalization migration...\n');

  // Check current state
  console.log('Current state:');
  const curatedBefore = await pool.query(`
    SELECT "questionType"::text as type, COUNT(*)::int as count
    FROM "CuratedQuestion"
    GROUP BY "questionType"
  `);
  console.log('CuratedQuestion:', curatedBefore.rows);

  const extractedBefore = await pool.query(`
    SELECT "questionType"::text as type, COUNT(*)::int as count
    FROM "ExtractedQuestion"
    GROUP BY "questionType"
  `);
  console.log('ExtractedQuestion:', extractedBefore.rows);
  console.log('');

  // Perform migrations in a transaction for atomicity
  await pool.query('BEGIN');
  try {
    for (const [legacy, canonical] of Object.entries(LEGACY_MAPPINGS)) {
      console.log(`Migrating '${legacy}' -> '${canonical}'...`);

      // CuratedQuestion
      const curatedResult = await pool.query(
        `UPDATE "CuratedQuestion" SET "questionType" = $1 WHERE "questionType" = $2`,
        [canonical, legacy]
      );
      console.log(`  CuratedQuestion: ${curatedResult.rowCount} rows updated`);

      // ExtractedQuestion
      const extractedResult = await pool.query(
        `UPDATE "ExtractedQuestion" SET "questionType" = $1 WHERE "questionType" = $2`,
        [canonical, legacy]
      );
      console.log(`  ExtractedQuestion: ${extractedResult.rowCount} rows updated`);
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  console.log('\nMigration complete. Verifying...\n');

  // Verify state after migration
  console.log('State after migration:');
  const curatedAfter = await pool.query(`
    SELECT "questionType"::text as type, COUNT(*)::int as count
    FROM "CuratedQuestion"
    GROUP BY "questionType"
  `);
  console.log('CuratedQuestion:', curatedAfter.rows);

  const extractedAfter = await pool.query(`
    SELECT "questionType"::text as type, COUNT(*)::int as count
    FROM "ExtractedQuestion"
    GROUP BY "questionType"
  `);
  console.log('ExtractedQuestion:', extractedAfter.rows);

  // Check for any remaining legacy values
  const legacyCheck = await pool.query(`
    SELECT 'CuratedQuestion' as table_name, "questionType"::text as type, COUNT(*)::int as count
    FROM "CuratedQuestion"
    WHERE "questionType" IN ('true_false_justify', 'fill_blank')
    GROUP BY "questionType"
    UNION ALL
    SELECT 'ExtractedQuestion' as table_name, "questionType"::text as type, COUNT(*)::int as count
    FROM "ExtractedQuestion"
    WHERE "questionType" IN ('true_false_justify', 'fill_blank')
    GROUP BY "questionType"
  `);

  if (legacyCheck.rows.length > 0) {
    console.log('\nWARNING: Legacy values still exist:', legacyCheck.rows);
  } else {
    console.log('\nAll legacy values successfully migrated.');
  }

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
