"use server";

import { cookies } from "next/headers";
import { Account, Avatars, Client, Databases, Storage } from "node-appwrite";
import { appwritConfig } from "./config";

export const createSessionClient = async () => {
  const client = new Client()
    .setEndpoint(appwritConfig.endpointUrl)
    .setProject(appwritConfig.projectId);

  const session = (await cookies()).get("appwrite-session");
  if (!session || !session.value) return null;

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
};

export const createAdminClient = async () => {
  const client = new Client()
    .setEndpoint(appwritConfig.endpointUrl)
    .setProject(appwritConfig.projectId)
    .setKey(appwritConfig.secretKey);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get avatars() {
      return new Avatars(client);
    },
  };
};
