"use server";

import { createAdminClient } from "@/lib/appwrite";
import {
  constructFileUrl,
  getFileType,
  handleError,
  parseStringify,
} from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { ID, Models, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { appwritConfig } from "../appwrite/config";
import { getCurrentUser } from "./user.actions";

export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    const inputFile = InputFile.fromBuffer(file, file.name);
    const bucketFile = await storage.createFile(
      appwritConfig.bucketId,
      ID.unique(),
      inputFile
    );

    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [],
      bucketFileId: bucketFile.$id,
    };

    const newFile = await databases
      .createDocument(
        appwritConfig.databaseId,
        appwritConfig.filesCollectionId,
        ID.unique(),
        fileDocument
      )
      .catch(async (error: unknown) => {
        await storage.deleteFile(appwritConfig.bucketId, bucketFile.$id);
        return handleError(error, "Failed to create file");
      });
    revalidatePath(path);
    return parseStringify(newFile);
  } catch (error) {
    return handleError(error, "Failed to upload file");
  }
};
const createQueries = (currentUser: Models.Document) => {
  const queries = [
    Query.or([
      Query.equal("owner", [currentUser.$id]),
      Query.contains("users", [currentUser.email]),
    ]),
  ];
  return queries;
};
export const getFiles = async () => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return handleError("Error", "User not found");

    const queries = createQueries(currentUser);

    const files = await databases.listDocuments(
      appwritConfig.databaseId,
      appwritConfig.filesCollectionId,
      queries
    );

    return parseStringify(files);
  } catch (error) {
    return handleError(error, "Failed to get files");
  }
};
