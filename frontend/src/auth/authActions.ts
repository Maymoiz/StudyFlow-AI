import { auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { syncUserToSanity } from "../sanity/syncUser";

export async function signup(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await syncUserToSanity(result.user);
  return result;
}

export async function login(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await syncUserToSanity(result.user);
  return result;
}


export async function logout() {
  return await signOut(auth);
}
