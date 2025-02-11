import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import api from "../../utils/axios";

export function StatusSelect({ problem, statuses = [], onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedId, setSelectedId] = useState(problem?.status_id);

  const handleChange = (e) => {
    const statusId = parseInt(e.target.value);
    if (statusId === 7) {
      setSelectedId(statusId);
      setShowWarningDialog(true);
      return;
    }

    if (statusId === 4) {
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
    setUpdating(true);
    setError("");

    try {
      const response = await api.patch(`/problems/${problem.id}/status`, {
        status_id: statusId,
        comment: commentText
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

  return (
    <div>
      <select
        value={selectedId}
        onChange={handleChange}
        disabled={updating}
        className="mt-1 block w-40 rounded-md text-sm font-medium"
        style={{ backgroundColor: problem.status_color }}
      >
        {statuses.map(status => (
          <option 
            key={status.id}
            value={status.id}
            style={{ backgroundColor: status.color }}
          >
            {status.name}
          </option>
        ))}
      </select>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {showWarningDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ยืนยันการส่งซ่อม</h3>
                <p className="mt-2 text-sm text-gray-500">คุณต้องการส่งครุภัณฑ์นี้ไปซ่อมที่ศูนย์คอมพิวเตอร์ใช่หรือไม่?</p>
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
                placeholder={selectedId === 7 ? "รายละเอียดการส่งซ่อม..." : "ระบุเหตุผล..."}
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