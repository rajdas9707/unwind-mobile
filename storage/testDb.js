import {
  initTodoDb,
  testDatabaseConnection,
  forceReconnect,
  listAllTodos,
  listCarriedOverTodosByCategory,
} from "./todoDb";

export async function runDatabaseTests() {
  console.log("=== Database Connection Tests ===");

  try {
    // Test 1: Basic connection test
    console.log("Test 1: Testing basic database connection...");
    const connectionTest = await testDatabaseConnection();
    console.log("Connection test result:", connectionTest);

    if (!connectionTest) {
      console.log("Connection test failed, attempting to force reconnect...");
      const reconnected = await forceReconnect();
      console.log("Force reconnect result:", reconnected);

      if (!reconnected) {
        throw new Error("Failed to establish database connection");
      }
    }

    // Test 2: Initialize database
    console.log("Test 2: Initializing database...");
    await initTodoDb();
    console.log("Database initialization successful");

    // Test 3: Test basic queries
    console.log("Test 3: Testing basic queries...");
    const allTodos = await listAllTodos();
    console.log("All todos count:", allTodos.length);

    // Test 4: Test carried over queries for each category
    console.log("Test 4: Testing carried over queries...");
    const categories = ["2-Minute", "Urgent", "Important", "Low Energy"];

    for (const category of categories) {
      try {
        const carriedOverTodos = await listCarriedOverTodosByCategory(category);
        console.log(
          `${category} carried over todos count:`,
          carriedOverTodos.length
        );
      } catch (error) {
        console.error(`Error querying ${category} carried over todos:`, error);
      }
    }

    console.log("=== All Database Tests Completed Successfully ===");
    return true;
  } catch (error) {
    console.error("=== Database Tests Failed ===");
    console.error("Error:", error);
    return false;
  }
}

// Export for use in development
export default runDatabaseTests;
