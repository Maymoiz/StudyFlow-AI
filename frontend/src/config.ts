const BACKEND_URL = "http://localhost:3000";

export const API = {
  search: `${BACKEND_URL}/api/search`,
  createUser: `${BACKEND_URL}/api/createUser`,
  syncUser: `${BACKEND_URL}/api/syncUser`,
  getUser: (uid: string) => `${BACKEND_URL}/api/getUser/${uid}`,
};