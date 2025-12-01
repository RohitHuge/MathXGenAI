import { tool } from "@openai/agents";
import { z } from "zod";

// Mocking LLM calls for now, or we could use the agent runner to call an LLM.
// Since these are tools used BY an agent, they might just be deterministic or call another service.
// However, the spec says "LLM-assisted segmentation". 
// In a real implementation, this tool might call OpenAI API directly or be a "function" that the agent uses to structure data.
// For this implementation, we will simulate the segmentation to show the flow.

export const questionSegmenterTool = tool({
    name: "question_segmenter",
    description: "Segments raw text into structured questions.",
    parameters: z.object({
        rawText: z.string().describe("The raw text extracted from the PDF"),
    }),
    async execute({ rawText }) {
        console.log("✂️ Segmenting questions...");

        // SIMULATION: Splitting by "Question" or numbers
        // In reality, this would be an LLM call.

        const mockQuestions = [
            {
                index: 1,
                title: "Question 1",
                body: "What is the value of pi?",
                choices: ["3.14", "2.14", "4.14", "None"],
                answer: "3.14",
                marks: 5
            },
            {
                index: 2,
                title: "Question 2",
                body: "Solve for x: 2x + 5 = 15",
                choices: ["5", "10", "2", "0"],
                answer: "5",
                marks: 5
            }
        ];

        return JSON.stringify(mockQuestions);
    },
});

export const latexifyTool = tool({
    name: "latexify_text",
    description: "Converts mathematical text into LaTeX format.",
    parameters: z.object({
        text: z.string(),
    }),
    async execute({ text }) {
        console.log("✨ Latexifying text...");

        // SIMULATION
        // "2x + 5 = 15" -> "$2x + 5 = 15$"

        const latexified = text.replace(/(\d+[a-z]|[a-z]\^2|[=+\-*/])/g, "$$$&$$"); // Very dumb regex for demo

        return JSON.stringify({
            original: text,
            latex: latexified,
            snippets: [latexified]
        });
    },
});
