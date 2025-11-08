import { tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
import { supabase } from "../run.js";
import { supabasepg } from "../run.js";
import { Client } from "pg";
dotenv.config();

/**
 * 🧠 Tool #1: List All Tables
 * Fetches all public tables using RPC list_public_tables.
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
      console.log("🧭 Supabase Tool: Listing all tables...");
      const { data, error } = await supabase.rpc("list_public_tables");
      if (error) throw error;

      const tableList = data.map((t) => t.table_name);
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
 * Fetches column names and data types for a given table using RPC get_table_schema.
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
      console.log(`📘 Supabase Tool: Getting schema for table '${tableName}'`);

      const { data, error } = await supabase.rpc("get_table_schema", {
        tablename: tableName,
      });

      if (error) throw error;
      if (!data || data.length === 0)
        return `⚠️ No schema found for table '${tableName}'.`;

      console.log("✅ Schema:", data);

      const formatted = data.map(
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
 * Executes only SELECT queries using the built-in exec_sql RPC.
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
 * 🧩 Unified Export
 * Simplifies agent.js imports.
 */
export const supabaseTools = [
  listSupabaseTablesTool,
  getSupabaseTableSchemaTool,
  directPgTool,
];
