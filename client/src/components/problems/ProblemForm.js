import React, { useState, useEffect } from "react";
import {
  Upload,
  X,
  Search as SearchIcon,
  AlertTriangle,
  HardDrive,
  FileCode,
  Image,
  Send,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import api from "../../utils/axios";
import ConfirmationDialog from "../common/ConfirmationDialog";

function ProblemForm({ problem = null, onClose }) {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError, showWarning } = useAlert();
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({
    equipment_id: "",
    description: "",
    problem_type: "hardware",
  });
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [similarProblems, setSimilarProblems] = useState([]);
  const [showSimilarProblems, setShowSimilarProblems] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    isLoading: false,
  });

  // Check if screen is mobile on component mount and window resize
  useEffect(() => {
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

  // Removed "other" from problem types as requested
  const PROBLEM_TYPES = [
    {
      value: "hardware",
      label: "ปัญหาด้านฮาร์ดแวร์",
      icon: <HardDrive className="h-5 w-5 text-indigo-600" />,
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
      icon: <FileCode className="h-5 w-5 text-indigo-600" />,
      examples: [
        "Windows มีปัญหา",
        "โปรแกรมไม่ทำงาน",
        "ไวรัสคอมพิวเตอร์",
        "อินเทอร์เน็ตไม่ทำงาน",
      ],
    },
  ];

  // Fix filtering logic with proper null checks
  useEffect(() => {
    if (!Array.isArray(equipment)) return;

    const filtered = equipment.filter((eq) => {
      if (!eq) return false;

      const query = searchQuery.toLowerCase();
      const equipmentId = String(eq.equipment_id || "").toLowerCase();
      const name = String(eq.name || "").toLowerCase();
      const room = String(eq.room || "").toLowerCase();

      return (
        equipmentId.includes(query) ||
        name.includes(query) ||
        room.includes(query)
      );
    });

    setFilteredEquipment(filtered);
  }, [searchQuery, equipment]);

  // Initialize form data if editing an existing problem
  useEffect(() => {
    if (problem) {
      // If the problem type is "other", change it to "hardware" since we removed "other"
      const problem_type =
        problem.problem_type === "other" ? "hardware" : problem.problem_type;

      setFormData({
        equipment_id: problem.equipment_id || "",
        description: problem.description || "",
        problem_type: problem_type || "hardware",
      });

      // If the problem has an image, set the preview URL
      if (problem.image_url) {
        // Assuming there's an API endpoint to fetch the image
        setPreviewUrl(`/api/uploads/${problem.image_url}`);
      }
    }
  }, [problem]);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await api.get("/equipment");
        if (response.data.success) {
          setEquipment(response.data.data || []);
          setFilteredEquipment(response.data.data || []);

          // If editing an existing problem, select the equipment
          if (problem && problem.equipment_id) {
            const selected = response.data.data.find(
              (eq) => eq.equipment_id === problem.equipment_id
            );
            setSelectedEquipment(selected || null);
          }
        }
      } catch (error) {
        console.error("Error fetching equipment:", error);
        showError("ไม่สามารถดึงข้อมูลครุภัณฑ์ได้");
        setEquipment([]);
        setFilteredEquipment([]);
      }
    };

    fetchEquipment();
  }, [problem, showError]);

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
        showWarning(error);
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

  const checkSimilarProblems = async (equipment_id, problem_type) => {
    // Skip similar problem check when editing
    if (problem) return false;

    try {
      const activeStatusIds = [1, 2, 7]; // Pending, In Progress, Computer Center
      const response = await api.get(
        `/problems/similar/${equipment_id}/${problem_type}?statuses=${activeStatusIds.join(
          ","
        )}`
      );
      if (response.data.problems?.length > 0) {
        setSimilarProblems(response.data.problems);
        setShowSimilarProblems(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking similar problems:", error);
      return false;
    }
  };

  const validateForm = () => {
    if (!formData.equipment_id) {
      showError("กรุณาเลือกครุภัณฑ์");
      return false;
    }

    if (!formData.description.trim()) {
      showError("กรุณากรอกรายละเอียดปัญหา");
      return false;
    }

    if (formData.description.length < 5) {
      showError("กรุณากรอกรายละเอียดปัญหาอย่างน้อย 5 ตัวอักษร");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // If editing an existing problem, show confirmation dialog
    if (problem) {
      setConfirmDialog({
        isOpen: true,
        title: "ยืนยันการแก้ไขรายการ",
        message: "คุณต้องการบันทึกการแก้ไขรายการนี้ใช่หรือไม่?",
        isLoading: false,
      });
      return;
    }

    // For new problems, check for similar ones
    const hasSimilar = await checkSimilarProblems(
      formData.equipment_id,
      formData.problem_type
    );
    if (hasSimilar) return;

    submitProblem();
  };

  const submitProblem = async () => {
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("equipment_id", formData.equipment_id);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("problem_type", formData.problem_type);

      if (file) {
        formDataToSend.append("image", file);
      }

      let response;

      if (problem) {
        // If editing, use PUT or PATCH request to update
        response = await api.put(`/problems/${problem.id}`, formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        // If creating new, use POST request
        response = await api.post("/problems", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      if (response.data.success) {
        // Show success message
        showSuccess(problem ? "แก้ไขรายการสำเร็จ" : "แจ้งปัญหาสำเร็จแล้ว");

        // Wait a moment before closing the form
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        showError(response.data.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      }
    } catch (error) {
      console.error("Error submitting problem:", error);
      if (error.response?.status === 401) {
        showError("กรุณาเข้าสู่ระบบใหม่");
        // Handle unauthorized access - redirect to login or refresh token
      } else if (error.response?.status === 413) {
        showError("ไฟล์มีขนาดใหญ่เกินไป");
      } else {
        showError(
          error.response?.data?.message || "เกิดข้อผิดพลาดในการส่งข้อมูล"
        );
      }
    } finally {
      setIsSubmitting(false);
      setConfirmDialog({
        isOpen: false,
        title: "",
        message: "",
        isLoading: false,
      });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const SimilarProblemsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          <h3 className="text-base sm:text-lg font-semibold">
            พบปัญหาที่คล้ายกัน
          </h3>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-3 sm:space-y-4">
            {similarProblems.map((problem) => (
              <div
                key={problem.id}
                className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-2">
                  <p className="font-medium text-sm sm:text-base">
                    {problem.equipment_name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {new Date(problem.created_at).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">
                  {problem.description}
                </p>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-xs sm:text-sm text-gray-500">
                    แจ้งโดย: {problem.firstname} {problem.lastname}
                  </p>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full self-start sm:self-auto"
                    style={{ backgroundColor: problem.status_color }}
                  >
                    {problem.status_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row-reverse sm:justify-start gap-2 sm:gap-3 mt-4">
          <button
            onClick={submitProblem}
            className="px-4 py-2 text-xs sm:text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center justify-center"
          >
            <Send className="h-4 w-4 mr-1" />
            แจ้งปัญหาใหม่
          </button>
          <button
            onClick={() => setShowSimilarProblems(false)}
            className="px-4 py-2 text-xs sm:text-sm text-gray-700 border rounded-md hover:bg-gray-50 flex items-center justify-center"
          >
            <X className="h-4 w-4 mr-1" />
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {showSimilarProblems && <SimilarProblemsModal />}

      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
        <h2 className="text-lg sm:text-xl font-bold flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {problem ? "แก้ไขรายการแจ้งปัญหา" : "แจ้งปัญหาครุภัณฑ์"}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 sm:p-6 space-y-4 sm:space-y-6"
      >
        {/* Problem Type Selection - Primary Focus */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">เลือกประเภทของปัญหา</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
              จำเป็น
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {PROBLEM_TYPES.map((type) => (
              <div
                key={type.value}
                onClick={() =>
                  setFormData({ ...formData, problem_type: type.value })
                }
                className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${
                    formData.problem_type === type.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-200"
                  }`}
              >
                <div className="flex items-center space-x-2">
                  {type.icon}
                  <span className="font-medium text-sm sm:text-base">
                    {type.label}
                  </span>
                </div>
                <div className="mt-2 text-xs sm:text-sm text-gray-600">
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
        <div className="border-t pt-4 sm:pt-6">
          <div className="mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              ค้นหาครุภัณฑ์
            </label>
            <div className="relative">
              <SearchIcon
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัส, ชื่อ หรือห้อง..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
              <span className="mr-2">เลือกครุภัณฑ์</span>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                จำเป็น
              </span>
            </label>
            <select
              name="equipment_id"
              value={formData.equipment_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              disabled={problem} // Disable if editing existing problem
            >
              <option value="">เลือกครุภัณฑ์</option>
              {filteredEquipment.map((eq) => (
                <option key={eq.equipment_id} value={eq.equipment_id}>
                  {eq.equipment_id} - {eq.name} - ห้อง {eq.room}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
            <span className="mr-2">รายละเอียดเพิ่มเติม</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
              จำเป็น
            </span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={isMobile ? "4" : "3"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="อธิบายรายละเอียดเพิ่มเติมเกี่ยวกับปัญหาที่พบ..."
          />
          <p className="mt-1 text-xs text-gray-500">
            กรุณาระบุรายละเอียดปัญหาที่พบอย่างน้อย 5 ตัวอักษร
          </p>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
            <Image className="h-4 w-4 mr-1" />
            แนบรูปภาพ (ถ้ามี)
          </label>
          <div className="mt-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="flex flex-col items-center text-center">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mx-auto h-24 sm:h-32 w-auto rounded-lg"
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
                  <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-2 sm:mb-3" />
                  <div className="flex flex-col items-center space-y-1 sm:space-y-2">
                    <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span className="text-xs sm:text-sm">อัพโหลดรูปภาพ</span>
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
            <p className="mt-2 text-xs text-red-600 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {imageError}
            </p>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-4 sm:pt-6 gap-2 sm:gap-0 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="h-4 w-4 mr-1" />
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="h-4 w-4 mr-1" />
            {isSubmitting
              ? "กำลังส่งข้อมูล..."
              : problem
              ? "บันทึกการแก้ไข"
              : "แจ้งปัญหา"}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={submitProblem}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isLoading={confirmDialog.isLoading}
        confirmText="บันทึก"
        cancelText="ยกเลิก"
        confirmButtonClass="bg-indigo-600 hover:bg-indigo-700"
      />
    </div>
  );
}

export default ProblemForm;
