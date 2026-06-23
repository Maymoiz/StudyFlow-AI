// Firebase Cloud Functions URLs
// Region: us-central1 (default)
const FUNCTIONS_URL = "https://us-central1-moisha-studyflow-ai.cloudfunctions.net";

export const API = {
  search: `${FUNCTIONS_URL}/search`,
  createUser: `${FUNCTIONS_URL}/createUser`,
  syncUser: `${FUNCTIONS_URL}/syncUser`,
  getUser: (uid: string) => `${FUNCTIONS_URL}/getUser/${uid}`,
};