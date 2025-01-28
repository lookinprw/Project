import React, { useState } from "react";
import api from "../../utils/axios";
import { AlertCircle } from "lucide-react";

export function StatusSelect({ problem, statuses = [], onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(problem.status_id);

  const handleChange = async (e) => {
    const newStatusId = parseInt(e.target.value);
    const status = statuses.find((s) => s.id === newStatusId);

    if (status?.name === "referred_to_cc") {
      setSelectedStatus(newStatusId);
      setShowWarningDialog(true);
      return;
    }

    if (status?.name === "cannot_fix") {
      setSelectedStatus(newStatusId);
      setShowCommentModal(true);
      return;
    }

    updateStatus(newStatusId);
  };

  const handleWarningConfirm = () => {
    setShowWarningDialog(false);
    setComment("ส่งซ่อมที่ศูนย์คอมพิวเตอร์");
    setShowCommentModal(true);
  };

  const updateStatus = async (statusId, comment = "") => {
    setUpdating(true);
    setError("");

    try {
      const response = await api.patch(`/problems/${problem.id}/status`, {
        status_id: statusId,
        comment,
      });

      if (response.data.success) {
        onStatusChange();
        setShowWarningDialog(false);
        setShowCommentModal(false);
        setComment("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "ไม่สามารถอัพเดทสถานะ");
    } finally {
      setUpdating(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("กรุณากรอกเหตุผล");
      return;
    }
    await updateStatus(selectedStatus, comment);
  };

  const getModalTitle = (statusId) => {
    const status = statuses.find((s) => s.id === statusId);
    return status?.name === "referred_to_cc"
      ? "รายละเอียดการส่งซ่อม"
      : "ระบุเหตุผล";
  };

  const getModalDescription = (statusId) => {
    const status = statuses.find((s) => s.id === statusId);
    return status?.name === "referred_to_cc"
      ? "กรุณาระบุรายละเอียดการส่งซ่อมที่ศูนย์คอมพิวเตอร์"
      : "กรุณาระบุเหตุผลที่ไม่สามารถแก้ไขได้";
  };

  return (
    <div>
      <select
        value={selectedStatus}
        onChange={handleChange}
        disabled={updating}
        className="mt-1 block w-40 rounded-md text-sm font-medium"
        style={{ backgroundColor: problem.status_color }}
      >
        {statuses.map((status) => (
          <option
            key={status.id}
            value={status.id}
            style={{ backgroundColor: status.color }}
          >
            {status.name === "referred_to_cc"
              ? "กำลังส่งไปศูนย์คอม"
              : status.name}
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
                  setSelectedStatus(problem.status_id);
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
                {getModalTitle(selectedStatus)}
              </h3>
              <p className="text-sm text-gray-500">
                {getModalDescription(selectedStatus)}
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
                  statuses.find((s) => s.id === selectedStatus)?.name ===
                  "referred_to_cc"
                    ? "รายละเอียดการส่งซ่อม..."
                    : "ระบุเหตุผล..."
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
                    setSelectedStatus(problem.status_id);
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
