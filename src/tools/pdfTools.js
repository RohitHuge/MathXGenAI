// import OpenAI from "openai";
import { tool } from "openai/agents";
import fs from "node:fs";
import {z} from "zod";
import dotenv from "dotenv";
import {openAi} from "../../run.js";
dotenv.config();

// const openAi = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });

export const getQuestionTool = tool({
    name: "getQuestion",
    description: "You are provided with a PDF file. Extract a question from the PDF file. in the format of JSON object.",
    parameters: z.object({
        pdfUrl: z.string().describe("Public URL of the PDF file."),
    }),
    output: z.object({
        questions: z.array(
            {
                index: z.number().describe("Index of the question."),
                body: z.string().describe("Body of the question."),
                choices: z.array(z.string()).describe("Choices of the question."),
                answer: z.string().describe("Answer of the question."),
            }
        ).describe("Extracted question from the PDF file."),
    }),
    async execute({ pdfUrl }) {
        const file = await openAi.files.create({
            file: fs.createReadStream(pdfUrl),
            purpose: "input",
        });
        const fileID = file.id;
        
        const response = await openAi.responses.create({
            model: "o4-mini",
            input:[
                {
                    role:system,
                    content:[
                        {
                            type:"text",
                            text:"You are provided with a PDF file. Extract a question from the PDF file. in the format of JSON object.",
                        },
                        {
                            type:"file",
                            file:fileID,
                        }
                    ]
                }
            ]
            
        })


        const result = response.choices[0].message.content;
        return result;
    },
});