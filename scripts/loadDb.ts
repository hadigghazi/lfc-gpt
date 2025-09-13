import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from "openai";
import "dotenv/config";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

type similarityMetric = "dot_product" | "cosine" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ⬇️ Liverpool seed set (extend as you like)
const lfcData = [
  // Official
  "https://www.liverpoolfc.com/",
  "https://www.liverpoolfc.com/news",
  "https://www.liverpoolfc.com/teams/men",         // squad
  "https://www.liverpoolfc.com/teams/women",       // LFC Women
  "https://www.liverpoolfc.com/tickets",           // fixtures may render via JS (Puppeteer is fine)

  // Premier League + UEFA
  "https://www.premierleague.com/clubs/10/Liverpool/overview",
  "https://www.premierleague.com/clubs/10/Liverpool/fixtures",
  "https://www.uefa.com/uefachampionsleague/clubs/7889--liverpool/",

  // Wikipedia (club + history + seasons + honours)
  "https://en.wikipedia.org/wiki/Liverpool_F.C.",
  "https://en.wikipedia.org/wiki/History_of_Liverpool_F.C.",
  "https://en.wikipedia.org/wiki/List_of_Liverpool_F.C._seasons",
  "https://en.wikipedia.org/wiki/List_of_Liverpool_F.C._records_and_statistics",
  "https://en.wikipedia.org/wiki/List_of_Liverpool_F.C._players",
  "https://en.wikipedia.org/wiki/Anfield",

  // Stats / data profiles
  "https://fbref.com/en/squads/822bd0ba/Liverpool-Stats",  // deep team stats
  "https://www.whoscored.com/Teams/26/Show/England-Liverpool", // match stats
  "https://www.transfermarkt.com/fc-liverpool/startseite/verein/31", // transfers/valuations/squad

  // News hubs
  "https://www.bbc.com/sport/football/teams/liverpool",
  "https://www.skysports.com/liverpool",
  "https://theathletic.com/team/liverpool-fc/", // (paywalled; consider removing if scraping fails)

  // Established fansites
  "https://www.thisisanfield.com/",
  "https://www.anfield-online.co.uk/",
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const createCollection = async (similarityMetric: similarityMetric = "dot_product") => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 1536,
      metric: similarityMetric,
    },
  });
  console.log(res);
};

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  for await (const url of lfcData) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);
    for await (const chunk of chunks) {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
        encoding_format: "float",
      });
      const vector = embedding.data[0].embedding;
      const res = await collection.insertOne({
        url,
        text: chunk,
        $vector: vector,
        createdAt: new Date(),
      });
      console.log(res);
    }
  }
};

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded" },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });
  return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

createCollection().then(() => loadSampleData());
