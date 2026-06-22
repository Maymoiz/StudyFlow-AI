import { createClient } from "@sanity/client";
import type { User } from '../types/user';

export const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

// Typed fetch function
export async function getUsers(): Promise<User[]> {
  const query = `*[_type == "user"]{_id, name, email, profileImage, role}`;
  return client.fetch<User[]>(query);
}