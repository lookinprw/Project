import React, { useState, useEffect } from "react";
import api from "../../utils/axios";
import { useAlert } from "../../context/AlertContext";
import ConfirmationDialog from "../common/ConfirmationDialog";

// Format equipment ID function
const formatEquipmentId = (value) => {
  // Remove all spaces and convert to uppercase
  const cleaned = value.replace(/\s/g, "").toUpperCase();

  // Limit to 16 characters
  const limited = cleaned.slice(0, 16);

  // If length is at least 4, add a space before the last 3 characters
  if (limited.length >= 4) {
    const mainPart = limited.slice(0, -4);
    const lastPart = limited.slice(-4);
    return mainPart + " " + lastPart;
  }

  return limited;
};

// Validation utility
const validateEquipment = (values) => {
  const errors = {};

  if (!values.equipment_id) {
    errors.equipment_id = "กรุณากรอกรหัสครุภัณฑ์";
  } else {
    // Remove spaces before validation
    const cleanedId = values.equipment_id.replace(/\s/g, "");
    if (!/^[A-Z0-9-]{4,}$/i.test(cleanedId)) {
      errors.equipment_id = "รหัสครุภัณฑ์ไม่ถูกต้อง";
    }
  }

  if (!values.name?.trim()) {
    errors.name = "กรุณากรอกชื่อ";
  }

  if (!values.type) {
    errors.type = "กรุณาเลือกประเภท";
  }

  if (!values.room) {
    errors.room = "กรุณาเลือกห้อง";
  }

  if (!values.status) {
    errors.status = "กรุณาเลือกสถานะ";
  }

  return errors;
};

function EquipmentForm({ equipment = null, onComplete }) {
  const { showSuccess, showError } = useAlert();

  const [formData, setFormData] = useState({
    equipment_id: "",
    name: "",
    type: "Computer",
    room: "BI Studio",
    status: "active", // Default status
  });

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    isLoading: false,
    confirmText: "",
    confirmButtonClass: "",
  });

  useEffect(() => {
    if (equipment) {
      setFormData({
        equipment_id: formatEquipmentId(equipment.equipment_id), // Format existing ID
        name: equipment.name,
        type: equipment.type,
        room: equipment.room,
        status: equipment.status,
      });
    }
  }, [equipment]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare submission data with cleaned equipment_id
    const submissionData = {
      ...formData,
      equipment_id: formData.equipment_id.replace(/\s/g, ""), // Remove spaces before submission
    };

    // Validate form data
    const errors = validateEquipment(submissionData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: equipment ? "ยืนยันการแก้ไขครุภัณฑ์" : "ยืนยันการเพิ่มครุภัณฑ์",
      message: equipment
        ? `คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลครุภัณฑ์ "${formData.name}" ใช่หรือไม่?`
        : `คุณต้องการเพิ่มครุภัณฑ์ "${formData.name}" ใช่หรือไม่?`,
      isLoading: false,
      confirmText: equipment ? "บันทึกการแก้ไข" : "เพิ่มครุภัณฑ์",
      confirmButtonClass: "bg-indigo-600 hover:bg-indigo-700",
    });
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      // Prepare submission data with cleaned equipment_id
      const submissionData = {
        ...formData,
        equipment_id: formData.equipment_id.replace(/\s/g, ""), // Remove spaces before submission
      };

      let response;
      if (equipment) {
        response = await api.put(`/equipment/${equipment.id}`, submissionData);
      } else {
        response = await api.post("/equipment", submissionData);
      }

      if (response.data.success) {
        showSuccess(equipment ? "แก้ไขครุภัณฑ์สำเร็จ" : "เพิ่มครุภัณฑ์สำเร็จ");
        onComplete();
      }
    } catch (error) {
      console.error("Error saving equipment:", error);
      showError(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
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

    // Apply special formatting for equipment_id field
    if (name === "equipment_id") {
      setFormData({
        ...formData,
        [name]: formatEquipmentId(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: undefined,
      });
    }
  };

  // Radio button handler for type and room
  const handleRadioChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    // Clear validation error
    if (validationErrors[field]) {
      setValidationErrors({
        ...validationErrors,
        [field]: undefined,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-6">
        {equipment ? "แก้ไขครุภัณฑ์" : "เพิ่มครุภัณฑ์ใหม่"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              รหัสครุภัณฑ์
            </label>
            <input
              type="text"
              name="equipment_id"
              value={formData.equipment_id}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border ${
                validationErrors.equipment_id
                  ? "border-red-500"
                  : "border-gray-300"
              } px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500`}
            />
            {validationErrors.equipment_id && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.equipment_id}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              ชื่อครุภัณฑ์
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border ${
                validationErrors.name ? "border-red-500" : "border-gray-300"
              } px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500`}
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ประเภท
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  checked={formData.type === "Computer"}
                  onChange={() => handleRadioChange("type", "Computer")}
                  className="form-radio text-indigo-600 h-4 w-4"
                />
                <span className="ml-2">Computer</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  checked={formData.type === "Other"}
                  onChange={() => handleRadioChange("type", "Other")}
                  className="form-radio text-indigo-600 h-4 w-4"
                />
                <span className="ml-2">Other</span>
              </label>
            </div>
            {validationErrors.type && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.type}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ห้อง
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="room"
                  checked={formData.room === "BI Studio"}
                  onChange={() => handleRadioChange("room", "BI Studio")}
                  className="form-radio text-indigo-600 h-4 w-4"
                />
                <span className="ml-2">BI Studio</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="room"
                  checked={formData.room === "Co-Working"}
                  onChange={() => handleRadioChange("room", "Co-Working")}
                  className="form-radio text-indigo-600 h-4 w-4"
                />
                <span className="ml-2">Co-Working</span>
              </label>
            </div>
            {validationErrors.room && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.room}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สถานะ
            </label>
            <div className="flex flex-col space-y-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === "active"}
                  onChange={() => handleRadioChange("status", "active")}
                  className="form-radio text-green-600 h-4 w-4"
                />
                <span className="ml-2">ใช้งานได้</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === "inactive"}
                  onChange={() => handleRadioChange("status", "inactive")}
                  className="form-radio text-red-600 h-4 w-4"
                />
                <span className="ml-2">ไม่พร้อมใช้งาน</span>
              </label>
              <label
                className={`inline-flex items-center ${
                  !equipment ? "opacity-50" : ""
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === "maintenance"}
                  onChange={() => handleRadioChange("status", "maintenance")}
                  className="form-radio text-yellow-600 h-4 w-4"
                  disabled={!equipment} // Disable if this is a new equipment
                />
                <span className="ml-2">ซ่อมบำรุง</span>
                {!equipment && (
                  <span className="ml-2 text-xs text-gray-500">
                    (จะถูกตั้งโดยอัตโนมัติเมื่อมีการรายงานปัญหา)
                  </span>
                )}
              </label>
            </div>
            {validationErrors.status && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.status}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => onComplete()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "กำลังบันทึก..."
              : equipment
              ? "บันทึกการแก้ไข"
              : "เพิ่มครุภัณฑ์"}
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
        confirmText={confirmDialog.confirmText}
        cancelText="ยกเลิก"
        confirmButtonClass={confirmDialog.confirmButtonClass}
      />
    </div>
  );
}

export default EquipmentForm;
