import * as FileSystem from "expo-file-system/legacy";

const appDocsDir = `${FileSystem.documentDirectory}docs/`;

export const ensureDocsDir = async () => {
  try {
    await FileSystem.makeDirectoryAsync(appDocsDir, { intermediates: true });
  } catch (error) {
    // directory may already exist; ignore specific EEXIST-like errors
  }
};

export const saveFiles = async ({ files = [], fileLabel = "doc", docId }) => {
  try {
    await ensureDocsDir();
    const saved = [];
    for (const file of files) {
      const uri = file.uri || file.fileCopyUri || file.localUri || "";
      if (!uri) continue;
      const extIdx = uri.lastIndexOf(".");
      const ext = extIdx !== -1 ? uri.substring(extIdx) : ".jpg";
      const uniqueName = `${fileLabel}_${docId || "tmp"}_${Date.now()}${ext}`;
      const dest = `${appDocsDir}${uniqueName}`;
      // Copy using FileSystem API compatible with SDK 54
      await FileSystem.copyAsync({ from: uri, to: dest });
      saved.push(dest);
    }
    return saved;
  } catch (error) {
    console.log("error from saveFiles of storage/document/storage.js", error);
  }
};

export const deleteFile = async (fileUri) => {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (error) {
    console.log("error from deleteFile of storage/document/storage.js", error);
  }
};
