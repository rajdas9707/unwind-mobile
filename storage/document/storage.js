import * as FileSystem from "expo-file-system";
import { openDB } from "./db";

export const saveDocument = async (docName, uri, fileLabel, tags, category) => {

    try {
     // ensure folder exists
  const appDir = `${FileSystem.documentDirectory}docs/`;
  await FileSystem.makeDirectoryAsync(appDir, { intermediates: true });

  // make file unique
  const uniqueId = Date.now().toString();
  const ext = uri.includes(".") ? uri.substring(uri.lastIndexOf(".")) : "";
  const uniqueFileName = `${fileLabel}_${uniqueId}${ext}`;
  const dest = `${appDir}${uniqueFileName}`;

  await FileSystem.copyAsync({ from: uri, to: dest });
  const now = new Date().toISOString();

  // check if document exists
  const existing = await db.getFirstAsync("SELECT * FROM documents WHERE docName = ?", [docName]);

  if (!existing) {
    // new document
    const filesArray = [{ name: fileLabel, uri: dest }];
    await db.runAsync(
      "INSERT INTO documents (docName, files, tags, category, createdAt) VALUES (?, ?, ?, ?, ?)",
      [docName, JSON.stringify(filesArray), tags, category, now]
    );
  } else {
    // update existing document → add new file
    const oldFiles = existing.files ? JSON.parse(existing.files) : [];
    const newFiles = [...oldFiles, { name: fileLabel, uri: dest }];
    await db.runAsync("UPDATE documents SET files = ? WHERE id = ?", [
      JSON.stringify(newFiles),
      existing.id,
    ]);
  }

  return dest;
     } catch (error) {
        console.log("error from saveDocumnt func of documnet/storage.js",error)
    }
};

export const getDocuments = async () => {

  try {
   const db = await openDB();
  const docs = await db.getAllAsync("SELECT * FROM documents ORDER BY createdAt DESC");

  return docs.map((doc) => ({
    ...doc,
    files: doc.files ? JSON.parse(doc.files) : [],
  }));
  } catch (error) {
     console.log("error from getDocuments func of documnet/storage.js",error)
  }

};

export const deleteDocument = async (id) => {

  try {
     const db = await openDB();
  await db.runAsync("DELETE FROM documents WHERE id = ?", [id]);
  } catch (error) {
      console.log("error from deleteDocument func of documnet/storage.js",error)
  }
 
};
