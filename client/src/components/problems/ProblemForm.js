import React, { useState, useEffect } from "react";
import { Upload, X, Search as SearchIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";

function ProblemForm({ onClose }) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    equipment_id: "",
    description: "",
  });
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEquipment, setFilteredEquipment] = useState([]);

  // Fixed filtering logic with proper null checks
  useEffect(() => {
    if (!Array.isArray(equipment)) return;

    const filtered = equipment.filter((eq) => {
      if (!eq) return false;

      const query = searchQuery.toLowerCase();
      const equipmentId = String(eq.equipment_id || "").toLowerCase();
      const name = String(eq.equipment_name || "").toLowerCase();
      const room = String(eq.room || "").toLowerCase();

      return (
        equipmentId.includes(query) ||
        name.includes(query) ||
        room.includes(query)
      );
    });

    setFilteredEquipment(filtered);
  }, [searchQuery, equipment]);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await api.get("/equipment");
        if (response.data.success) {
          setEquipment(response.data.data || []);
          setFilteredEquipment(response.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching equipment:", error);
        setError("ไม่สามารถดึงข้อมูลครุภัณฑ์ได้");
        setEquipment([]);
        setFilteredEquipment([]);
      }
    };

    fetchEquipment();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "equipment_id") {
      const selected = equipment.find((eq) => eq.equipment_id === value);
      setSelectedEquipment(selected || null);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user makes changes
    if (error) setError("");
  };

  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

    if (file.size > maxSize) {
      return "ไฟล์ต้องมีขนาดไม่เกิน 5MB";
    }

    if (!allowedTypes.includes(file.type)) {
      return "รองรับไฟล์รูปภาพ JPG และ PNG เท่านั้น";
    }

    return null;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileError = validateFile(selectedFile);
      if (fileError) {
        setError(fileError);
        setFile(null);
        setPreview(null);
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      setError("");
    }
  };

  const validateForm = () => {
    if (!formData.equipment_id) {
      setError("กรุณาเลือกครุภัณฑ์");
      return false;
    }

    if (!formData.description.trim()) {
      setError("กรุณากรอกรายละเอียดปัญหา");
      return false;
    }

    if (formData.description.length < 10) {
      setError("กรุณากรอกรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("equipment_id", formData.equipment_id);
      formDataToSend.append("description", formData.description);

      if (file) {
        formDataToSend.append("image", file);
      }

      const response = await api.post("/problems", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        onClose();
      } else {
        setError(response.data.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      }
    } catch (error) {
      console.error("Error submitting problem:", error);
      if (error.response?.status === 401) {
        setError("กรุณาเข้าสู่ระบบใหม่");
        // Handle unauthorized access - redirect to login or refresh token
      } else if (error.response?.status === 413) {
        setError("ไฟล์มีขนาดใหญ่เกินไป");
      } else {
        setError(
          error.response?.data?.message || "เกิดข้อผิดพลาดในการส่งข้อมูล"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">แจ้งปัญหาครุภัณฑ์</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ค้นหาครุภัณฑ์
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัส, ชื่อ หรือห้อง..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              เลือกครุภัณฑ์
            </label>
            <select
              name="equipment_id"
              value={formData.equipment_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">เลือกครุภัณฑ์</option>
              {filteredEquipment.map((eq) => (
                <option key={eq.equipment_id} value={eq.equipment_id}>
                  {eq.equipment_id} - {eq.equipment_name} - ห้อง {eq.room}
                </option>
              ))}
            </select>
            {filteredEquipment.length === 0 && searchQuery && (
              <p className="mt-1 text-sm text-gray-500">
                ไม่พบครุภัณฑ์ที่ตรงกับการค้นหา
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              จำนวนครุภัณฑ์ที่พบ: {filteredEquipment.length} รายการ
            </p>
          </div>

          {selectedEquipment && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-700 mb-2">
                รายละเอียดครุภัณฑ์
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">รหัสครุภัณฑ์</p>
                  <p className="font-medium">
                    {selectedEquipment.equipment_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ชื่อ</p>
                  <p className="font-medium">
                    {selectedEquipment.equipment_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ประเภท</p>
                  <p className="font-medium">{selectedEquipment.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ห้อง</p>
                  <p className="font-medium">{selectedEquipment.room}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              รายละเอียดปัญหา
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              minLength={10}
              placeholder="กรุณาระบุรายละเอียดของปัญหาที่พบ"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              แนบรูปภาพ (ถ้ามี)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="mx-auto h-32 w-auto"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-0 right-0 -mr-2 -mt-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span>อัพโหลดรูปภาพ</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG ขนาดไม่เกิน 5MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งข้อมูล"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProblemForm;
