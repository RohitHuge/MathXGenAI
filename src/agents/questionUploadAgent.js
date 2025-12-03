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

        Workflow:
        1. Extract questions from the PDF using 'getquestiontool' (or similar tool available).
        2. For each extracted question:
           a. Convert the question body and options to LaTeX using 'latexify'.
           b. Save the question to the database using 'save_pending_question'.
           c. Ensure 'latex' field contains the full raw LaTeX representation.
           d. 'options' must be an array of LaTeX strings.
           e. 'correct_answer' should be the option label (A, B, C, D) or the answer text.
        3. Do NOT upload to Appwrite directly.
        4. Report the number of questions saved.
        5. If contest does not exist, create it using 'create_contest'.
        

    `,
    tools: [
        getQuestionTool,
        latexifyTool,
        savePendingQuestionTool,
        getContestListTool,
        // createContestTool,
    ],
    model: "gpt-4o",
});
