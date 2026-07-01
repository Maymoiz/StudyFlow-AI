const SUPABASE_FUNCTIONS_URL = "https://vjnlyxmaalixijosyxvs.supabase.co/functions/v1";

export const API = {
  search: `${SUPABASE_FUNCTIONS_URL}/search`,
  studyplan: `${SUPABASE_FUNCTIONS_URL}/search`,
  createUser: `${SUPABASE_FUNCTIONS_URL}/users/createUser`,
  syncUser: `${SUPABASE_FUNCTIONS_URL}/users/syncUser`,
  getUser: (uid: string) => `${SUPABASE_FUNCTIONS_URL}/users/getUser/${uid}`,
};
