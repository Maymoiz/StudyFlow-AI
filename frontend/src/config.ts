// Central place for backend URLs.
// Replace YOUR_PROJECT_REF with your actual Supabase project reference
// (found in Supabase dashboard → Project Settings → General → Reference ID)

const SUPABASE_FUNCTIONS_URL = "https://YOUR_PROJECT_REF.supabase.co/functions/v1";

export const API = {
  search: `${SUPABASE_FUNCTIONS_URL}/search`,
  createUser: `${SUPABASE_FUNCTIONS_URL}/users/createUser`,
  syncUser: `${SUPABASE_FUNCTIONS_URL}/users/syncUser`,
  getUser: (uid: string) => `${SUPABASE_FUNCTIONS_URL}/users/getUser/${uid}`,
};
