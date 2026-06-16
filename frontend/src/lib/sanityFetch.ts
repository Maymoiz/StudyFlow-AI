import { createClient } from "@sanity/client";

export const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

export async function sanityFetch(query: string, params: any = {}) {
  return client.fetch(query, params);
}
