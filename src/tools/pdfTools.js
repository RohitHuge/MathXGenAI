// import OpenAI from "openai";
import { tool } from "@openai/agents";
import { supabase } from "../config.js";
// import fs from "node:fs";
// import axios from "axios";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import dotenv from "dotenv";
import { openAi } from "../config.js";
dotenv.config();

const questionSchema = z.object({
    questions: z.array(z.object({
    index: z.number().describe("Index of the question."),
    body: z.string().describe("Body of the question.(in latex format)"),
    choices: z.array(z.string()).describe("Choices of the question.(in latex format)"),
    answer: z.enum(["A", "B", "C", "D"]).describe("Answer of the question.Option"),
})).describe("Extracted question from the PDF file.")
});

// const openAi = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });

export const getQuestionTool = tool({
    name: "getQuestion",
    description: "You are provided with a PDF file. Get the question from the PDF file.",
    parameters: z.object({
        pdfUrl: z.string().describe("Public URL of the PDF file."),
        contestId: z.string().describe("ID of the contest."),
        userId: z.string().describe("ID of the user."),
    }),
    // output: z.array(
    //         {
    //             index: z.number().describe("Index of the question."),
    //             body: z.string().describe("Body of the question.(in latex format)"),
    //             choices: z.array(z.string()).describe("Choices of the question.(in latex format)"),
    //             answer: z.enum(["A", "B", "C", "D"]).describe("Answer of the question.Option"),
    //         }
    //     ).describe("Extracted question from the PDF file."),
    
    async execute({ pdfUrl, contestId, userId }) {
    const response = await openAi.responses.create({
    model: "gpt-5",
    input: [
        {
            role: "system",
            content: [
                {
                    type: "input_text",
                    text: `You are provided with a PDF file. Extract all the questions, options and its answer from the PDF file.And Convert the mathematical equation to latex format.
            when you convert to latex keep in to always use dollar delimiters:

                Inline math: use single dollar: $ ... $
                Display math: use double dollars: $$ ... $$
                Question:
                If one of the diameters of the circle $x^{2} + y^{2} - 4x + 6y - 12 = 0$ is a chord of circle S (centre (-3,2)), then the radius of S is:

                Options:
                A. $5$
                B. $\sqrt{5}$
                C. $5\sqrt{3}$
                D. $10$
                
                Answer:
                C

                
                `
                }
            ]
        },
        {
            role: "user",
            content: [
                
                {
                    type: "input_file",
                    file_url: pdfUrl,
                },
            ],
        },
    ],
    text : {format: zodTextFormat(questionSchema, "questions")},
    });
    const parsedOutput = JSON.parse(response.output_text);
    console.log(JSON.stringify(parsedOutput));
    console.log(`Detected ${parsedOutput.questions.length} questions in the PDF file.`);
    

    let successCount = 0;
    let errorCount = 0;
    for (const question of parsedOutput.questions) {
        console.log(`sending question ${question.index} for converting to latex`);

        const { data, error } = await supabase.from("pending_questions").insert({
                question_body: question.body,
                options: question.choices,
                correct_answer: question.answer,
                latex: question.body,
                contest_id: contestId,
                user_id: userId,
              });
              if (error) {
                    errorCount++;
              }else{
                successCount++;
              }

    }
    return `✅ ${successCount} questions saved successfully. ❌ ${errorCount} questions failed to save.`;
    }

});