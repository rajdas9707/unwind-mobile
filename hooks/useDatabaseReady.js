import { useContext } from "react";
import { DatabaseContext } from "../context/DatabaseProvider";

export function useDatabaseReady() {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error("useDatabaseReady must be used within a DatabaseProvider");
  }

  return {
    isReady: context.isInitialized && !context.isLoading,
    isLoading: context.isLoading,
    error: context.error,
    isInitialized: context.isInitialized,
  };
}
