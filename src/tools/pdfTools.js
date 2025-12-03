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
    const response = await openAi.responses.create({
    model: "gpt-5",
    input: [
        {
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: "Analyze the pdf and give the question in the pdf in the form of json array",
                },
                {
                    type: "input_file",
                    file_url: pdfUrl,
                },
            ],
        },
    ],
    });

    return response.output;
    }

});