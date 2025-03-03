import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Trash2, Edit } from "lucide-react";
import api from "../utils/axios";
import { StatusBadge } from "../components/common/StatusBadge";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Function to show status preview with consistent styling
  const renderStatusPreview = (color) => {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-xs sm:text-sm text-gray-500">ตัวอย่างการแสดงผล:</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-4">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border"
            style={{ borderColor: color }}
          >
            <span
              className="w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: color }}
            ></span>
            {formData.name || "ตัวอย่างสถานะ"}
          </span>

          <div className="flex items-center">
            <select
              className="block w-40 px-2 py-1 text-xs sm:text-sm font-medium border rounded-md"
              style={{
                backgroundColor: "white",
                color: "#1F2937",
                borderColor: color,
              }}
              disabled
            >
              <option>{formData.name || "ตัวอย่างสถานะ"}</option>
            </select>
          </div>
        </div>
      </div>
    );
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
      <div className="p-3 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">จัดการสถานะ</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
              {editing ? "แก้ไขสถานะ" : "เพิ่มสถานะใหม่"}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  ชื่อสถานะ
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  คำอธิบาย
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  สี
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-full rounded-md border-gray-300 h-8 sm:h-10"
                />

                {/* Status preview */}
                {renderStatusPreview(formData.color)}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:space-x-3 pt-2">
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
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md text-xs sm:text-sm w-full sm:w-auto"
                  >
                    ยกเลิก
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-indigo-600 rounded-md text-xs sm:text-sm w-full sm:w-auto"
                >
                  {editing ? "บันทึกการแก้ไข" : "เพิ่มสถานะ"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                รายการสถานะ
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between p-2 sm:p-3 border rounded-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:space-x-3">
                      {/* Use our consistent StatusBadge component */}
                      <StatusBadge status={status} />

                      <div className="sm:ml-2">
                        <p className="text-xs sm:text-sm text-gray-500">
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
                        className="p-1.5 sm:p-2 text-gray-600 hover:text-indigo-600"
                      >
                        <Edit size={isMobile ? 16 : 18} />
                      </button>
                      {!LOCKED_STATUS_IDS.includes(status.id) && (
                        <button
                          onClick={() => handleDelete(status.id)}
                          className="p-1.5 sm:p-2 text-gray-600 hover:text-red-600"
                        >
                          <Trash2 size={isMobile ? 16 : 18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StatusPage;
