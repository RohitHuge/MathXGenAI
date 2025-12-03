import { tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
import { supabasepg } from "./config.js";
import { Client } from "pg";
import { supabase } from "./config.js";
dotenv.config();

/**
 * 🧠 Tool #1: List All Tables
 * Fetches all public tables using direct PG query.
 */
export const listSupabaseTablesTool = tool({
  name: "list_supabase_tables",
  description: `
    Lists all tables available in the Supabase database within the public schema.
    Use this to understand which tables exist before requesting schema or running queries.
  `,
  parameters: z.object({}),
  async execute() {
    try {
      console.log("🧭 Supabase Tool: Listing all tables via PG...");

      const client = new Client({
        connectionString: supabasepg,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();

      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;

      const { rows } = await client.query(query);
      await client.end();

      const tableList = rows.map((t) => t.table_name);
      console.log("✅ Tables Found:", tableList);

      return JSON.stringify({
        tables: tableList,
        message: "List of available public tables retrieved successfully.",
      });
    } catch (err) {
      return `❌ Failed to list tables: ${err.message}`;
    }
  },
});

/**
 * 🧠 Tool #2: Get Table Schema
 * Fetches column names and data types for a given table using direct PG query.
 */
export const getSupabaseTableSchemaTool = tool({
  name: "get_supabase_table_schema",
  description: `
    Fetches column details (name + data type) for a given table.
    Use this after discovering the table name to understand its structure.
  `,
  parameters: z.object({
    tableName: z.string().describe("The name of the table to fetch schema for."),
  }),
  async execute({ tableName }) {
    try {
      console.log(`📘 Supabase Tool: Getting schema for table '${tableName}' via PG`);

      const client = new Client({
        connectionString: supabasepg,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();

      const query = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `;

      const { rows } = await client.query(query, [tableName]);
      await client.end();

      if (!rows || rows.length === 0)
        return `⚠️ No schema found for table '${tableName}'.`;

      console.log("✅ Schema:", rows);

      const formatted = rows.map(
        (c) => `${c.column_name} (${c.data_type})`
      );
      return `🧩 Table '${tableName}' Columns:\n${formatted.join("\n")}`;
    } catch (err) {
      return `❌ Failed to get schema for '${tableName}': ${err.message}`;
    }
  },
});

/**
 * 🧠 Tool #3: Execute Safe SQL Query
 * Executes only SELECT queries using pg client.
 */
export const directPgTool = tool({
  name: "execute_postgres_query",
  description: "Run raw SQL queries directly on the Supabase PostgreSQL database using pg client.",
  parameters: z.object({
    query: z.string().describe("A valid SQL SELECT query."),
  }),
  async execute({ query }) {
    try {

      console.log(`🧩 Supabase Tool: Executing query: ${query}`);
      const client = new Client({
        connectionString: supabasepg,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();

      const { rows } = await client.query(query);
      await client.end();

      return JSON.stringify(rows, null, 2);
    } catch (err) {
      return `❌ PG execution failed: ${err.message}`;
    }
  },
});


/**
 * 🧠 Tool #4: Save Pending Question
 * Saves an extracted question to the pending_questions table.
 */
export const savePendingQuestionTool = tool({
  name: "save_pending_question",
  description: "Saves an extracted question to the database for user review.",
  parameters: z.object({
    question_body: z.string().describe("The text of the question."),
    options: z.array(z.string()).describe("Array of options (LaTeX strings)."),
    correct_answer: z.string().describe("The correct answer (e.g., 'A', 'B', or the option text)."),
    latex: z.string().describe("The raw LaTeX representation of the question."),
    contest_id: z.string().describe("The contest ID"),
    user_id: z.string().describe("The user ID (Supabase ID) to associate the question with."),
  }),
  async execute({ question_body, options, correct_answer, latex, contest_id, user_id }) {
    try {
      console.log("💾 Supabase Tool: Saving pending question...");
      const { data, error } = await supabase.from("pending_questions").insert({
        question_body,
        options,
        correct_answer,
        latex,
        contest_id,
        user_id,
      });
      if (error) {
        throw error;
      }
      return `✅ Pending question saved successfully.`;
    }
    catch (err) {
      return `❌ Failed to save pending question: ${err.message}`;
    }
  }

});

/**
 * 🧩 Unified Export
 * Simplifies agent.js imports.
 */
export const supabaseTools = [
  listSupabaseTablesTool,
  getSupabaseTableSchemaTool,
  directPgTool,
  savePendingQuestionTool,
];
