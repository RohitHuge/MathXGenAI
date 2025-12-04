import { tool } from "@openai/agents";
import { z } from "zod";
import { openAi } from "../config.js";
// import openai from "../openai.js";
// import dotenv from "dotenv";
// dotenv.config();


// Mocking LLM calls for now, or we could use the agent runner to call an LLM.
// Since these are tools used BY an agent, they might just be deterministic or call another service.
// However, the spec says "LLM-assisted segmentation". 
// In a real implementation, this tool might call OpenAI API directly or be a "function" that the agent uses to structure data.
// For this implementation, we will simulate the segmentation to show the flow.

// export const questionSegmenterTool = tool({
//     name: "question_segmenter",
//     description: "Segments raw text into structured questions.",
//     parameters: z.object({
//         rawText: z.string().describe("The raw text extracted from the PDF"),
//     }),
//     async execute({ rawText }) {
//         console.log("✂️ Segmenting questions...");

//         // SIMULATION: Splitting by "Question" or numbers
//         // In reality, this would be an LLM call.

//         const mockQuestions = [
//             {
//                 index: 1,
//                 title: "Question 1",
//                 body: "What is the value of pi?",
//                 choices: ["3.14", "2.14", "4.14", "None"],
//                 answer: "3.14",
//                 marks: 5
//             },
//             {
//                 index: 2,
//                 title: "Question 2",
//                 body: "Solve for x: 2x + 5 = 15",
//                 choices: ["5", "10", "2", "0"],
//                 answer: "5",
//                 marks: 5
//             }
//         ];

//         return JSON.stringify(mockQuestions);
//     },
// });

// export const questionUploadTool = tool({
//     name: "question_upload",
//     description: "Uploads a question to a specific contest.",
//     parameters: z.object({
//         questions: z.array(
//             z.object({
//                 index: z.number().describe("Index of the question."),
//                 body: z.string().describe("Body of the question."),
//                 choices: z.array(z.string()).describe("Choices of the question."),
//                 answer: z.string().describe("Answer of the question."),
//             })
//         ).describe("Extracted question from the PDF file."),
//         contestId: z.string().describe("ID of the contest."),
//     }),
//     async execute({ questions, contestId }) {
//         console.log(`✨ Uploading question to contest...${contestId}`);


//         for (const question of questions) {
//             console.log(`sending question ${question.index} for converting to latex`);

//             const latexQuestion = await openAi.responses.parse({
//                 model: "gpt-4o",
//                 input: [
//                     {
//                         role: "system",
//                         content: "You are provided with a question. Convert the question to latex format."
//                     },
//                     {
//                         role: "user",
//                         content: question
//                     }
//                 ]
//             });

//             console.log(`question ${question.index} converted to latex`);
//         }



//     }
// });

export const latexifyTool = tool({
    name: "latexify",
    description: "Converts question body and options to LaTeX format.",
    parameters: z.object({
        body: z.string().describe("The question body text."),
        options: z.array(z.string()).describe("The options array."),
    }),
    async execute({ body, options }) {
        console.log("📝 Converting to LaTeX...");

        try {
            const response = await openAi.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a LaTeX expert. Convert math expressions to LaTeX. Return a JSON object with 'body' (string) and 'options' (array of strings) fields." },
                    { role: "user", content: `Question: ${body}\nOptions: ${JSON.stringify(options)}` }
                ],
                response_format: { type: "json_object" }
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error("Error converting to LaTeX:", error);
            // Fallback: return original
            return JSON.stringify({ body, options });
        }
    }
});


