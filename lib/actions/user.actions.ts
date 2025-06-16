"use server";
import { avatarPlaceholderUrl } from "@/constants";
import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwritConfig } from "@/lib/appwrite/config";
import { routeConfig } from "@/lib/route/config";
import { handleError, parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();
  try {
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
    return null;
  }
};

export const createAccount = async ({ fullName, email }: User) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });

  if (!accountId) {
    return parseStringify({ accountId: null, error: "Failed to send OTP" });
  }

  if (!existingUser) {
    const { databases } = await createAdminClient();
    await databases.createDocument(
      appwritConfig.databaseId,
      appwritConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
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
    return parseStringify({ sessionId: null, error: "Failed to verify OTP" });
  }
};

export const getCurrentUser = async () => {
  const client = await createSessionClient();
  if (!client) return null;
  const { databases, account } = client;
  const result = await account.get();
  const user = await databases.listDocuments(
    appwritConfig.databaseId,
    appwritConfig.usersCollectionId,
    [Query.equal("accountId", result.$id)]
  );
  if (user.total <= 0) return null;
  return parseStringify(user.documents[0]);
};

export const signOutUser = async () => {
  const client = await createSessionClient();
  if (!client) return null;
  const { account } = client;
  try {
    await account.deleteSession("current");
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    return handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);
    // User exists send OTP

    if (existingUser) {
      const accountId = await sendEmailOTP({ email });
      if (!accountId) {
        return parseStringify({ accountId: null, error: "Failed to send OTP" });
      }
      return parseStringify({ accountId });
    }
    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in user");
    return parseStringify({ accountId: null, error: "Failed to sign in user" });
  }
};
