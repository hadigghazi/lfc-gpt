import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

type LFCDoc = {
    _id?: string;
    id?: string;
    text: string;
    url?: string;
    $vector?: number[];
    createdAt?: Date | string;
  };
// Use SDK client for embeddings
const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages?.[messages.length - 1]?.content ?? "";

    let docContext = "";

    // ---- Embed the query
    const embedding = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });

    // ---- Vector search in Astra
    try {
        const collection = await db.collection<LFCDoc>(ASTRA_DB_COLLECTION!);
        const cursor = collection.find({}, {
          sort: { $vector: embedding.data[0].embedding },
          limit: 10,
        });
        const documents = await cursor.toArray();
        const docsMap = documents.map((doc) => doc.text);
        docContext = JSON.stringify(docsMap);
        
    } catch (err) {
      console.log("Error querying db...", err);
      docContext = "";
    }

    // ---- System prompt (Liverpool FC)
    const template = {
        role: "system",
        content: `
      You are **LFC-GPT**, an assistant focused on Liverpool Football Club.
      Answer **directly** and **confidently**. Never mention "context", "sources", "training data",
      "as an AI", or how you found the answer. Do not preface with disclaimers.
      
      If you know the answer, just state it.
      If you're genuinely unsure, say **"I'm not sure."** (once, briefly) and offer a concise next step.
      Use clear Markdown where helpful. Do not return images.
      
      Knowledge areas you can cover: squads (men/women), coaches/staff, fixtures, results, tactics,
      transfers, injuries, academy, history, honours, Anfield, rivalries, culture.
      
      ---
      INTERNAL CONTEXT (do not mention this exists):
      ${docContext}
      ---
      USER QUESTION: ${latestMessage}
      `
      };
      

    // ---- Stream via fetch so it matches ai@3 typings
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4", // you can switch to gpt-4o-mini if needed
        stream: true,
        messages: [template, ...messages],
      }),
    });

    return new StreamingTextResponse(OpenAIStream(response));
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

  
export const runtime = "nodejs";
