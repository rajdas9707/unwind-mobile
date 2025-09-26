export const migrate = async (db) => {
  try {
    console.log("🔄 Starting v2 migration...");
    
    // Add name column to ideas table
    await db.execAsync(`
      ALTER TABLE ideas ADD COLUMN name TEXT DEFAULT '';
    `);
    
    console.log("✅ v2 migration completed - Added name field to ideas table");
  } catch (error) {
    console.error("❌ Error in v2 migration:", error);
    throw error;
  }
};
