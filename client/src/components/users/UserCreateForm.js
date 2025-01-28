// components/users/UserCreateForm.js
import React, { useState } from "react";
import api from "../../utils/axios";

function UserCreateForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    student_id: "",
    password: "",
    firstname: "",
    lastname: "",
    branch: "ITD",
    role: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/users/new", formData);
      if (response.data.success) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">เพิ่มผู้ใช้ใหม่</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผู้ใช้</label>
            <input
              type="text"
              value={formData.student_id}
              onChange={(e) =>
                setFormData({ ...formData, student_id: e.target.value })
              }
              className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ชื่อ</label>
            <input
              type="text"
              value={formData.firstname}
              onChange={(e) =>
                setFormData({ ...formData, firstname: e.target.value })
              }
              className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">นามสกุล</label>
            <input
              type="text"
              value={formData.lastname}
              onChange={(e) =>
                setFormData({ ...formData, lastname: e.target.value })
              }
              className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">สาขา</label>
            <select
              value={formData.branch}
              onChange={(e) =>
                setFormData({ ...formData, branch: e.target.value })
              }
              className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ITD">เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล</option>
              <option value="MIT">นวัตกรรมสารสนเทศทางการแพทย์</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">บทบาท</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="student">นักศึกษา</option>
              <option value="equipment_assistant">ผู้ช่วยดูแลครุภัณฑ์</option>
              <option value="equipment_manager">ผู้จัดการครุภัณฑ์</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onSuccess}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserCreateForm;
