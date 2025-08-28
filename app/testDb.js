// Database export utility for Unwind app

import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { listAllJournalEntries } from "../storage/journalDb";
import { listAllOverthinkingEntries } from "../storage/overthinkingDb";
import { listAllMistakesEntries } from "../storage/mistakesDb";
import { listAllTodos } from "../storage/todoDb";

export async function exportDatabase() {
  try {
    console.log("📊 === UNWIND APP DATABASE CONTENTS ===");
    console.log("🕐 Generated on:", new Date().toLocaleString());
    console.log("");

    // Collect and display journal entries
    try {
      const journalEntries = await listAllJournalEntries();
      console.log("📝 JOURNAL ENTRIES:", journalEntries.length, "entries");
      console.log("Journal Data:", journalEntries);
      console.log("");
    } catch (e) {
      console.log("❌ Could not read journal entries:", e);
    }

    // Collect and display overthinking entries
    try {
      const overthinkingEntries = await listAllOverthinkingEntries();
      console.log(
        "🧠 OVERTHINKING ENTRIES:",
        overthinkingEntries.length,
        "entries"
      );
      console.log("Overthinking Data:", overthinkingEntries);
      console.log("");
    } catch (e) {
      console.log("❌ Could not read overthinking entries:", e);
    }

    // Collect and display mistakes entries
    try {
      const mistakesEntries = await listAllMistakesEntries();
      console.log("⚠️ MISTAKES ENTRIES:", mistakesEntries.length, "entries");
      console.log("Mistakes Data:", mistakesEntries);
      console.log("");
    } catch (e) {
      console.log("❌ Could not read mistakes entries:", e);
    }

    // Collect and display todo entries
    try {
      const todoEntries = await listAllTodos();
      console.log("📋 TODO ENTRIES:", todoEntries.length, "entries");
      console.log("Todo Data:", todoEntries);
      console.log("");
    } catch (e) {
      console.log("❌ Could not read todo entries:", e);
    }

    console.log("📊 === END DATABASE CONTENTS ===");
    alert(
      "✅ Database contents logged to console!\n\nOpen React Native Debugger to view your data."
    );
  } catch (err) {
    console.error("❌ Error reading database:", err);
    alert("Error reading database. Please try again.");
  }
}
