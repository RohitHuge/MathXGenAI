import { tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
import { supabase } from "../run.js";
dotenv.config();

/**
 * 🧩 Utility: Fetch all tables in the public schema
 */
async function getAllTables() {
  const { data, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");


  console.log(data);

  if (error) throw new Error(error.message);
  return data.map((t) => t.table_name);
}

/**
 * 🧩 Utility: Fetch column schema (name + type) for a given table
 */
async function getTableSchema(tableName) {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name, data_type")
    .eq("table_name", tableName)
    .eq("table_schema", "public");

  console.log(data);

  if (error) throw new Error(error.message);
  return data;
}

/**
 * 🧠 Tool #1: Schema Discovery Tool
 * Lets the agent inspect tables and build context before forming a query.
 */
export const supabaseSchemaTool = tool({
  name: "discover_supabase_schema",
  description: `
    Inspect the Supabase database structure dynamically.
    Use this tool to:
      • List all available tables in the public schema.
      • Fetch their columns and data types.
      • Understand which tables are relevant before creating a SQL query.
    Do NOT use it to execute queries directly.
  `,
  parameters: z.object({
    instruction: z
      .string()
      .describe(
        "Describe what you want to find (e.g., 'find tables with scores or contests')."
      ),
  }),
  async execute({ instruction }) {
    try {
      console.log("🧭 SupabaseSchemaTool activated with:", instruction);

      const tables = await getAllTables();
      console.log("📋 Found Tables:", tables);

      const schemaMap = {};
      for (const table of tables) {
        schemaMap[table] = await getTableSchema(table);
      }

      const schemaSummary = Object.entries(schemaMap)
        .map(
          ([t, cols]) =>
            `Table "${t}" → columns: ${cols
              .map((c) => `${c.column_name} (${c.data_type})`)
              .join(", ")}`
        )
        .join("\n");

      return `🗂️ Database Schema Overview:\n${schemaSummary}\n\nUse this schema context to generate your SQL SELECT query for execution.`;
    } catch (err) {
      return `❌ Schema discovery failed: ${err.message}`;
    }
  },
});

/**
 * 🧠 Tool #2: Safe SQL Execution Tool
 * Executes only SELECT statements on Supabase.
 */
export const supabaseExecuteTool = tool({
  name: "execute_supabase_query",
  description: `
    Execute a validated SQL SELECT query safely on Supabase.
    This tool must only be used after schema inspection.
    The query must be a read-only SELECT statement.
  `,
  parameters: z.object({
    query: z
      .string()
      .describe(
        "A complete SQL SELECT query to execute, using correct table and column names."
      ),
  }),
  async execute({ query }) {
    try {
      console.log("🧮 SupabaseExecuteTool executing query:", query);

      const trimmed = query.trim().toLowerCase();
      if (!trimmed.startsWith("select")) {
        return "❌ Only SELECT queries are allowed for safety.";
      }

      // If you have an RPC function `run_sql`, use it here
      // Otherwise you can parse and route specific table queries.
      const { data, error } = await supabase.rpc("run_sql", { query });
      if (error) return `❌ Query execution error: ${error.message}`;

      if (!data || data.length === 0) return "⚠️ No data found.";
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `❌ Supabase execution tool failed: ${err.message}`;
    }
  },
});

/**
 * 🧩 Backward compatibility — keep this unified export
 * So agent.js can easily import all tools from one file.
 */
export const supabaseTools = [supabaseSchemaTool, supabaseExecuteTool];
