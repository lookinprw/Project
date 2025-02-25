// src/components/users/UserCreateForm.js
import React, { useState } from "react";
import api from "../../utils/axios";
import { useAlert } from "../../context/AlertContext";
import ConfirmationDialog from "../common/ConfirmationDialog";

function UserCreateForm({ onSuccess }) {
  const { showSuccess, showError } = useAlert();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    firstname: "",
    lastname: "",
    branch: "ITD",
    role: "reporter",
  });

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

    // Basic validation
    if (
      !formData.username?.trim() ||
      !formData.password?.trim() ||
      !formData.firstname?.trim() ||
      !formData.lastname?.trim()
    ) {
      showError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการเพิ่มผู้ใช้",
      message: `คุณต้องการเพิ่มผู้ใช้ ${formData.firstname} ${formData.lastname} (${formData.username}) ใช่หรือไม่?`,
      isLoading: false,
    });
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log("Submitting user data:", formData);

      const response = await api.post("/users/new", {
        username: formData.username.trim(),
        password: formData.password.trim(),
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        branch: formData.branch.trim(),
        role: formData.role.trim(),
      });

      if (response.data.success) {
        showSuccess("เพิ่มผู้ใช้สำเร็จ");
        onSuccess?.();
        setFormData({
          username: "",
          password: "",
          firstname: "",
          lastname: "",
          branch: "ITD",
          role: "reporter",
        });
      }
    } catch (err) {
      console.error("Error creating user:", err);
      showError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้"
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-6">เพิ่มผู้ใช้ใหม่</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              รหัสผู้ใช้
            </label>
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              รหัสผ่าน
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="firstname"
              className="block text-sm font-medium text-gray-700"
            >
              ชื่อ
            </label>
            <input
              type="text"
              name="firstname"
              id="firstname"
              value={formData.firstname}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="lastname"
              className="block text-sm font-medium text-gray-700"
            >
              นามสกุล
            </label>
            <input
              type="text"
              name="lastname"
              id="lastname"
              value={formData.lastname}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="branch"
              className="block text-sm font-medium text-gray-700"
            >
              สาขา
            </label>
            <select
              id="branch"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ITD">เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล</option>
              <option value="MIT">นวัตกรรมสารสนเทศทางการแพทย์</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              บทบาท
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="reporter">ผู้แจ้งปัญหา</option>
              <option value="equipment_assistant">ผู้ช่วยดูแลครุภัณฑ์</option>
              <option value="equipment_manager">ผู้จัดการครุภัณฑ์</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmSubmit}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isLoading={confirmDialog.isLoading}
        confirmText="เพิ่มผู้ใช้"
        cancelText="ยกเลิก"
        confirmButtonClass="bg-indigo-600 hover:bg-indigo-700"
      />
    </div>
  );
}

export default UserCreateForm;
