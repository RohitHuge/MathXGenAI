import {createClient} from "@supabase/supabase-js";

const supabase = createClient(
  "https://almxadlystsilsxaunts.supabase.co",
  ""
);


async function execute(query) {
  try {
    console.log("🧮 SupabaseExecuteTool executing query:\n", query);

    const trimmed = query.trim().toLowerCase();
    if (!trimmed.startsWith("select")) {
      return "❌ Only SELECT queries are allowed for safety.";
    }

    const { data, error } = await supabase.rpc("exec_sql", { sql: query });

if (error) throw error;
console.log("✅ Query Result:", data);

  } catch (err) {
    console.error("❌ Supabase execution tool failed:", err.message);
    return `❌ Supabase execution tool failed: ${err.message}`;
  }
}

await execute(`
  SELECT 
    s.user_id, u.name, u.rollno, s.score
  FROM scores s
  JOIN users_public u ON s.user_id = u.user_id
  WHERE s.contest_id = '6905d2b80f2671e4f54e'
  ORDER BY s.score DESC, s.time_taken ASC
  LIMIT 10;
`);