import React, { useState, useEffect } from "react";
import { Upload, X, Search as SearchIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";

function ProblemForm({ onClose }) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    equipment_id: "",
    description: "",
    problem_type: "hardware",
  });
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  const PROBLEM_TYPES = [
    {
      value: "hardware",
      label: "ปัญหาด้านฮาร์ดแวร์",
      icon: "🔧",
      examples: [
        "เครื่องเปิดไม่ติด",
        "หน้าจอไม่แสดงผล",
        "เมาส์/คีย์บอร์ดใช้ไม่ได้",
        "พัดลมทำงานเสียงดัง",
      ],
    },
    {
      value: "software",
      label: "ปัญหาด้านซอฟแวร์",
      icon: "💻",
      examples: [
        "Windows มีปัญหา",
        "โปรแกรมไม่ทำงาน",
        "ไวรัสคอมพิวเตอร์",
        "อินเทอร์เน็ตไม่ทำงาน",
      ],
    },
    {
      value: "other",
      label: "ปัญหาอื่นๆ",
      icon: "❓",
      examples: ["ปัญหาที่ไม่เกี่ยวกับฮาร์ดแวร์และซอฟแวร์"],
    },
  ];

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
      const error = validateFile(selectedFile);
      if (error) {
        setImageError(error);
        setFile(null);
        setPreviewUrl(null);
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      setImageError("");
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
      formDataToSend.append("problem_type", formData.problem_type);

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Problem Type Selection - Primary Focus */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">เลือกประเภทของปัญหา</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROBLEM_TYPES.map((type) => (
              <div
                key={type.value}
                onClick={() =>
                  setFormData({ ...formData, problem_type: type.value })
                }
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${
                    formData.problem_type === type.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-200"
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium">{type.label}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <ul className="list-disc list-inside space-y-1">
                    {type.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Selection */}
        <div className="border-t pt-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ค้นหาครุภัณฑ์
            </label>
            <div className="relative">
              <SearchIcon
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัส, ชื่อ หรือห้อง..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกครุภัณฑ์
            </label>
            <select
              name="equipment_id"
              value={formData.equipment_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">เลือกครุภัณฑ์</option>
              {filteredEquipment.map((eq) => (
                <option key={eq.equipment_id} value={eq.equipment_id}>
                  {eq.equipment_id} - {eq.equipment_name} - ห้อง {eq.room}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description - Optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            รายละเอียดเพิ่มเติม (ถ้ามี)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="อธิบายรายละเอียดเพิ่มเติมเกี่ยวกับปัญหาที่พบ..."
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            แนบรูปภาพ (ถ้ามี)
          </label>
          <div className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="flex flex-col items-center text-center">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mx-auto h-32 w-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-0 right-0 -mr-2 -mt-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <div className="flex flex-col items-center space-y-2">
                    <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>อัพโหลดรูปภาพ</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      PNG, JPG ขนาดไม่เกิน 5MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          {imageError && (
            <p className="mt-2 text-sm text-red-600">{imageError}</p>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "กำลังส่งข้อมูล..." : "แจ้งปัญหา"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProblemForm;
