"use server";

import Authentication from "@/lib/user/Authentication";

const auth = new Authentication();

//Get User Current Auth
export async function getUser() {
  const user = await auth.getCurrentUser();
  return user;
}

