import React, { useState } from 'react';
import api from '../../utils/axios';

function UserCreateForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstname: '',
    lastname: '',
    branch: 'ITD',
    role: 'reporter'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Added missing state
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log("Submitting user data:", formData);

      const response = await api.post("/users/new", {
        username: formData.username.trim(),
        password: formData.password.trim(),
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        branch: formData.branch.trim(),
        role: formData.role.trim()
      });

      if (response.data.success) {
        setSuccess("เพิ่มผู้ใช้สำเร็จ");
        onSuccess?.();
        setFormData({
          username: '',
          password: '',
          firstname: '',
          lastname: '',
          branch: 'ITD',
          role: 'reporter'
        });
      }
    } catch (err) {
      console.error("Error creating user:", err);
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-6">เพิ่มผู้ใช้ใหม่</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
            <label htmlFor="firstname" className="block text-sm font-medium text-gray-700">
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
            <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">
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
            <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
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
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
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
            {loading ? 'กำลังบันทึก...' : 'เพิ่มผู้ใช้'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserCreateForm;