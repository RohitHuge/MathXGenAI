// import { Databases } from "node-appwrite";
import { RunState, tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

import { Query } from "node-appwrite";
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


export const createContestTool = tool({
  name: "create_contest",
  description: "Creates a new contest in Appwrite.",
  parameters: z.object({
    title: z.string(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  async execute({ title, description, startDate, endDate }) {
    try {
      console.log("ToolCalled: Creating Contest", title);
      const result = await db.createDocument(
        "68adceb9000bb9b8310b",
        "contest_info",
        "unique()",
        {
          contest_name: title,
          contest_description: description,
          start_time: startDate,
          end_time: endDate,
          status: "upcoming" // Default status
        }
      );
      return JSON.stringify(result);
    } catch (err) {
      return `Error creating contest: ${err.message}`;
    }
  },
});

export const uploadQuestionTool = tool({
  name: "upload_question",
  description: "Uploads a question to a specific contest.",
  parameters: z.object({
    contestId: z.string(),
    questionBody: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.string(),
    marks: z.number(),
  }),
  async execute({ contestId, questionBody, options, correctAnswer, marks }) {
    try {
      console.log("ToolCalled: Uploading Question to Contest", contestId);
      const result = await db.createDocument(
        "68adceb9000bb9b8310b",
        "questions",
        "unique()",
        {
          contest_id: contestId,
          question_text: questionBody,
          options: options,
          correct_option: correctAnswer,
          marks: marks
        }
      );
      return JSON.stringify(result);
    } catch (err) {
      return `Error uploading question: ${err.message}`;
    }
  },
});
