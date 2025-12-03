// import OpenAI from "openai";
import { tool } from "@openai/agents";
// import fs from "node:fs";
import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";
import { openAi } from "../config.js";
dotenv.config();

// const openAi = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });

export const getQuestionTool = tool({
    name: "getQuestion",
    description: "You are provided with a PDF file. Get the question from the PDF file.",
    parameters: z.object({
        pdfUrl: z.string().describe("Public URL of the PDF file."),
    }),
    output: z.array(
            {
                index: z.number().describe("Index of the question."),
                body: z.string().describe("Body of the question.(in latex format)"),
                choices: z.array(z.string()).describe("Choices of the question.(in latex format)"),
                answer: z.enum(["A", "B", "C", "D"]).describe("Answer of the question.Option"),
            }
        ).describe("Extracted question from the PDF file."),
    
    async execute({ pdfUrl }) {
    const response = await openAi.responses.create({
    model: "gpt-5",
    input: [
        {
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: "You are provided with a PDF file. Extract a question from the PDF file. Extrcact the question, options and its answer.And Convert the mathematical equation to latex format.",
                },
                {
                    type: "input_file",
                    file_url: pdfUrl,
                },
            ],
        },
    ],
    });
     console.log(JSON.stringify(response.output));
    return response.output;
    }

});