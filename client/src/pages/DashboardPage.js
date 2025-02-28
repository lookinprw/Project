import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProblemForm from "../components/problems/ProblemForm";
import Pagination from "../components/common/Pagination";
import ConfirmationDialog from "../components/common/ConfirmationDialog";
import {
  User,
  Monitor,
  HardDrive,
  HelpCircle,
  Filter,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import api from "../utils/axios";

function DashboardPage() {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();

  // UI state
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingProblem, setEditingProblem] = useState(null);

  // Data state
  const [problems, setProblems] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Selection state - for bulk operations
  const [selectedProblems, setSelectedProblems] = useState([]);
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
    isLoading: false,
    confirmButtonClass: "",
    confirmText: "",
    confirmAction: null,
  });

  const isStaff =
    currentUser &&
    ["admin", "equipment_manager", "equipment_assistant"].includes(
      currentUser.role
    );

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProblems = async () => {
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

      // Parallel API calls with Promise.all
      const [statusesRes, problemsRes] = await Promise.all([
        api.get("/status"),
        api.get(`/problems/paginated?${params.toString()}`),
      ]);

      if (statusesRes.data.success) {
        setStatuses(statusesRes.data.data);
      }

      if (problemsRes.data.success) {
        setProblems(problemsRes.data.data || []);
        setTotalPages(problemsRes.data.totalPages || 1);

        // Reset selections when problems change
        setSelectedProblems([]);
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
      showError("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when pagination, search or filters change
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    fetchProblems();
  }, [currentUser, navigate, currentPage, debouncedSearch, filters]);

  const handleStatusChange = async (problemId, newStatusId) => {
    try {
      await api.patch(`/problems/${problemId}/status`, {
        status_id: newStatusId,
      });
      showSuccess("อัพเดทสถานะสำเร็จ");
      fetchProblems(); // Refresh the list
    } catch (error) {
      console.error("Error updating status:", error);
      showError("ไม่สามารถอัพเดทสถานะได้");
    }
  };

  const handleAssign = async (problemId) => {
    try {
      const response = await api.patch(`/problems/${problemId}/assign`);
      if (response.data.success) {
        showSuccess("รับงานสำเร็จ");
        await fetchProblems();
      }
    } catch (err) {
      showError("ไม่สามารถรับมอบหมายงานได้");
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // The fetchProblems will be triggered by the useEffect
  };

  const handleFilterChange = (type, value) => {
    if (type === "status") {
      setFilters((prev) =>
        prev.status.includes(value)
          ? { ...prev, status: prev.status.filter((item) => item !== value) }
          : { ...prev, status: [...prev.status, value] }
      );
    } else if (type === "type") {
      setFilters((prev) =>
        prev.type.includes(value)
          ? { ...prev, type: prev.type.filter((item) => item !== type) }
          : { ...prev, type: [...prev.type, value] }
      );
    }
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Function to check if user can modify a problem
  const canModifyProblem = (problem) => {
    if (!problem || !currentUser) return false;

    // Admin and equipment_manager can modify any problem
    if (
      currentUser.role === "admin" ||
      currentUser.role === "equipment_manager"
    ) {
      return true;
    }

    // Users can only modify their own problems
    return String(problem.reported_by) === String(currentUser.id);
  };

  // Handle selecting/deselecting individual problem
  const handleSelectProblem = (problemId) => {
    setSelectedProblems((prev) => {
      if (prev.includes(problemId)) {
        return prev.filter((id) => id !== problemId);
      } else {
        return [...prev, problemId];
      }
    });
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedProblems([]);
    } else {
      // Select all problems that the user can modify
      const selectableProblems = problems
        .filter((problem) => canModifyProblem(problem))
        .map((problem) => problem.id);
      setSelectedProblems(selectableProblems);
    }
    setSelectAll(!selectAll);
  };

  // Handle editing a problem
  const handleEditProblem = (problem) => {
    setEditingProblem(problem);
    setShowProblemForm(true);
  };

  // Handle deleting a problem
  const handleDeleteProblem = (problemId) => {
    // Check if user can delete this problem
    const problem = problems.find((p) => p.id === problemId);

    // Only allow delete if user is equipment_manager or is the reporter
    const canDelete =
      currentUser.role === "admin" ||
      currentUser.role === "equipment_manager" ||
      (problem && String(problem.reported_by) === String(currentUser.id));

    if (!canDelete) {
      showError("คุณไม่มีสิทธิ์ลบรายการนี้");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการลบรายการ",
      message: "คุณต้องการลบรายการแจ้งปัญหานี้ใช่หรือไม่?",
      itemId: problemId,
      isLoading: false,
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
      confirmText: "ลบ",
      confirmAction: () => confirmDeleteProblem(problemId),
    });
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedProblems.length === 0) {
      showError("กรุณาเลือกรายการที่ต้องการลบ");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการลบรายการที่เลือก",
      message: `คุณต้องการลบรายการแจ้งปัญหาที่เลือกจำนวน ${selectedProblems.length} รายการใช่หรือไม่?`,
      isLoading: false,
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
      confirmText: "ลบทั้งหมด",
      confirmAction: confirmBulkDelete,
    });
  };

  // Confirm and execute deletion
  const confirmDeleteProblem = async (problemId) => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      await api.delete(`/problems/${problemId}`);
      showSuccess("ลบรายการสำเร็จ");
      fetchProblems();
    } catch (error) {
      console.error("Error deleting problem:", error);
      showError(error.response?.data?.message || "ไม่สามารถลบรายการได้");
    } finally {
      setConfirmDialog((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
    }
  };

  // Confirm and execute bulk deletion
  const confirmBulkDelete = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      // Delete problems one by one
      const deletePromises = selectedProblems.map((id) =>
        api.delete(`/problems/${id}`)
      );

      await Promise.all(deletePromises);

      showSuccess(`ลบรายการทั้งหมด ${selectedProblems.length} รายการสำเร็จ`);
      setSelectedProblems([]);
      fetchProblems();
    } catch (error) {
      console.error("Error deleting problems:", error);
      showError(error.response?.data?.message || "ไม่สามารถลบรายการได้");
    } finally {
      setConfirmDialog((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
    }
  };

  // UI helper functions
  const getProblemTypeDetails = (type) => {
    switch (type) {
      case "hardware":
        return {
          icon: <HardDrive className="w-4 h-4" />,
          label: "ฮาร์ดแวร์",
          bgColor: "bg-red-100",
          textColor: "text-red-800",
          borderColor: "border-red-200",
        };
      case "software":
        return {
          icon: <Monitor className="w-4 h-4" />,
          label: "ซอฟต์แวร์",
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
          borderColor: "border-blue-200",
        };
      default:
        return {
          icon: <HelpCircle className="w-4 h-4" />,
          label: "อื่นๆ",
          bgColor: "bg-gray-100",
          textColor: "text-gray-800",
          borderColor: "border-gray-200",
        };
    }
  };

  // Improved status badge rendering function
  const renderStatusColumn = (problem) => {
    if (isStaff) {
      // For staff, show status dropdown with improved styling
      return (
        <select
          value={problem.status_id}
          onChange={(e) =>
            handleStatusChange(problem.id, parseInt(e.target.value))
          }
          className="block w-40 py-1 px-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{
            backgroundColor: "white", // Always white background
            color: "#1F2937", // Dark gray text for readability
            borderColor: problem.status_color, // Use status color only for border
          }}
        >
          {statuses.map((status) => (
            <option
              key={status.id}
              value={status.id}
              style={{ backgroundColor: "white", color: "#1F2937" }}
            >
              {status.name}
            </option>
          ))}
        </select>
      );
    }

    // For normal users, show status badge with improved styling
    return (
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
        style={{
          backgroundColor: "white", // White background for all badges
          color: "#1F2937", // Dark text for readability
          borderColor: problem.status_color, // Use status color for border
        }}
      >
        {/* Add a colored dot to represent status */}
        <span
          className="w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: problem.status_color }}
        ></span>
        {problem.status_name}
      </span>
    );
  };

  if (loading && problems.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <p className="mt-4 text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Count how many problems are selectable (can be modified by current user)
  const selectableProblemCount = problems.filter((p) =>
    canModifyProblem(p)
  ).length;
  // Check if all selectable problems are selected
  const areAllSelectableSelected =
    selectableProblemCount > 0 &&
    selectedProblems.length === selectableProblemCount;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ระบบแจ้งปัญหาครุภัณฑ์คอมพิวเตอร์
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                จัดการและติดตามการแจ้งปัญหาครุภัณฑ์ทั้งหมด
              </p>
            </div>
            <button
              onClick={() => {
                setShowProblemForm(!showProblemForm);
                setEditingProblem(null); // Clear any editing problem when toggling form
              }}
              className="px-6 py-2.5 rounded-lg text-white font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {showProblemForm ? (
                <span className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  ดูรายการแจ้งปัญหา
                </span>
              ) : (
                <span className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  แจ้งปัญหาใหม่
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        {showProblemForm ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <ProblemForm
              problem={editingProblem}
              onClose={() => {
                setShowProblemForm(false);
                setEditingProblem(null);
                fetchProblems();
              }}
            />
          </div>
        ) : (
          <>
            {/* Filters */}
            {isStaff && (
              <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-medium">ตัวกรอง</h3>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      สถานะ
                    </label>
                    <div className="space-x-4">
                      {statuses.map((status) => (
                        <label
                          key={status.id}
                          className="inline-flex items-center"
                        >
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status.id)}
                            onChange={() =>
                              handleFilterChange("status", status.id)
                            }
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            {status.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประเภทปัญหา
                    </label>
                    <div className="space-x-4">
                      {[
                        { value: "hardware", label: "ฮาร์ดแวร์" },
                        { value: "software", label: "ซอฟต์แวร์" },
                      ].map((type) => (
                        <label
                          key={type.value}
                          className="inline-flex items-center"
                        >
                          <input
                            type="checkbox"
                            checked={filters.type.includes(type.value)}
                            onChange={() =>
                              handleFilterChange("type", type.value)
                            }
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Search Box */}
                <div className="mt-4 max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค้นหา
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นหาด้วยรหัสครุภัณฑ์, ปัญหา, หรือชื่อผู้แจ้ง..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Filter className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedProblems.length > 0 && (
              <div className="mb-4 bg-indigo-50 p-3 rounded-lg shadow-sm border border-indigo-100 flex justify-between items-center">
                <span className="text-sm font-medium text-indigo-800">
                  เลือก {selectedProblems.length} รายการ
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  ลบรายการที่เลือก
                </button>
              </div>
            )}

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      {/* Select All Checkbox */}
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={areAllSelectableSelected}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          title="เลือกทั้งหมดที่สามารถแก้ไขได้"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ลำดับ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        อุปกรณ์
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        รหัสครุภัณฑ์
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ห้อง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ปัญหา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ประเภทปัญหา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้แจ้ง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        รับงาน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้รับผิดชอบ
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
                    {problems.map((problem, index) => {
                      const typeDetails = getProblemTypeDetails(
                        problem.problem_type
                      );
                      const canModify = canModifyProblem(problem);

                      return (
                        <tr
                          key={problem.id}
                          className="hover:bg-gray-50/50 transition-colors duration-150"
                        >
                          {/* Item Checkbox */}
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              disabled={!canModify}
                              checked={selectedProblems.includes(problem.id)}
                              onChange={() => handleSelectProblem(problem.id)}
                              className={`rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                                !canModify
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(problem.created_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.equipment_name || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.equipment_id || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.equipment_room || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-sm ${typeDetails.bgColor} ${typeDetails.textColor} border ${typeDetails.borderColor}`}
                            >
                              {typeDetails.icon}
                              <span>{typeDetails.label}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">
                                {problem.reporter_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {problem.status_id === 1 && isStaff ? (
                              <button
                                onClick={() => handleAssign(problem.id)}
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                              >
                                รับเรื่อง
                              </button>
                            ) : (
                              <span className="text-sm text-gray-500">
                                {problem.status_id === 1
                                  ? "รอรับเรื่อง"
                                  : "รับเรื่องแล้ว"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">
                                {problem.assigned_to_name || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusColumn(problem)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            {canModify && (
                              <>
                                <button
                                  onClick={() => handleEditProblem(problem)}
                                  className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                  title="แก้ไข"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteProblem(problem.id)
                                  }
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="ลบ"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {problems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-4 text-lg font-medium text-gray-900">
                      ไม่พบรายการแจ้งปัญหา
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      เริ่มต้นแจ้งปัญหาโดยคลิกที่ปุ่ม "แจ้งปัญหาใหม่"
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {problems.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  className="mt-4"
                />
              )}
            </div>
          </>
        )}
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
    </DashboardLayout>
  );
}

export default DashboardPage;
