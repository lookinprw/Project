// src/components/equipment/EquipmentList.js
import React, { useState, useEffect } from "react";
import {
  Edit,
  Trash2,
  Search as SearchIcon,
  Filter,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import api from "../../utils/axios";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import Pagination from "../common/Pagination";
import ConfirmationDialog from "../common/ConfirmationDialog";

function EquipmentList({ onEdit, isMobile }) {
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const isEquipmentManager = user?.role === "equipment_manager";

  // State for equipment data and UI
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]);

  // Selection state for bulk operations
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

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
    confirmAction: null,
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
        // Reset selections when equipment changes
        setSelectedEquipment([]);
        setSelectAll(false);
        setExpandedItems([]);
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

  // Toggle expanded item for mobile view
  const toggleExpandItem = (id) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
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
      confirmAction: () => handleConfirmDelete(id),
    });
  };

  const handleConfirmDelete = async (id) => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.delete(`/equipment/${id}`);
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

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedEquipment.length === 0) {
      showError("กรุณาเลือกรายการที่ต้องการลบ");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการลบรายการที่เลือก",
      message: `คุณต้องการลบครุภัณฑ์ที่เลือกจำนวน ${selectedEquipment.length} รายการใช่หรือไม่?`,
      isLoading: false,
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
      confirmText: "ลบทั้งหมด",
      confirmAction: confirmBulkDelete,
    });
  };

  // Confirm and execute bulk deletion
  const confirmBulkDelete = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      // Delete equipment one by one
      const deletePromises = selectedEquipment.map((id) =>
        api.delete(`/equipment/${id}`)
      );

      await Promise.all(deletePromises);

      showSuccess(`ลบครุภัณฑ์ทั้งหมด ${selectedEquipment.length} รายการสำเร็จ`);
      setSelectedEquipment([]);
      fetchEquipment();
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

  // Handle selecting/deselecting individual equipment
  const handleSelectEquipment = (equipmentId) => {
    setSelectedEquipment((prev) => {
      if (prev.includes(equipmentId)) {
        return prev.filter((id) => id !== equipmentId);
      } else {
        return [...prev, equipmentId];
      }
    });
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedEquipment([]);
    } else {
      // Select all equipment
      const allEquipmentIds = equipment.map((item) => item.id);
      setSelectedEquipment(allEquipmentIds);
    }
    setSelectAll(!selectAll);
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

  // Render mobile card for each equipment item
  const renderMobileCard = (item) => {
    const isExpanded = expandedItems.includes(item.id);

    return (
      <div
        key={item.id}
        className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-2">
            {isEquipmentManager && (
              <input
                type="checkbox"
                checked={selectedEquipment.includes(item.id)}
                onChange={() => handleSelectEquipment(item.id)}
                className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            )}
            <div>
              <div className="font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500">{item.equipment_id}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${getStatusBadgeColor(
                item.status
              )}`}
            >
              {getStatusText(item.status)}
            </span>
            <button
              onClick={() => toggleExpandItem(item.id)}
              className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-xs text-gray-500">ประเภท</div>
                <div className="text-sm">{item.type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ห้อง</div>
                <div className="text-sm">{item.room}</div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => handleEditClick(item)}
                className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDeleteClick(item.id, item.name)}
                className="p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
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
    <div
      className={`bg-white rounded-lg ${isMobile ? "shadow-sm" : "shadow-md"}`}
    >
      <div className={`${isMobile ? "p-4" : "p-6"}`}>
        {/* Search Section */}
        <div className="mb-4 sm:mb-6">
          <div className="max-w-md">
            <label
              htmlFor="search"
              className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
            >
              ค้นหาครุภัณฑ์
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัส, ชื่อ, ประเภท..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white 
                          placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              พบ {equipment.length} รายการจากทั้งหมด
              {debouncedSearch && ` จากการค้นหา "${debouncedSearch}"`}
            </p>
          </div>
        </div>

        {/* Filters Section (for equipment managers) */}
        {isEquipmentManager && (
          <div
            className={`bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4 sm:mb-6 border border-gray-100`}
          >
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => isMobile && setFiltersOpen(!filtersOpen)}
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm sm:text-base font-medium">ตัวกรอง</h3>
              </div>
              {isMobile && (
                <button className="text-gray-500 p-1">
                  {filtersOpen ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>
              )}
            </div>

            <div
              className={`${
                isMobile && !filtersOpen ? "hidden" : "block"
              } mt-3 space-y-3 sm:space-y-4`}
            >
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  สถานะ
                </label>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:space-x-2">
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
                      <span className="ml-2 text-xs sm:text-sm">
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  ประเภท
                </label>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:space-x-2">
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
                      <span className="ml-2 text-xs sm:text-sm">
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedEquipment.length > 0 && isEquipmentManager && (
          <div className="mb-4 bg-indigo-50 p-3 rounded-lg shadow-sm border border-indigo-100 flex justify-between items-center">
            <span className="text-xs sm:text-sm font-medium text-indigo-800">
              เลือก {selectedEquipment.length} รายการ
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">ลบรายการที่เลือก</span>
              <span className="sm:hidden">ลบ</span>
            </button>
          </div>
        )}

        {/* Mobile Card View */}
        {isMobile && (
          <div className="space-y-1">
            {equipment.length > 0 ? (
              equipment.map((item) => renderMobileCard(item))
            ) : (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {debouncedSearch ||
                  filters.status.length > 0 ||
                  filters.type.length > 0
                    ? "ไม่พบรายการที่ตรงกับการค้นหาหรือตัวกรอง"
                    : "ไม่พบรายการครุภัณฑ์"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Desktop Table View */}
        {!isMobile && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Add checkbox column for all users */}
                  {isEquipmentManager && (
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectAll && equipment.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        title="เลือกทั้งหมด"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รหัสครุภัณฑ์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อครุภัณฑ์
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
                    {/* Add checkbox for each row */}
                    {isEquipmentManager && (
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(item.id)}
                          onChange={() => handleSelectEquipment(item.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
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
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="mt-4 sm:mt-6"
          isMobile={isMobile}
        />
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmDialog.confirmAction?.();
        }}
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
