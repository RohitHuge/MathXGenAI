// import { Databases } from "node-appwrite";
import { RunState, tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

import {Query} from "node-appwrite";
import { db } from "../run.js";

export const getContestTool = tool({
  name: "get_contest",
  description: "This tool provides the deatils of a specific contest whenever the Contest ID is provided.",
  parameters: z.object({
    contestId: z.string(),
  }),
  async execute({ contestId }) {
    try {
      console.log("ToolCalled:Getting Details of Contest by ID", contestId);
      const result = await db.getDocument("68adceb9000bb9b8310b", "contest_info", contestId);
      return JSON.stringify(result);
    } catch (err) {
      return `Error fetching contest: ${err.message}`;
    }
  },
});


export const getContestListTool = tool({
  name: "get_contest_list",
  description: "This tool provides the list of all contests whenever it is called.",
  parameters: z.object({
  }),
  async execute() {
    try {
      console.log("ToolCalled:Getting List of Contests");
      const result = await db.listDocuments("68adceb9000bb9b8310b", "contest_info");
      return JSON.stringify(result);
    } catch (err) {
      return `Error fetching contest: ${err.message}`;
    }
  },
});

export const getQuestionbyContestId = tool({
  name: "get_question_by_contest_id",
  description: "This tool provides the list of questions for a specific contest whenever the Contest ID is provided.",
  parameters: z.object({
    contestId: z.string(),
  }),
  async execute({ contestId }) {
    try {
      console.log("ToolCalled:Getting List of Questions by Contest ID", contestId);
      const result = await db.listDocuments("68adceb9000bb9b8310b", "questions", 
      [Query.equal("contest_id", contestId)]);
      return JSON.stringify(result);
    } catch (err) {
      return `Error fetching contest: ${err.message}`;
    }
  },
});

