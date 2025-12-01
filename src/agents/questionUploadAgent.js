import { Agent } from "@openai/agents";
import { pdfIngestTool } from "../tools/pdfTools.js";
import { questionSegmenterTool, latexifyTool } from "../tools/questionTools.js";
import { createContestTool, uploadQuestionTool } from "../appwriteTool.js";

export const questionUploadAgent = new Agent({
    name: "Question Upload Agent",
    instructions: `
        You are the Question Upload Specialist.
        Your goal is to process a PDF, extract questions, and upload them to Appwrite.
        
        Workflow:
        1. Ingest the PDF using 'pdf_ingest'.
        2. Segment the text into questions using 'question_segmenter'.
        3. For each question:
           a. Convert to LaTeX using 'latexify_text'.
           b. (In a real scenario, you would ask for approval here via Socket.IO, but for now, proceed).
           c. Upload the question using 'upload_question'.
           
        If a contest ID is not provided, create a new contest first using 'create_contest'.
    `,
    tools: [
        pdfIngestTool,
        questionSegmenterTool,
        latexifyTool,
        createContestTool,
        uploadQuestionTool
    ],
    model: "gpt-4o",
});
