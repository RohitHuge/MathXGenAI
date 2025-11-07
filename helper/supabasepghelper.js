import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;

// Use your Supabase connection string
const client = new Client({
  connectionString: "postgresql://postgres:@db.almxadlystsilsxaunts.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false }, // Required for Supabase hosted DB
});

async function executeRaw(query) {
  try {
    await client.connect();
    console.log("🧮 Direct PG executing query:\n", query);

    const { rows } = await client.query(query);

    console.log("✅ Query Result:");
    console.table(rows);

    return rows;
  } catch (err) {
    console.error("❌ PG query failed:", err.message);
  } finally {
    await client.end();
  }
}

await executeRaw(`
  SELECT
    s.user_id, u.name, u.rollno, s.score
  FROM scores s
  JOIN users_public u ON s.user_id = u.user_id
  WHERE s.contest_id = '6905d2b80f2671e4f54e'
  ORDER BY s.score DESC, s.time_taken ASC
  LIMIT 10;
`);
