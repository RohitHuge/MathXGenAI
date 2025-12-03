import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await client.responses.create({
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
                    file_url: "https://res.cloudinary.com/ddvolnmof/image/upload/v1764768490/mathx_uploads/fwo6b9ysvwh6qzk0cbhx.pdf",
                },
            ],
        },
    ],
});

console.log(response.output_text);