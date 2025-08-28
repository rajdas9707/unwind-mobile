import * as Network from "expo-network";

let isOnline = true;
let networkListeners = [];

export const checkNetworkStatus = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    const wasOnline = isOnline;
    isOnline = networkState.isConnected && networkState.isInternetReachable;

    // Notify listeners if status changed
    if (wasOnline !== isOnline) {
      networkListeners.forEach((listener) => listener(isOnline));
    }

    return isOnline;
  } catch (error) {
    console.log("Error checking network status:", error);
    return false;
  }
};

export const addNetworkListener = (listener) => {
  networkListeners.push(listener);
  return () => {
    const index = networkListeners.indexOf(listener);
    if (index > -1) {
      networkListeners.splice(index, 1);
    }
  };
};

export const getNetworkStatus = () => isOnline;

export const startNetworkMonitoring = () => {
  // Check network status every 5 seconds
  const interval = setInterval(checkNetworkStatus, 5000);

  // Initial check
  checkNetworkStatus();

  return () => clearInterval(interval);
};
