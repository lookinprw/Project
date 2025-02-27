import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import Pagination from "../components/common/Pagination";
import {
  Calendar,
  Clock,
  Search,
  User,
  Filter,
  CheckCircle,
} from "lucide-react";
import api from "../utils/axios";
import { StatusBadge } from "../components/common/StatusBadge";

function AssignmentHistoryPage() {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();

  // Data state
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [selectedStatusIds, setSelectedStatusIds] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch statuses for filter
  const fetchStatuses = async () => {
    try {
      const response = await api.get("/status");
      if (response.data.success) {
        // Only include "completed" statuses (e.g., Resolved, Closed, etc.)
        const completedStatusIds = [3, 4, 8]; // Example: 3=Completed, 4=Cannot Fix, 8=Damaged
        const filteredStatuses = response.data.data.filter((status) =>
          completedStatusIds.includes(status.id)
        );
        setStatuses(filteredStatuses);
      }
    } catch (error) {
      console.error("Error fetching statuses:", error);
    }
  };

  // Fetch completed assignments for the current user
  const fetchCompletedAssignments = async () => {
    if (!currentUser || currentUser.role !== "equipment_assistant") {
      return;
    }

    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", pageSize);
      params.append("assignedTo", currentUser.id); // Always filter by current user

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (dateRange.startDate) {
        params.append("startDate", dateRange.startDate);
      }

      if (dateRange.endDate) {
        params.append("endDate", dateRange.endDate);
      }

      // Add selected statuses if any are selected
      if (selectedStatusIds.length > 0) {
        selectedStatusIds.forEach((id) => params.append("status", id));
      }

      console.log("Fetching assignments with params:", params.toString());

      const response = await api.get(`/problems/history?${params.toString()}`);

      if (response.data.success) {
        setCompletedAssignments(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
      } else {
        console.error("API returned failure:", response.data);
        showError("ไม่สามารถดึงข้อมูลประวัติการซ่อมได้");
      }
    } catch (error) {
      console.error("Error fetching completed assignments:", error);
      showError("ไม่สามารถดึงข้อมูลประวัติการซ่อมได้");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts and when filters change
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Check if user is equipment assistant
    if (currentUser.role !== "equipment_assistant") {
      navigate("/dashboard");
      return;
    }

    fetchStatuses();
  }, [currentUser, navigate]);

  // Fetch data when filters change
  useEffect(() => {
    if (currentUser?.role === "equipment_assistant") {
      fetchCompletedAssignments();
    }
  }, [currentPage, debouncedSearch, dateRange, selectedStatusIds]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle date range filter
  const handleDateChange = (e, field) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setCurrentPage(1); // Reset to first page
  };

  // Handle status filter change
  const handleStatusChange = (statusId) => {
    setSelectedStatusIds((prev) => {
      if (prev.includes(statusId)) {
        return prev.filter((id) => id !== statusId);
      } else {
        return [...prev, statusId];
      }
    });
    setCurrentPage(1); // Reset to first page
  };

  // Calculate work duration in hours
  const calculateWorkDuration = (assignedDate, completedDate) => {
    if (!assignedDate || !completedDate) return "N/A";

    try {
      const assigned = new Date(assignedDate);
      const completed = new Date(completedDate);

      // Calculate difference in milliseconds
      const diff = completed - assigned;

      // Convert to hours (rounded to 1 decimal place)
      const hours = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;

      return `${hours} ชั่วโมง`;
    } catch (error) {
      console.error("Error calculating duration:", error);
      return "N/A";
    }
  };

  // Format the resolution method based on status and comments
  const getResolutionMethod = (status, comment) => {
    if (!status) return "-";

    if (status.id === 4) {
      // Cannot Fix
      return `ไม่สามารถซ่อมได้: ${comment || "ไม่ระบุเหตุผล"}`;
    } else if (status.id === 3) {
      // Completed
      return comment || "ซ่อมเสร็จสิ้น";
    } else if (status.id === 8) {
      // Damaged
      return `ชำรุดเสียหาย: ${comment || "ไม่ระบุรายละเอียด"}`;
    }

    return comment || "-";
  };

  if (loading && completedAssignments.length === 0) {
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            ประวัติการซ่อมบำรุง
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            ดูประวัติงานซ่อมบำรุงที่ดำเนินการเสร็จสิ้นแล้ว
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium">ตัวกรอง</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ช่วงวันที่
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={dateRange.startDate || ""}
                    onChange={(e) => handleDateChange(e, "startDate")}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={dateRange.endDate || ""}
                    onChange={(e) => handleDateChange(e, "endDate")}
                  />
                </div>
              </div>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                สถานะ
              </label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <label key={status.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStatusIds.includes(status.id)}
                      onChange={() => handleStatusChange(status.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      {status.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Search box */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ค้นหา
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาด้วยรหัสครุภัณฑ์, ปัญหา..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่แล้วเสร็จ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รหัสครุภัณฑ์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    อุปกรณ์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ห้อง
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ปัญหา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้แจ้ง
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ระยะเวลาดำเนินการ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วิธีการแก้ไข
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedAssignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-gray-50/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(assignment.updated_at).toLocaleDateString(
                        "th-TH"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.equipment_id || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.equipment_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.equipment_room || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {assignment.reporter_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {calculateWorkDuration(
                            assignment.assigned_at,
                            assignment.updated_at
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getResolutionMethod(
                        {
                          id: assignment.status_id,
                          name: assignment.status_name,
                        },
                        assignment.comment
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={{
                          name: assignment.status_name,
                          color: assignment.status_color,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {completedAssignments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-400" />
                <p className="mt-4 text-lg font-medium text-gray-900">
                  ไม่พบประวัติการซ่อมบำรุง
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  ประวัติการซ่อมบำรุงจะแสดงที่นี่เมื่อคุณดำเนินการซ่อมบำรุงเสร็จสิ้น
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {completedAssignments.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="mt-4"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AssignmentHistoryPage;
