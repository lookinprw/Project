// src/context/AlertContext.js
import React, { createContext, useContext, useState, useCallback } from "react";

// Create the context
const AlertContext = createContext();

// Alert types
export const ALERT_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

// Provider component
export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  // Add a new alert
  const addAlert = useCallback(
    (message, type = ALERT_TYPES.INFO, timeout = 5000) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);

      // Add the alert to the state
      setAlerts((prevAlerts) => [...prevAlerts, { id, message, type }]);

      // Set up automatic removal
      if (timeout > 0) {
        setTimeout(() => {
          removeAlert(id);
        }, timeout);
      }

      return id;
    },
    []
  );

  // Remove an alert by ID
  const removeAlert = useCallback((id) => {
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
  }, []);

  // Helper methods for specific alert types
  const showSuccess = useCallback(
    (message, timeout = 5000) => {
      return addAlert(message, ALERT_TYPES.SUCCESS, timeout);
    },
    [addAlert]
  );

  const showError = useCallback(
    (message, timeout = 5000) => {
      return addAlert(message, ALERT_TYPES.ERROR, timeout);
    },
    [addAlert]
  );

  const showWarning = useCallback(
    (message, timeout = 5000) => {
      return addAlert(message, ALERT_TYPES.WARNING, timeout);
    },
    [addAlert]
  );

  const showInfo = useCallback(
    (message, timeout = 5000) => {
      return addAlert(message, ALERT_TYPES.INFO, timeout);
    },
    [addAlert]
  );

  // Context value
  const value = {
    alerts,
    addAlert,
    removeAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
  );
};

// Custom hook to use the alert context
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

export default AlertContext;
