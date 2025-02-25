// components/common/Alert.js
import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

const Alert = ({
  message,
  type = "error",
  onClose,
  autoClose = true,
  duration = 5000,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoClose && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, visible, duration, onClose]);

  if (!visible || !message) return null;

  const getAlertStyle = () => {
    switch (type) {
      case "success":
        return {
          bgColor: "bg-green-50",
          borderColor: "border-green-400",
          textColor: "text-green-800",
          icon: <CheckCircle className="h-5 w-5 text-green-400" />,
        };
      case "warning":
        return {
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-400",
          textColor: "text-yellow-800",
          icon: <AlertCircle className="h-5 w-5 text-yellow-400" />,
        };
      case "error":
      default:
        return {
          bgColor: "bg-red-50",
          borderColor: "border-red-400",
          textColor: "text-red-800",
          icon: <AlertCircle className="h-5 w-5 text-red-400" />,
        };
    }
  };

  const { bgColor, borderColor, textColor, icon } = getAlertStyle();

  return (
    <div
      className={`p-4 mb-4 rounded-lg border-l-4 ${bgColor} ${borderColor} flex items-center justify-between`}
    >
      <div className="flex items-center">
        {icon}
        <span className={`ml-2 ${textColor}`}>{message}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }}
        className="text-gray-400 hover:text-gray-500"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Alert;
