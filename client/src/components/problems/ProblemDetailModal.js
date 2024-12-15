// src/components/problems/ProblemDetailModal.js
import React from "react";
import { X } from "lucide-react";

function ProblemDetailModal({ problem, onClose, onStatusChange }) {
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusOptions = [
    { value: "pending", label: "รอดำเนินการ" },
    { value: "in_progress", label: "กำลังดำเนินการ" },
    { value: "resolved", label: "แก้ไขแล้ว" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">รายละเอียดปัญหา</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  อุปกรณ์
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {problem.equipment}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  รหัสครุภัณฑ์
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {problem.equipmentId}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ห้อง
                </label>
                <p className="mt-1 text-sm text-gray-900">{problem.room}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  วันที่แจ้ง
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(problem.createdAt).toLocaleDateString("th-TH")}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                รายละเอียดปัญหา
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {problem.description}
              </p>
            </div>

            {problem.imageUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  รูปภาพ
                </label>
                <img
                  src={problem.imageUrl}
                  alt="Problem evidence"
                  className="mt-1 max-h-48 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                สถานะ
              </label>
              <select
                value={problem.status}
                onChange={(e) => onStatusChange(problem.id, e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProblemDetailModal;
