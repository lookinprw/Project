import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  BarChart,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import api from "../utils/axios";
import {
  Filter,
  Calendar,
  Search,
  HardDrive,
  Monitor,
  HelpCircle,
  User,
  CheckSquare,
  Square,
  RefreshCw,
  X,
  BarChart2,
  ChevronDown,
  Clock,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import Pagination from "../components/common/Pagination";

function ProblemAnalysisPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // State
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [roomStats, setRoomStats] = useState([]);
  const [summary, setSummary] = useState({ statuses: [], total: 0 });
  const [completedProblems, setCompletedProblems] = useState([]);
  const [expandedItems, setExpandedItems] = useState([]);

  // Pagination for the completed problems table
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Filter states
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedProblemTypes, setSelectedProblemTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // UI state
  const [showFilters, setShowFilters] = useState(false);

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

  // Colors for charts
  const COLORS = [
    "#4F46E5", // indigo-600
    "#10B981", // emerald-500
    "#F59E0B", // amber-500
    "#EF4444", // red-500
    "#8B5CF6", // violet-500
    "#EC4899", // pink-500
  ];

  const monthNames = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  // Check if user has permission to view this page
  const hasPermission =
    user && ["admin", "equipment_manager"].includes(user.role);

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query parameters based on filters
  const buildQueryParams = () => {
    const params = new URLSearchParams();

    // Add pagination parameters
    params.append("page", currentPage);
    params.append("limit", pageSize);

    // Add filter parameters - only if they have values
    if (selectedRooms.length > 0) {
      selectedRooms.forEach((room) => params.append("room", room));
    }

    if (selectedProblemTypes.length > 0) {
      selectedProblemTypes.forEach((type) => params.append("type", type));
    }

    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach((status) => params.append("status", status));
    }

    if (dateRange.startDate) {
      params.append("startDate", dateRange.startDate);
    }

    if (dateRange.endDate) {
      params.append("endDate", dateRange.endDate);
    }

    if (debouncedSearch) {
      params.append("search", debouncedSearch);
    }

    return params;
  };

  // Toggle handlers
  const handleRoomToggle = (room) => {
    setSelectedRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const handleProblemTypeToggle = (type) => {
    setSelectedProblemTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleStatusToggle = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Fetch data
  const fetchData = async () => {
    if (!hasPermission) return;

    setLoading(true);
    try {
      const params = buildQueryParams();

      // Fetch data in parallel with filters applied
      const [
        monthlyResponse,
        roomsResponse,
        summaryResponse,
        completedResponse,
      ] = await Promise.all([
        api.get(`/problems/stats/monthly?${params.toString()}`),
        api.get(`/problems/stats/rooms?${params.toString()}`),
        api.get(`/problems/stats/summary?${params.toString()}`),
        api.get(`/problems/completed-history?${params.toString()}`),
      ]);

      // Process monthly stats
      if (monthlyResponse.data.success) {
        // Convert to chart-friendly format and add Thai month names
        const processedData = monthlyResponse.data.data
          .map((item) => ({
            ...item,
            name: `${monthNames[item.month - 1]} ${item.year + 543}`, // Convert to Buddhist Era
          }))
          .reverse(); // Reverse to show chronological order

        setMonthlyStats(processedData);
      }

      // Process room stats
      if (roomsResponse.data.success) {
        setRoomStats(roomsResponse.data.data);

        // Extract available rooms for filter dropdown
        const rooms = roomsResponse.data.data.map((item) => item.room);
        // Remove duplicates and filter out empty/null values
        const uniqueRooms = [...new Set(rooms)].filter(Boolean);
        setAvailableRooms(uniqueRooms);
      }

      // Process summary stats
      if (summaryResponse.data.success) {
        setSummary(summaryResponse.data.data);
      }

      // Process completed problems for table
      if (completedResponse.data.success) {
        setCompletedProblems(completedResponse.data.data || []);
        setTotalPages(completedResponse.data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching analysis data:", error);
      showError("ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้");
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    if (!hasPermission) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission]);

  // Fetch data when page changes or search query changes
  useEffect(() => {
    if (!hasPermission) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch]);

  const handleDateChange = (e, field) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleApplyFilters = () => {
    // Reset to first page when applying filters
    setCurrentPage(1);
    fetchData();

    // Hide filters panel on mobile after applying
    if (isMobile) {
      setShowFilters(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedRooms([]);
    setSelectedProblemTypes([]);
    setSelectedStatuses([]);
    setDateRange({ startDate: "", endDate: "" });
    setSearchQuery("");
    setDebouncedSearch("");

    // Reset to first page
    setCurrentPage(1);

    // Use setTimeout to ensure state updates before fetching
    setTimeout(() => {
      fetchData();
    }, 0);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // UI helper function for problem type
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
          label: "ซอฟต์แวร์", // Default to software for any unknown types
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
          borderColor: "border-blue-200",
        };
    }
  };

  // Render mobile card for each completed problem
  const renderMobileProblemCard = (problem, index) => {
    const typeDetails = getProblemTypeDetails(problem.problem_type);
    const isExpanded = expandedItems.includes(problem.id);

    return (
      <div
        key={problem.id}
        className="bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-100"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-sm">
              {problem.equipment_name || "N/A"}
            </div>
            <div className="text-xs text-gray-500">
              รหัส: {problem.equipment_id || "N/A"}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor:
                  problem.status_color ||
                  (problem.status_id === 3 ? "#ecfdf5" : "#fff7ed"),
                color: problem.status_id === 3 ? "#065f46" : "#9a3412",
                borderWidth: "1px",
                borderColor: problem.status_id === 3 ? "#a7f3d0" : "#fed7aa",
              }}
            >
              <span
                className="w-2 h-2 rounded-full mr-1"
                style={{
                  backgroundColor:
                    problem.status_id === 3 ? "#10b981" : "#f97316",
                }}
              ></span>
              {problem.status_name || "ไม่ระบุสถานะ"}
            </span>
            <button
              onClick={() => toggleExpandItem(problem.id)}
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
                <div className="text-xs text-gray-500">ห้อง</div>
                <div className="text-sm">{problem.equipment_room || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">วันที่</div>
                <div className="text-sm">
                  {new Date(problem.created_at).toLocaleDateString("th-TH")}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-500">ปัญหา</div>
              <div className="text-sm">{problem.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-xs text-gray-500">ประเภทปัญหา</div>
                <div
                  className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${typeDetails.bgColor} ${typeDetails.textColor} border ${typeDetails.borderColor} mt-1`}
                >
                  {typeDetails.icon}
                  <span>{typeDetails.label}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ผู้แจ้ง</div>
                <div className="text-sm">{problem.reporter_name || "N/A"}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">ผู้รับผิดชอบ</div>
              <div className="text-sm">{problem.assigned_to_name || "-"}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-red-100 mb-4">
              <X className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-red-600">
              ไม่มีสิทธิ์เข้าถึง
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading && monthlyStats.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
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

  // Calculate total counts for problem types
  const totalHardware = monthlyStats.reduce(
    (sum, item) => sum + (parseInt(item.hardware) || 0),
    0
  );
  const totalSoftware = monthlyStats.reduce(
    (sum, item) => sum + (parseInt(item.software) || 0),
    0
  );
  const totalProblems = totalHardware + totalSoftware;

  // Calculate resolved vs unresolved
  const resolvedStatus = summary.statuses.find((s) => s.status_id === 3) || {
    count: 0,
  };
  const damagedStatus = summary.statuses.find((s) => s.status_id === 8) || {
    count: 0,
  };
  const inProgressStatuses =
    summary.statuses.filter((s) => ![3, 8].includes(parseInt(s.status_id))) ||
    [];
  const inProgressCount = inProgressStatuses.reduce(
    (sum, status) => sum + parseInt(status.count || 0),
    0
  );

  // Status summary for second chart
  const statusSummary = [
    {
      name: "เสร็จสิ้น",
      value: parseInt(resolvedStatus.count) || 0,
      color: "#10B981", // emerald-500
    },
    {
      name: "ชำรุดเสียหาย",
      value: parseInt(damagedStatus.count) || 0,
      color: "#F59E0B", // amber-500
    },
    {
      name: "อยู่ระหว่างดำเนินการ",
      value: inProgressCount,
      color: "#6366F1", // indigo-500
    },
  ].filter((item) => item.value > 0); // Filter out zero values

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                การวิเคราะห์ข้อมูลปัญหา
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                วิเคราะห์ข้อมูลสถิติของปัญหาครุภัณฑ์คอมพิวเตอร์ทั้งหมด
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                ตัวกรอง
                <ChevronDown
                  className={`ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
              <button
                onClick={fetchData}
                className="inline-flex items-center px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                รีเฟรช
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6 border border-gray-100 mb-4 sm:mb-6 transition-all duration-200 ease-in-out">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                <h3 className="text-base sm:text-lg font-medium">ตัวกรอง</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4">
              {/* Room filter with checkboxes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  ห้อง
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 sm:p-3 rounded-md">
                  {availableRooms.length > 0 ? (
                    availableRooms.map((room) => (
                      <label
                        key={room}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                      >
                        <div
                          onClick={() => handleRoomToggle(room)}
                          className="flex-shrink-0"
                        >
                          {selectedRooms.includes(room) ? (
                            <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          )}
                        </div>
                        <span className="text-xs sm:text-sm text-gray-700">
                          {room}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 p-2">
                      ไม่พบข้อมูลห้อง
                    </p>
                  )}
                </div>
              </div>

              {/* Problem type filter with checkboxes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  ประเภทปัญหา
                </label>
                <div className="space-y-2 bg-gray-50 p-2 sm:p-3 rounded-md">
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <div
                      onClick={() => handleProblemTypeToggle("hardware")}
                      className="flex-shrink-0"
                    >
                      {selectedProblemTypes.includes("hardware") ? (
                        <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center">
                      <HardDrive className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-red-600" />
                      <span className="text-xs sm:text-sm text-gray-700">
                        ฮาร์ดแวร์
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <div
                      onClick={() => handleProblemTypeToggle("software")}
                      className="flex-shrink-0"
                    >
                      {selectedProblemTypes.includes("software") ? (
                        <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center">
                      <Monitor className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-600" />
                      <span className="text-xs sm:text-sm text-gray-700">
                        ซอฟต์แวร์
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Status filter with checkboxes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  สถานะ
                </label>
                <div className="space-y-2 bg-gray-50 p-2 sm:p-3 rounded-md max-h-40 overflow-y-auto">
                  {summary.statuses.map((status) => (
                    <label
                      key={status.status_id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                    >
                      <div
                        onClick={() =>
                          handleStatusToggle(status.status_id.toString())
                        }
                        className="flex-shrink-0"
                      >
                        {selectedStatuses.includes(
                          status.status_id.toString()
                        ) ? (
                          <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center">
                        <span
                          className="w-3 h-3 rounded-full mr-1 sm:mr-2"
                          style={{ backgroundColor: status.color || "#888" }}
                        ></span>
                        <span className="text-xs sm:text-sm text-gray-700">
                          {status.status_name}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Date range filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                      value={dateRange.startDate}
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
                      value={dateRange.endDate}
                      onChange={(e) => handleDateChange(e, "endDate")}
                    />
                  </div>
                </div>
              </div>

              {/* Search filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  ค้นหา
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="ค้นหาด้วยรหัสครุภัณฑ์, ปัญหา..."
                    className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3 w-3 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter action buttons */}
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={handleResetFilters}
                className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                รีเซ็ต
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 border border-transparent rounded-md text-xs sm:text-sm font-medium text-white hover:bg-indigo-700"
              >
                ค้นหา
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 transition-all hover:shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">
              ปัญหาทั้งหมด
            </h3>
            <div className="flex items-center">
              <p className="text-xl sm:text-3xl font-bold text-gray-900">
                {summary.total || 0}
              </p>
              <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 ml-auto bg-indigo-100 rounded-full">
                <BarChart2 className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 transition-all hover:shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">
              เสร็จสิ้น
            </h3>
            <div className="flex items-center">
              <div>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">
                  {resolvedStatus.count || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {summary.total > 0
                    ? `(${Math.round(
                        (resolvedStatus.count / summary.total) * 100
                      )}%)`
                    : "(0%)"}
                </p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 ml-auto bg-green-100 rounded-full">
                <CheckSquare className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 transition-all hover:shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">
              อยู่ระหว่างดำเนินการ
            </h3>
            <div className="flex items-center">
              <div>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">
                  {inProgressCount}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {summary.total > 0
                    ? `(${Math.round(
                        (inProgressCount / summary.total) * 100
                      )}%)`
                    : "(0%)"}
                </p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 ml-auto bg-indigo-100 rounded-full">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 transition-all hover:shadow-md">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-2">
              ชำรุดเสียหาย
            </h3>
            <div className="flex items-center">
              <div>
                <p className="text-xl sm:text-3xl font-bold text-gray-900">
                  {damagedStatus.count || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {summary.total > 0
                    ? `(${Math.round(
                        (damagedStatus.count / summary.total) * 100
                      )}%)`
                    : "(0%)"}
                </p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 ml-auto bg-amber-100 rounded-full">
                <X className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Analysis Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Monthly Trends Chart */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6 border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              แนวโน้มปัญหารายเดือน
            </h3>
            {loading ? (
              <div className="flex justify-center items-center h-48 sm:h-64 lg:h-80">
                <div className="inline-block animate-spin w-6 h-6 sm:w-8 sm:h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : monthlyStats.length === 0 ? (
              <div className="flex justify-center items-center h-48 sm:h-64 lg:h-80 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <HelpCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">ไม่พบข้อมูลสำหรับการค้นหานี้</p>
                </div>
              </div>
            ) : (
              <div className="h-48 sm:h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyStats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" fontSize={isMobile ? 10 : 12} />
                    <YAxis fontSize={isMobile ? 10 : 12} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                    <Bar
                      dataKey="hardware"
                      name="ฮาร์ดแวร์"
                      fill={COLORS[0]}
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="software"
                      name="ซอฟต์แวร์"
                      fill={COLORS[1]}
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Problem type summary statistics */}
            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm font-medium text-indigo-800">
                      ฮาร์ดแวร์
                    </span>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                    {totalProblems > 0
                      ? `${Math.round((totalHardware / totalProblems) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-indigo-600">
                  {totalHardware}
                </p>
                <div className="w-full bg-indigo-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${
                        totalProblems > 0
                          ? Math.round((totalHardware / totalProblems) * 100)
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm font-medium text-emerald-800">
                      ซอฟต์แวร์
                    </span>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                    {totalProblems > 0
                      ? `${Math.round((totalSoftware / totalProblems) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">
                  {totalSoftware}
                </p>
                <div className="w-full bg-emerald-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full"
                    style={{
                      width: `${
                        totalProblems > 0
                          ? Math.round((totalSoftware / totalProblems) * 100)
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Graph 2: Problem Distribution by Status and Room */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-6 border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              การกระจายปัญหาตามสถานะและห้อง
            </h3>

            {/* Status breakdown chart */}
            {loading ? (
              <div className="flex justify-center items-center h-48 sm:h-64 lg:h-80">
                <div className="inline-block animate-spin w-6 h-6 sm:w-8 sm:h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : statusSummary.length === 0 ? (
              <div className="flex justify-center items-center h-48 sm:h-64 lg:h-80 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <HelpCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">ไม่พบข้อมูลสำหรับการค้นหานี้</p>
                </div>
              </div>
            ) : (
              <div className="h-48 sm:h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={isMobile ? 60 : 100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {statusSummary.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} รายการ`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Room distribution */}
            <div className="mt-2">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                ปัญหาตามห้อง (5 อันดับแรก)
              </h4>
              {roomStats.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {roomStats.slice(0, 5).map((room, index) => (
                    <div key={index} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <span
                            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          ></span>
                          <span className="text-xs sm:text-sm font-medium text-gray-700">
                            {room.room || "ไม่ระบุห้อง"}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm text-gray-500">
                          {room.total} รายการ
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 group-hover:h-2 sm:group-hover:h-3 transition-all">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round(
                              (room.total / (roomStats[0]?.total || 1)) * 100
                            )}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm">ไม่พบข้อมูลห้อง</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table for "เสร็จสิ้น" and "ชำรุดเสียหาย" Problems */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-6 sm:mb-8 overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  รายการปัญหาที่เสร็จสิ้นและชำรุด
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  แสดงรายการปัญหาที่มีสถานะ "เสร็จสิ้น" และ "ชำรุดเสียหาย"
                </p>
              </div>
            </div>
          </div>

          {/* Mobile View - Cards */}
          {isMobile && (
            <div className="p-3">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="inline-block animate-spin w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full mr-2" />
                  <span className="text-sm">กำลังโหลดข้อมูล...</span>
                </div>
              ) : completedProblems.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <AlertTriangle className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="font-medium text-sm">
                      ไม่พบข้อมูลรายการที่เสร็จสิ้นหรือชำรุด
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      ลองปรับตัวกรองหรือค้นหาด้วยคำค้นอื่น
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedProblems.map((problem, index) =>
                    renderMobileProblemCard(problem, index)
                  )}
                </div>
              )}

              {/* Mobile Pagination */}
              {completedProblems.length > 0 && (
                <div className="mt-4 border-t border-gray-200 pt-4">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ลำดับ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      อุปกรณ์
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รหัสครุภัณฑ์
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ห้อง
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ปัญหา
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเภทปัญหา
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้แจ้ง
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้รับผิดชอบ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-4 text-center">
                        <div className="flex justify-center items-center py-8">
                          <div className="inline-block animate-spin w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full mr-2" />
                          <span>กำลังโหลดข้อมูล...</span>
                        </div>
                      </td>
                    </tr>
                  ) : completedProblems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <HelpCircle className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="font-medium">
                            ไม่พบข้อมูลรายการที่เสร็จสิ้นหรือชำรุด
                          </p>
                          <p className="mt-1 text-sm">
                            ลองปรับตัวกรองหรือค้นหาด้วยคำค้นอื่น
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    completedProblems.map((problem, index) => {
                      const typeDetails = getProblemTypeDetails(
                        problem.problem_type
                      );

                      return (
                        <tr
                          key={problem.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {new Date(problem.created_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {problem.equipment_name || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {problem.equipment_id || "N/A"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {problem.equipment_room || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                            {problem.description}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs ${typeDetails.bgColor} ${typeDetails.textColor} border ${typeDetails.borderColor}`}
                            >
                              {typeDetails.icon}
                              <span>{typeDetails.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                                <User className="h-3 w-3 text-gray-500" />
                              </div>
                              <span className="text-sm text-gray-900">
                                {problem.reporter_name || "ไม่ระบุ"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                                <User className="h-3 w-3 text-gray-500" />
                              </div>
                              <span className="text-sm text-gray-900">
                                {problem.assigned_to_name || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor:
                                  problem.status_color ||
                                  (problem.status_id === 3
                                    ? "#ecfdf5"
                                    : "#fff7ed"),
                                color:
                                  problem.status_id === 3
                                    ? "#065f46"
                                    : "#9a3412",
                                borderWidth: "1px",
                                borderColor:
                                  problem.status_id === 3
                                    ? "#a7f3d0"
                                    : "#fed7aa",
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full mr-1.5"
                                style={{
                                  backgroundColor:
                                    problem.status_id === 3
                                      ? "#10b981"
                                      : "#f97316",
                                }}
                              ></span>
                              {problem.status_name || "ไม่ระบุสถานะ"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Desktop Pagination */}
              {completedProblems.length > 0 && (
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
      </div>
    </DashboardLayout>
  );
}

export default ProblemAnalysisPage;
