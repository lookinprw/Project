// src/components/users/ForgotPasswordForm.js
import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import api from "../../utils/axios";
import { useAlert } from "../../context/AlertContext";
import ConfirmationDialog from "../common/ConfirmationDialog";

function ForgotPasswordForm() {
  const { showSuccess, showError } = useAlert();

  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    isLoading: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !newPassword) {
      showError("กรุณากรอกรหัสผู้ใช้และรหัสผ่านใหม่");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการรีเซ็ตรหัสผ่าน",
      message: `คุณต้องการรีเซ็ตรหัสผ่านของผู้ใช้ "${username}" ใช่หรือไม่?`,
      isLoading: false,
    });
  };

  const handleConfirmReset = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.post("/users/admin-reset-password", {
        username,
        newPassword,
      });

      if (response.data.success) {
        showSuccess("รีเซ็ตรหัสผ่านสำเร็จ");
        setUsername("");
        setNewPassword("");
      }
    } catch (err) {
      showError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน"
      );
    } finally {
      setConfirmDialog((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">รีเซ็ตรหัสผ่านผู้ใช้</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รหัสผู้ใช้
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
            placeholder="กรอกรหัสผู้ใช้"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รหัสผ่านใหม่
          </label>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
            placeholder="กรอกรหัสผ่านใหม่"
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          <p className="text-sm text-gray-500">
            * เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถรีเซ็ตรหัสผ่านได้
          </p>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "กำลังดำเนินการ..." : "รีเซ็ตรหัสผ่าน"}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmReset}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isLoading={confirmDialog.isLoading}
        confirmText="รีเซ็ตรหัสผ่าน"
        cancelText="ยกเลิก"
        confirmButtonClass="bg-yellow-600 hover:bg-yellow-700"
      />
    </div>
  );
}

export default ForgotPasswordForm;
