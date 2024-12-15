import React, { useState } from "react";
import api from "../../utils/axios";
import {
  PROBLEM_STATUS,
  STATUS_LABELS,
  getStatusBadgeStyle,
} from "../../utils/constants";
import { AlertCircle } from "lucide-react";

export function StatusSelect({ problem, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(problem.status);

  const handleChange = (e) => {
    const newStatus = e.target.value;
    console.log("Selected new status:", newStatus);

    if (newStatus === "cannot_fix") {
      setSelectedStatus(newStatus);
      setShowCommentModal(true);
      return;
    }

    updateStatus(newStatus);
  };

  const updateStatus = async (newStatus, statusComment = "") => {
    setUpdating(true);
    setError("");

    // Debug logging
    console.log("Update request:", {
      endpoint: `/problems/${problem.id}/status`,
      payload: {
        status: newStatus,
        comment: statusComment,
      },
    });

    try {
      const response = await api.patch(`/problems/${problem.id}/status`, {
        status: newStatus,
        comment: statusComment,
      });

      console.log("Response:", response);

      if (response.data.success) {
        if (onStatusChange) {
          onStatusChange();
        }
        setShowCommentModal(false);
        setComment("");
      }
    } catch (err) {
      console.error("Error details:", {
        status: err.response?.status,
        data: err.response?.data,
        config: err.config,
      });

      setError(err.response?.data?.message || "ไม่สามารถอัพเดทสถานะ");
      setSelectedStatus(problem.status);
    } finally {
      setUpdating(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting comment:", {
      status: "cannot_fix",
      comment,
      problemId: problem.id,
    });

    if (!comment.trim()) {
      setError("กรุณากรอกเหตุผลที่ไม่สามารถแก้ไขได้");
      return;
    }

    await updateStatus("cannot_fix", comment);
  };

  return (
    <div>
      <select
        value={selectedStatus}
        onChange={handleChange}
        disabled={updating}
        className={`mt-1 block w-40 rounded-md text-sm font-medium
                   ${getStatusBadgeStyle(selectedStatus)}`}
      >
        {/* Map status values to lowercase to match backend */}
        <option value="pending">รอดำเนินการ</option>
        <option value="in_progress">กำลังดำเนินการ</option>
        <option value="resolved">เสร็จสิ้น</option>
        <option value="cannot_fix">ไม่สามารถแก้ไขได้</option>
      </select>

      {/* Rest of the component remains the same */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">ระบุเหตุผล</h3>
              <p className="text-sm text-gray-500">
                กรุณาระบุเหตุผลที่ไม่สามารถแก้ไขได้
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleCommentSubmit}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows="4"
                placeholder="ระบุเหตุผล..."
                required
              />

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentModal(false);
                    setComment("");
                    setError("");
                    setSelectedStatus(problem.status);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
