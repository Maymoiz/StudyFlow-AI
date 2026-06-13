import { sanity } from "./sanity";

export async function sanityFetch(query: string, params: any = {}) {
  return await sanity.fetch(query, params);
}
