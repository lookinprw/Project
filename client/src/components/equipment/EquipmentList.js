// src/components/equipment/EquipmentList.js
import React, { useState, useEffect } from "react";
import { Edit, Trash2, Search as SearchIcon, Filter } from "lucide-react";
import api from "../../utils/axios";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import Pagination from "../common/Pagination";
import ConfirmationDialog from "../common/ConfirmationDialog";

function EquipmentList({ onEdit }) {
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const isEquipmentManager = user?.role === "equipment_manager";

  // State for equipment data and UI
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    status: [],
    type: [],
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    itemId: null,
    itemName: "",
    isLoading: false,
    confirmButtonClass: "",
    confirmText: "",
  });

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch equipment data
  const fetchEquipment = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", pageSize);

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (filters.status.length > 0) {
        filters.status.forEach((status) => params.append("status", status));
      }

      if (filters.type.length > 0) {
        filters.type.forEach((type) => params.append("type", type));
      }

      // Log the request details for debugging
      console.log("Fetching equipment with params:", params.toString());
      console.log("API base URL:", api.defaults.baseURL);

      const response = await api.get(
        `/equipment/paginated?${params.toString()}`
      );

      if (response.data.success) {
        setEquipment(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      // More detailed error logging
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error message:", error.message);
      }
      showError("ไม่สามารถดึงข้อมูลครุภัณฑ์ได้");
    } finally {
      setLoading(false);
    }
  };
  // Fetch data when page, search, or filters change
  useEffect(() => {
    fetchEquipment();
  }, [currentPage, debouncedSearch, filters]);

  // Handle edit click
  const handleEditClick = (item) => {
    onEdit(item);
  };

  // Delete equipment with confirmation
  const handleDeleteClick = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการลบครุภัณฑ์",
      message: `คุณต้องการลบครุภัณฑ์ "${name}" ใช่หรือไม่?`,
      itemId: id,
      itemName: name,
      isLoading: false,
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
      confirmText: "ลบ",
    });
  };

  const handleConfirmDelete = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.delete(`/equipment/${confirmDialog.itemId}`);
      if (response.data.success) {
        showSuccess(`ลบครุภัณฑ์ "${confirmDialog.itemName}" สำเร็จ`);
        fetchEquipment(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting equipment:", error);
      showError(error.response?.data?.message || "ไม่สามารถลบครุภัณฑ์ได้");
    } finally {
      setConfirmDialog((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // The fetchEquipment will be triggered by the useEffect
  };

  // UI helper functions
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "maintenance":
        return "bg-yellow-100 text-yellow-700";
      case "inactive":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "ใช้งานได้";
      case "maintenance":
        return "ซ่อมบำรุง";
      case "inactive":
        return "ไม่พร้อมใช้งาน";
      default:
        return status;
    }
  };

  if (loading && equipment.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        {/* Search Section */}
        <div className="mb-6">
          <div className="max-w-md">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              ค้นหาครุภัณฑ์
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัส, ชื่อ, ประเภท, ห้อง หรือสถานะ..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white 
                          placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              พบ {equipment.length} รายการจากทั้งหมด
              {debouncedSearch && ` จากการค้นหา "${debouncedSearch}"`}
            </p>
          </div>
        </div>

        {/* Filters Section (for equipment managers) */}
        {isEquipmentManager && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">สถานะ</label>
                <div className="space-x-2">
                  {[
                    { value: "active", label: "ใช้งานได้" },
                    { value: "maintenance", label: "ซ่อมบำรุง" },
                    { value: "inactive", label: "ไม่พร้อมใช้งาน" },
                  ].map((status) => (
                    <label
                      key={status.value}
                      className="inline-flex items-center"
                    >
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status.value)}
                        onChange={() => {
                          setFilters((prev) => ({
                            ...prev,
                            status: prev.status.includes(status.value)
                              ? prev.status.filter((s) => s !== status.value)
                              : [...prev.status, status.value],
                          }));
                        }}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="ml-2 text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ประเภท</label>
                <div className="space-x-2">
                  {[
                    { value: "Computer", label: "Computer" },
                    { value: "Other", label: "Other" },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className="inline-flex items-center"
                    >
                      <input
                        type="checkbox"
                        checked={filters.type.includes(type.value)}
                        onChange={() => {
                          setFilters((prev) => ({
                            ...prev,
                            type: prev.type.includes(type.value)
                              ? prev.type.filter((t) => t !== type.value)
                              : [...prev.type, type.value],
                          }));
                        }}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="ml-2 text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รหัสครุภัณฑ์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ประเภท
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ห้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.equipment_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.room}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-md ${getStatusBadgeColor(
                        item.status
                      )}`}
                    >
                      {getStatusText(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors"
                      title="แก้ไข"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item.id, item.name)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="ลบ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {equipment.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {debouncedSearch ||
                filters.status.length > 0 ||
                filters.type.length > 0
                  ? "ไม่พบรายการที่ตรงกับการค้นหาหรือตัวกรอง"
                  : "ไม่พบรายการครุภัณฑ์"}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
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

export default EquipmentList;
