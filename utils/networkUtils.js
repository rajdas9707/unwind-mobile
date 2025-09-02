import { useState, useEffect } from "react";
import * as Network from "expo-network";

/**
 * Custom hook to monitor network status
 * Returns a boolean: true if online, false if offline
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Function to check network status
    const checkStatus = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        if (isMounted) {
          setIsOnline(networkState.isConnected && networkState.isInternetReachable);
        }
      } catch (error) {
        console.log("Error checking network status:", error);
        if (isMounted) setIsOnline(false);
      }
    };

    // Initial check
    checkStatus();

    // Subscribe to network changes
    const subscription = Network.addNetworkStateListener((networkState) => {
      if (isMounted) {
        setIsOnline(networkState.isConnected && networkState.isInternetReachable);
      }
    });

    // Cleanup
    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return isOnline;
};
