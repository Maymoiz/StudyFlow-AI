import { createClient } from "@sanity/client";

export const client = createClient({
  projectId: "gF6MOm1Dm",
  dataset: "production",
  apiVersion: "2023-01-01",
  token: process.env.SANITY_TOKEN,
  useCdn: false
});
