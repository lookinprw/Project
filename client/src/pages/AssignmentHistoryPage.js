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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../utils/axios";
import { StatusBadge } from "../components/common/StatusBadge";

function AssignmentHistoryPage() {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedItems, setExpandedItems] = useState([]);

  // Data state
  const [completedAssignments, setCompletedAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // Only keeping status_id 3 (เสร็จสิ้น)
  const [selectedStatusIds] = useState([3]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Toggle expanded item for mobile view
  const toggleExpandItem = (id) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      params.append("status", 3); // Only status 3 (เสร็จสิ้น)

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (dateRange.startDate) {
        params.append("startDate", dateRange.startDate);
      }

      if (dateRange.endDate) {
        params.append("endDate", dateRange.endDate);
      }

      console.log("Fetching assignments with params:", params.toString());

      const response = await api.get(
        `/problems/completed-history?${params.toString()}`
      );

      if (response.data.success) {
        // Process the data to calculate duration for each item
        const processedData = (response.data.data || []).map((item) => {
          // Add calculated_duration field using our improved function
          return {
            ...item,
            calculated_duration: calculateWorkDuration(
              item.assigned_at,
              item.updated_at
            ),
          };
        });

        setCompletedAssignments(processedData);
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
  }, [currentUser, navigate]);

  // Fetch data when filters change
  useEffect(() => {
    if (currentUser?.role === "equipment_assistant") {
      fetchCompletedAssignments();
    }
  }, [currentPage, debouncedSearch, dateRange]);

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

  // Improved function to calculate work duration
  const calculateWorkDuration = (assignedAt, updatedAt) => {
    // Check if we have valid date strings
    if (!assignedAt || !updatedAt) {
      console.log("Missing dates:", { assignedAt, updatedAt });
      return "0 นาที";
    }

    try {
      // Parse the dates (assuming they're in ISO format or similar)
      const assignedDate = new Date(assignedAt);
      const updatedDate = new Date(updatedAt);

      // Validate the dates
      if (isNaN(assignedDate.getTime()) || isNaN(updatedDate.getTime())) {
        console.log("Invalid date format:", { assignedAt, updatedAt });
        return "0 นาที";
      }

      // Calculate difference in milliseconds
      const diffMs = updatedDate.getTime() - assignedDate.getTime();

      // If negative or zero difference, return minimal time
      if (diffMs <= 0) {
        return "0 นาที";
      }

      // Calculate hours and minutes
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      // Format the result
      if (hours === 0) {
        return `${minutes} นาที`;
      } else if (minutes === 0) {
        return `${hours} ชั่วโมง`;
      } else {
        return `${hours} ชั่วโมง ${minutes} นาที`;
      }
    } catch (error) {
      console.error("Error calculating duration:", error);
      return "0 นาที";
    }
  };

  // Render mobile card view for each assignment
  const renderMobileCard = (assignment, index) => {
    const isExpanded = expandedItems.includes(assignment.id);

    return (
      <div
        key={assignment.id}
        className="bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-100"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-sm">
              {assignment.equipment_name || "N/A"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              รหัส: {assignment.equipment_id || "N/A"} | ห้อง:{" "}
              {assignment.equipment_room || "N/A"}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <StatusBadge
              status={{
                name: assignment.status_name,
                color: assignment.status_color,
              }}
            />
            <button
              onClick={() => toggleExpandItem(assignment.id)}
              className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-xs text-gray-500">วันที่แล้วเสร็จ</div>
                <div className="text-sm">
                  {new Date(assignment.updated_at).toLocaleDateString("th-TH")}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ผู้แจ้ง</div>
                <div className="text-sm">{assignment.reporter_name}</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-500">ปัญหา</div>
              <div className="text-sm">{assignment.description}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading && completedAssignments.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin w-8 h-8 sm:w-12 sm:h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <p className="mt-4 text-base sm:text-lg text-gray-600">
              กำลังโหลดข้อมูล...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 p-3 sm:p-6">
        {/* Header Section */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            ประวัติการซ่อมบำรุง
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            ดูประวัติงานซ่อมบำรุงที่ดำเนินการเสร็จสิ้นแล้ว
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow">
          <div
            className="flex justify-between items-center cursor-pointer mb-2"
            onClick={() => isMobile && setFiltersOpen(!filtersOpen)}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              <h3 className="text-base sm:text-lg font-medium">ตัวกรอง</h3>
            </div>
            {isMobile && (
              <button className="text-gray-500 p-1">
                {filtersOpen ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
            )}
          </div>

          <div
            className={`${isMobile && !filtersOpen ? "hidden" : "block"} mt-3`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date range filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  ช่วงวันที่
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="pl-8 sm:pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                      value={dateRange.startDate || ""}
                      onChange={(e) => handleDateChange(e, "startDate")}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="pl-8 sm:pl-10 block w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                      value={dateRange.endDate || ""}
                      onChange={(e) => handleDateChange(e, "endDate")}
                    />
                  </div>
                </div>
              </div>

              {/* Search box */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  ค้นหา
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาด้วยรหัสครุภัณฑ์, ปัญหา..."
                    className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3 w-3 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View - Cards */}
        {isMobile && (
          <div className="space-y-1">
            {completedAssignments.length > 0 ? (
              completedAssignments.map((assignment, index) =>
                renderMobileCard(assignment, index)
              )
            ) : (
              <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center py-6">
                  <CheckCircle className="w-12 h-12 text-gray-400" />
                  <p className="mt-4 text-base font-medium text-gray-900">
                    ไม่พบประวัติการซ่อมบำรุง
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    ประวัติการซ่อมบำรุงจะแสดงที่นี่เมื่อคุณดำเนินการซ่อมบำรุงเสร็จสิ้น
                  </p>
                </div>
              </div>
            )}

            {/* Mobile Pagination */}
            {completedAssignments.length > 0 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  isMobile={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Desktop View - Table */}
        {!isMobile && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
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

            {/* Desktop Pagination */}
            {completedAssignments.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AssignmentHistoryPage;
