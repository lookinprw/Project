import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import api from "../../utils/axios";

function ForgotPasswordForm() {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/users/admin-reset-password", {
        username,
        newPassword,
      });

      if (response.data.success) {
        setSuccess("รีเซ็ตรหัสผ่านสำเร็จ");
        setUsername("");
        setNewPassword("");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">รีเซ็ตรหัสผ่านผู้ใช้</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-md">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

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
    </div>
  );
}

export default ForgotPasswordForm;
