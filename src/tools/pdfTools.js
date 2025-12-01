import { tool } from "@openai/agents";
import { z } from "zod";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import fs from "fs";
import https from "https";

async function fetchPdfBuffer(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const data = [];
            res.on("data", (chunk) => data.push(chunk));
            res.on("end", () => resolve(Buffer.concat(data)));
            res.on("error", (err) => reject(err));
        });
    });
}

export const pdfIngestTool = tool({
    name: "pdf_ingest",
    description: "Ingests a PDF from a URL or local path and extracts text.",
    parameters: z.object({
        fileUrl: z.string().describe("URL or path to the PDF file"),
    }),
    async execute({ fileUrl }) {
        try {
            console.log(`📄 Ingesting PDF from: ${fileUrl}`);
            let dataBuffer;

            if (fileUrl.startsWith("http")) {
                dataBuffer = await fetchPdfBuffer(fileUrl);
            } else {
                dataBuffer = fs.readFileSync(fileUrl);
            }

            const data = await pdf(dataBuffer);

            // Basic page splitting (pdf-parse returns full text, but also has info. 
            // For strict page-by-page, we might need pdf-lib or just split by form feed if present, 
            // but pdf-parse gives one big text. 
            // For now, we return the full text and metadata.)

            return JSON.stringify({
                text: data.text,
                numpages: data.numpages,
                info: data.info,
            });
        } catch (err) {
            console.error("Error ingesting PDF:", err);
            return `Error ingesting PDF: ${err.message}`;
        }
    },
});
