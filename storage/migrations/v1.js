import { initBuyItemsTable } from "../buyItems/db";
import { initDocumentsTable } from "../document/db";
import { initIdeasTable } from "../idea/db";
import { initJournalsTable } from "../journal/db";
import { initMistakesTable } from "../mistakes/db";
import { initOverthinkingsTable } from "../overthinking/db";
import { initTodosTable } from "../todo/db";
import { initTopicsTable } from "../topic/db";
import { initwaterRemindersTable } from "../waterreminder/db";

export const migrate = async (db) => {
  try {
    // Initialize all tables
    await initBuyItemsTable(db);
    await initDocumentsTable(db);
    await initIdeasTable(db);
    await initJournalsTable(db);
    await initMistakesTable(db);
    await initOverthinkingsTable(db);
    await initTopicsTable(db);
    await initwaterRemindersTable(db);
    await initTodosTable(db);

    console.log("✅ All tables initialized");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
  }
};
