// src/components/common/ConfirmationDialog.js
import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";

function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  confirmButtonClass = "bg-red-600 hover:bg-red-700",
  icon = <AlertCircle className="h-6 w-6 text-red-600" />,
  isLoading = false,
  showCommentField = false,
  confirmAction = null,
}) {
  const [commentText, setCommentText] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (showCommentField && confirmAction) {
      confirmAction(commentText);
    } else if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg mx-auto shadow-xl max-w-md w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-500"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">{icon}</div>
            <div className="w-full">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <div className="mt-2">
                {typeof message === "string" ? (
                  <p className="text-sm text-gray-500">{message}</p>
                ) : (
                  message
                )}
              </div>

              {/* Add comment field when needed */}
              {showCommentField && (
                <div className="mt-4 w-full">
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    rows="4"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="ระบุเหตุผลที่ไม่สามารถแก้ไขปัญหานี้ได้..."
                    style={{ display: "block", minHeight: "100px" }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${confirmButtonClass} ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading || (showCommentField && !commentText.trim())}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  กำลังดำเนินการ...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog;
