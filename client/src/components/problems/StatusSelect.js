import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";

export function StatusSelect({ problem, statuses = [], onStatusChange }) {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedId, setSelectedId] = useState(problem?.status_id);

  // Filter statuses for equipment assistant
  const filteredStatuses = statuses.filter((status) => {
    if (user?.role === "equipment_assistant") {
      // Exclude status IDs 7 (กำลังส่งไปศูนย์คอม) and 8 (ชำรุดเสียหาย)
      return ![7, 8].includes(status.id);
    }
    return true;
  });

  const handleChange = (e) => {
    const statusId = parseInt(e.target.value);

    // If not assigned and trying to change status
    if (!problem.assigned_to && problem.status_id === 1) {
      setError("กรุณารับงานก่อนเปลี่ยนสถานะ");
      setSelectedId(problem.status_id);
      return;
    }

    // Special status handling
    if (statusId === 7) {
      // Computer Center
      setSelectedId(statusId);
      setShowWarningDialog(true);
      return;
    }

    if (statusId === 4) {
      // Cannot Fix
      setSelectedId(statusId);
      setShowCommentModal(true);
      return;
    }

    updateStatus(statusId);
  };

  const handleWarningConfirm = () => {
    setShowWarningDialog(false);
    setComment("ส่งซ่อมที่ศูนย์คอมพิวเตอร์");
    setShowCommentModal(true);
  };

  const updateStatus = async (statusId, commentText = "") => {
    if (!problem.assigned_to && problem.status_id === 1) {
      setError("กรุณารับงานก่อนเปลี่ยนสถานะ");
      return;
    }

    setUpdating(true);
    setError("");

    try {
      const response = await api.patch(`/problems/${problem.id}/status`, {
        status_id: statusId,
        comment: commentText,
      });

      if (response.data.success) {
        onStatusChange();
        setShowCommentModal(false);
        setShowWarningDialog(false);
        setComment("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "ไม่สามารถอัพเดทสถานะ");
    } finally {
      setUpdating(false);
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("กรุณากรอกเหตุผล");
      return;
    }
    updateStatus(selectedId, comment);
  };

  if (!problem) return null;

  // Find current status object
  const currentStatus =
    statuses.find((s) => s.id === parseInt(selectedId)) || {};

  return (
    <div>
      {/* Improved select with better color pairing */}
      <div className="flex flex-col items-start">
        <select
          value={selectedId}
          onChange={handleChange}
          disabled={
            updating || (!problem.assigned_to && problem.status_id === 1)
          }
          className={`block w-40 px-2 py-1 text-sm font-medium border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
            !problem.assigned_to && problem.status_id === 1
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          style={{
            backgroundColor: "white",
            color: "#1F2937",
            borderColor: currentStatus.color || "#D1D5DB",
          }}
        >
          {filteredStatuses.map((status) => (
            <option
              key={status.id}
              value={status.id}
              style={{ backgroundColor: "white", color: "#1F2937" }}
            >
              {status.name}
            </option>
          ))}
        </select>

        {/* Small status indicator with dot to show color */}
        <div className="flex items-center mt-1 ml-1">
          <div
            className="w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: currentStatus.color }}
          ></div>
          <span className="text-xs text-gray-500">{currentStatus.name}</span>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600 bg-red-50 p-1 rounded">
          {error}
        </p>
      )}

      {showWarningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  ยืนยันการส่งซ่อม
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  คุณต้องการส่งครุภัณฑ์นี้ไปซ่อมที่ศูนย์คอมพิวเตอร์ใช่หรือไม่?
                </p>
                <ul className="mt-2 text-sm text-gray-500 list-disc ml-4 space-y-1">
                  <li>ตรวจสอบปัญหาเบื้องต้นแล้ว</li>
                  <li>ไม่สามารถซ่อมได้ด้วยทีมงานภายใน</li>
                  <li>มีการบันทึกรายละเอียดปัญหาครบถ้วน</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowWarningDialog(false);
                  setSelectedId(problem.status_id);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleWarningConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                ยืนยันการส่งซ่อม
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedId === 7 ? "รายละเอียดการส่งซ่อม" : "ระบุเหตุผล"}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedId === 7
                  ? "กรุณาระบุรายละเอียดการส่งซ่อมที่ศูนย์คอมพิวเตอร์"
                  : "กรุณาระบุเหตุผลที่ไม่สามารถแก้ไขได้"}
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
                placeholder={
                  selectedId === 7 ? "รายละเอียดการส่งซ่อม..." : "ระบุเหตุผล..."
                }
                required
              />

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentModal(false);
                    setComment("");
                    setError("");
                    setSelectedId(problem.status_id);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
