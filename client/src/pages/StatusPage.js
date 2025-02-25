import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Trash2, Edit } from "lucide-react";
import api from "../utils/axios";

// Define the IDs of original statuses that cannot be deleted
const LOCKED_STATUS_IDS = [1, 2, 3, 4, 7, 8];

function StatusPage() {
  const [statuses, setStatuses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#000000",
  });

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const response = await api.get("/status");
      setStatuses(response.data.data);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/status/${editing}`, formData);
      } else {
        await api.post("/status", formData);
      }
      fetchStatuses();
      setEditing(null);
      setFormData({ name: "", description: "", color: "#000000" });
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDelete = async (id) => {
    if (LOCKED_STATUS_IDS.includes(id)) {
      setError("ไม่สามารถลบสถานะเริ่มต้นได้");
      return;
    }

    if (window.confirm("ยืนยันการลบสถานะ?")) {
      try {
        await api.delete(`/status/${id}`);
        fetchStatuses();
      } catch (err) {
        setError(
          err.response?.data?.message || "ไม่สามารถลบสถานะที่ถูกใช้งานอยู่"
        );
      }
    }
  };

  if (loading)
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">จัดการสถานะ</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? "แก้ไขสถานะ" : "เพิ่มสถานะใหม่"}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                ชื่อสถานะ
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">คำอธิบาย</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">สี</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full rounded-md border-gray-300 h-10"
              />
            </div>

            <div className="flex justify-end space-x-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormData({
                      name: "",
                      description: "",
                      color: "#000000",
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-white bg-indigo-600 rounded-md"
              >
                {editing ? "บันทึกการแก้ไข" : "เพิ่มสถานะ"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">รายการสถานะ</h2>
            <div className="space-y-3">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <p className="font-medium">{status.name}</p>
                      <p className="text-sm text-gray-500">
                        {status.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditing(status.id);
                        setFormData({
                          name: status.name,
                          description: status.description,
                          color: status.color,
                        });
                      }}
                      className="p-2 text-gray-600 hover:text-indigo-600"
                    >
                      <Edit size={18} />
                    </button>
                    {!LOCKED_STATUS_IDS.includes(status.id) && (
                      <button
                        onClick={() => handleDelete(status.id)}
                        className="p-2 text-gray-600 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StatusPage;
