// import { createClient } from "@supabase/supabase-js";
import { tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
import { supabase } from "../run.js";
dotenv.config();



export const supabaseQueryTool = tool({
  name: "query_supabase",
  description:
    "Run SQL SELECT queries on Supabase safely. Used for reading scores or user data.",
  parameters: z.object({
    query: z.string().describe("The SQL SELECT query to execute."),
  }),
  async execute({ query }) {
    if (!query.toLowerCase().startsWith("select")) {
      return "Only SELECT queries are allowed for safety.";
    }

    const { data, error } = await supabase.rpc("run_sql", { query });
    if (error) return `Error: ${error.message}`;
    return JSON.stringify(data, null, 2);
  },
});

// export const supaBaseGetTableListTool = tool({
//   name: "get_table_list",
//   description:
//     "Get the list of tables in the Supabase database.",
// //   parameters: z.object({
// //     table_name: z.string().describe("The name of the table to get."),
// //   }),
//   async execute() {
//     const { data, error } = await supabase.from(table_name).select("*");
//     if (error) return `Error: ${error.message}`;
//     return JSON.stringify(data, null, 2);
//   },
// });
