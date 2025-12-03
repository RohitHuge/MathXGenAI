// import { Databases } from "node-appwrite";
import { RunState, tool } from "@openai/agents";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

import { Query } from "node-appwrite";
import { db } from "./config.js";

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
  description: "Creates a new contest in Appwrite. There are some required fields to create a contest. Title, Description, Start Date and eventDuration, contestDuration and difficulty are required. ",
  parameters: z.object({
    title: z.string(),
    description: z.string().describe("Description of the contest"),
    startDate: z.string().datetime().describe("Start date (ISO string)"),
    eventDuration: z.number().describe("Event duration in minutes"),
    contestDuration: z.number().describe("Contest duration in minutes"),
    difficulty: z.enum(["easy", "medium", "hard"]).describe("Difficulty of the contest"),
    
  }),
  async execute({ title, description, startDate, eventDuration, contestDuration, difficulty }) {
    try {
      if (!title || !description || !startDate || !eventDuration || !contestDuration || !difficulty) {
        return "Missing required fields";
      }
      
      console.log("ToolCalled: Creating Contest", title);
      const result = await db.createDocument(
        "68adceb9000bb9b8310b",
        "contest_info",
        "unique()",
        {
          title : title,
          description : description,
          startTime: startDate,
          eventDuration: eventDuration,
          contestDuration: contestDuration,
          difficulty: difficulty,
          status: "draft" // Default status
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

export const getAppwriteTableListTool = tool({
  name: "get_appwrite_table_list",
  description: "This tool provides the list of all tables in Appwrite.",
  parameters: z.object({
  }),
  async execute() {
    try {
      console.log("ToolCalled:Getting List of Tables in Appwrite");
      const result = await db.listTables("68adceb9000bb9b8310b");
      return JSON.stringify(result);
    } catch (err) {
      return `Error fetching contest: ${err.message}`;
    }
  },
});

export const getAppwriteTableSchemaTool = tool({
  name: "get_appwrite_table_schema",
  description: "This tool provides the schema of a specific table in Appwrite.",
  parameters: z.object({
    tableName: z.string(),
  }),
  async execute({ tableName }) {
    try {
      console.log("ToolCalled:Getting Schema of Table", tableName);
      const result = await db.getCollection("68adceb9000bb9b8310b", tableName);
      return JSON.stringify(result);
    } catch (err) {
      return `Error fetching contest: ${err.message}`;
    }
  },
});

export const updateContestTool = tool({ 
  name: "update_contest",
  description: "Updates a specific field of a contest in Appwrite.",
  parameters: z.object({
    contestId: z.string(),
    field: z.string(),
    type: z.enum(["string", "number", "boolean"]),
    stringValue: z.string(),
    numberValue: z.number(),
    booleanValue: z.boolean(),
  }),
  async execute({ contestId, field, type, stringValue, numberValue, booleanValue }) {
    try {
      console.log("ToolCalled: Updating Contest", contestId);
      const result = await db.updateDocument(
        "68adceb9000bb9b8310b",
        "contest_info",
        contestId,
        {
          [field]: type === "string" ? stringValue : type === "number" ? numberValue : booleanValue,
        }
      );
      return JSON.stringify(result);
    } catch (err) {
      return `Error updating contest: ${err.message}`;
    }
  },
});
