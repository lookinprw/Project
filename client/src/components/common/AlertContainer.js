// src/components/common/AlertContainer.js
import React from "react";
import { useAlert } from "../../context/AlertContext";
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AlertContainer = () => {
  const { alerts, removeAlert } = useAlert();

  const getAlertIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-400 text-green-800";
      case "error":
        return "bg-red-50 border-red-400 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-400 text-yellow-800";
      case "info":
      default:
        return "bg-blue-50 border-blue-400 text-blue-800";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-4 pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            layout
            className={`p-4 rounded-lg border-l-4 ${getAlertStyle(
              alert.type
            )} flex items-center justify-between shadow-md pointer-events-auto`}
          >
            <div className="flex items-center">
              {getAlertIcon(alert.type)}
              <span className="ml-3 font-medium text-sm">{alert.message}</span>
            </div>
            <button
              onClick={() => removeAlert(alert.id)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AlertContainer;
