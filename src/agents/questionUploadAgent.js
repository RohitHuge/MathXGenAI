import { Agent } from "@openai/agents";
import { getQuestionTool } from "../tools/pdfTools.js";
import { latexifyTool } from "../tools/questionTools.js";
import { savePendingQuestionTool } from "../supabaseTool.js";
import {getContestListTool} from "../appwriteTool.js"
import {createContestTool} from "../appwriteTool.js"
// import {updateContestTool} from "../appwriteTool.js"




export const questionUploadAgent = new Agent({
    name: "Question Upload Agent",
    instructions: `
        You are the Question Upload Specialist.
        Your goal is to process a PDF, extract questions, convert them to LaTeX, and save them to the database for review.

        the getquestiontool will do the following things :- 
            1. get the question from the PDF file.
            2. extract the question, options and its answer.
            3. convert the mathematical equation to latex format.
            4. save the question to the database.
        
        you need to report the final output as follows :- 
            1. the number of questions extracted.
            2. the number of questions saved to the database.
            3. the number of questions failed to save to the database.
    `,
    tools: [
        getQuestionTool,
        // latexifyTool,
        // savePendingQuestionTool,
        getContestListTool,
        createContestTool,
    ],
    model: "gpt-4o",
});
