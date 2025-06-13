"use server";
import { createAdminClient } from "@/lib/appwrite";
import { appwritConfig } from "@/lib/appwrite/config";
import { routeConfig } from "@/lib/route/config";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { ID, Query } from "node-appwrite";
type User = {
  fullName: string;
  email: string;
};

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();
  const result = await databases.listDocuments(
    appwritConfig.databaseId,
    appwritConfig.usersCollectionId,
    [Query.equal("email", [email])]
  );
  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.error(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();
  try {
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({ fullName, email }: User) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });

  if (!accountId) throw new Error("Failed to send OTP");

  if (!existingUser) {
    const { databases } = await createAdminClient();
    await databases.createDocument(
      appwritConfig.databaseId,
      appwritConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar:
          "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png",
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};

export const verifySecret = async (accountId: string, password: string) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createSession(accountId, password);
    (await cookies()).set("appwrite-session", session.secret, {
      path: routeConfig.applicationRedirectRoute,
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};
