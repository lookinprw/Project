// src/components/users/ForgotPasswordForm.js
import React, { useState } from "react";
import { AlertCircle, Key, User } from "lucide-react";
import api from "../../utils/axios";
import { useAlert } from "../../context/AlertContext";
import ConfirmationDialog from "../common/ConfirmationDialog";

function ForgotPasswordForm() {
  const { showSuccess, showError } = useAlert();

  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    isLoading: false,
  });

  // Check if screen is mobile on component mount and window resize
  React.useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check initially
    checkIfMobile();

    // Add listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
        <h2 className="text-lg sm:text-xl font-semibold">
          รีเซ็ตรหัสผ่านผู้ใช้
        </h2>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-6 p-3 sm:p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r text-xs sm:text-sm text-yellow-800 flex items-start">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mr-2 sm:mr-3 mt-0.5" />
          <p>
            เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถรีเซ็ตรหัสผ่านได้
            การทำงานนี้จะถูกบันทึกในประวัติการใช้งาน
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              รหัสผู้ใช้
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                required
                placeholder="กรอกรหัสผู้ใช้"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              รหัสผ่านใหม่
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                required
                placeholder="กรอกรหัสผ่านใหม่"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              *แนะนำรหัสผ่านที่จำง่าย
              เนื่องจากผู้ใช้สามารถเปลี่ยนรหัสผ่านด้วยตนเองได้ภายหลัง
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? "กำลังดำเนินการ..." : "รีเซ็ตรหัสผ่าน"}
            </button>
          </div>
        </form>
      </div>

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
