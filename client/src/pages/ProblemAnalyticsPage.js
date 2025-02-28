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
} from "lucide-react";
import Pagination from "../components/common/Pagination";
import { CheckSquare, Square } from "lucide-react";

function ProblemAnalysisPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [roomStats, setRoomStats] = useState([]);
  const [summary, setSummary] = useState({ statuses: [], total: 0 });
  const [completedProblems, setCompletedProblems] = useState([]);

  // Pagination for the completed problems table
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Filter states
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [selectedProblemType, setSelectedProblemType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Add these state variables to your component
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedProblemTypes, setSelectedProblemTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  // Colors for charts
  const COLORS = [
    "#0088FE", // blue
    "#00C49F", // teal
    "#FFBB28", // yellow
    "#FF8042", // orange
    "#8884D8", // purple
    "#82ca9d", // green
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

      console.log("Fetching data with params:", params.toString());

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

  const handleRoomChange = (e) => {
    setSelectedRoom(e.target.value);
  };

  const handleProblemTypeChange = (e) => {
    setSelectedProblemType(e.target.value);
  };

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

  if (!hasPermission) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">
              ไม่มีสิทธิ์เข้าถึง
            </h2>
            <p className="mt-2 text-gray-600">
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
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <p className="mt-4 text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
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
      color: "#00C49F",
    },
    {
      name: "ชำรุดเสียหาย",
      value: parseInt(damagedStatus.count) || 0,
      color: "#FF8042",
    },
    { name: "อยู่ระหว่างดำเนินการ", value: inProgressCount, color: "#8884D8" },
  ].filter((item) => item.value > 0); // Filter out zero values

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            การวิเคราะห์ข้อมูลปัญหา
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            วิเคราะห์ข้อมูลสถิติของปัญหาครุภัณฑ์คอมพิวเตอร์ทั้งหมด
          </p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium">ตัวกรอง</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {/* Room filter with checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ห้อง
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableRooms.map((room) => (
                  <label
                    key={room}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <div
                      onClick={() => handleRoomToggle(room)}
                      className="flex-shrink-0"
                    >
                      {selectedRooms.includes(room) ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{room}</span>
                  </label>
                ))}
                {availableRooms.length === 0 && (
                  <p className="text-sm text-gray-500">ไม่พบข้อมูลห้อง</p>
                )}
              </div>
            </div>

            {/* Problem type filter with checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภทปัญหา
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <div
                    onClick={() => handleProblemTypeToggle("hardware")}
                    className="flex-shrink-0"
                  >
                    {selectedProblemTypes.includes("hardware") ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">ฮาร์ดแวร์</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <div
                    onClick={() => handleProblemTypeToggle("software")}
                    className="flex-shrink-0"
                  >
                    {selectedProblemTypes.includes("software") ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">ซอฟต์แวร์</span>
                </label>
              </div>
            </div>

            {/* Status filter with checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สถานะ
              </label>
              <div className="space-y-2">
                {summary.statuses.map((status) => (
                  <label
                    key={status.status_id}
                    className="flex items-center space-x-2 cursor-pointer"
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
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: status.color || "#888" }}
                      ></span>
                      <span className="text-sm text-gray-700">
                        {status.status_name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Date range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    value={dateRange.startDate}
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
                    value={dateRange.endDate}
                    onChange={(e) => handleDateChange(e, "endDate")}
                  />
                </div>
              </div>
            </div>

            {/* Search filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ค้นหา
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="ค้นหาด้วยรหัสครุภัณฑ์, ปัญหา..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter action buttons */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              รีเซ็ต
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700"
            >
              ค้นหา
            </button>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              ปัญหาทั้งหมด
            </h3>
            <p className="text-3xl font-bold text-indigo-600">
              {summary.total || 0}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              เสร็จสิ้น
            </h3>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-green-600">
                {resolvedStatus.count || 0}
              </p>
              <span className="text-sm text-gray-500 ml-2">
                {summary.total > 0
                  ? `(${Math.round(
                      (resolvedStatus.count / summary.total) * 100
                    )}%)`
                  : "(0%)"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              อยู่ระหว่างดำเนินการ
            </h3>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-purple-600">
                {inProgressCount}
              </p>
              <span className="text-sm text-gray-500 ml-2">
                {summary.total > 0
                  ? `(${Math.round((inProgressCount / summary.total) * 100)}%)`
                  : "(0%)"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              ชำรุดเสียหาย
            </h3>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-orange-600">
                {damagedStatus.count || 0}
              </p>
              <span className="text-sm text-gray-500 ml-2">
                {summary.total > 0
                  ? `(${Math.round(
                      (damagedStatus.count / summary.total) * 100
                    )}%)`
                  : "(0%)"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Analysis Graphs - Just 2 key graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Graph 1: Monthly Trends by Problem Type */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              แนวโน้มปัญหารายเดือน
            </h3>
            {loading ? (
              <div className="flex justify-center items-center h-80">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : monthlyStats.length === 0 ? (
              <div className="flex justify-center items-center h-80 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>ไม่พบข้อมูลสำหรับการค้นหานี้</p>
                </div>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyStats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="hardware"
                      name="ฮาร์ดแวร์"
                      fill="#0088FE"
                      stackId="a"
                    />
                    <Bar
                      dataKey="software"
                      name="ซอฟต์แวร์"
                      fill="#00C49F"
                      stackId="a"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Problem type summary statistics */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <HardDrive className="w-4 h-4 text-blue-600 mr-1" />
                  <span className="text-sm font-medium text-blue-800">
                    ฮาร์ดแวร์
                  </span>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {totalHardware}
                </p>
                <p className="text-xs text-blue-500">
                  {totalProblems > 0
                    ? `${Math.round((totalHardware / totalProblems) * 100)}%`
                    : "0%"}
                </p>
              </div>

              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center mb-1">
                  <Monitor className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm font-medium text-green-800">
                    ซอฟต์แวร์
                  </span>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {totalSoftware}
                </p>
                <p className="text-xs text-green-500">
                  {totalProblems > 0
                    ? `${Math.round((totalSoftware / totalProblems) * 100)}%`
                    : "0%"}
                </p>
              </div>
            </div>
          </div>

          {/* Graph 2: Problem Distribution by Room and Status */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              การกระจายปัญหาตามสถานะและห้อง
            </h3>

            {/* Status breakdown chart */}
            {loading ? (
              <div className="flex justify-center items-center h-80">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : statusSummary.length === 0 ? (
              <div className="flex justify-center items-center h-80 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>ไม่พบข้อมูลสำหรับการค้นหานี้</p>
                </div>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value, percent }) =>
                        value > 0
                          ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                          : ""
                      }
                    >
                      {statusSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Room distribution */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                ปัญหาตามห้อง (5 อันดับแรก)
              </h4>
              {roomStats.length > 0 ? (
                <div className="space-y-2">
                  {roomStats.slice(0, 5).map((room, index) => (
                    <div key={index} className="flex items-center">
                      <span
                        className="w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></span>
                      <span className="text-sm text-gray-700 mr-2">
                        {room.room || "ไม่ระบุห้อง"}:
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{
                            width: `${Math.round(
                              (room.total / (roomStats[0]?.total || 1)) * 100
                            )}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 ml-2">
                        {room.total}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  ไม่พบข้อมูลห้อง
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table for "เสร็จสิ้น" and "ชำรุดเสียหาย" Problems */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              รายการปัญหาที่เสร็จสิ้นและชำรุด
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              แสดงรายการปัญหาที่มีสถานะ "เสร็จสิ้น" และ "ชำรุดเสียหาย"
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
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
                    ผู้รับผิดชอบ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center py-4">
                        <div className="inline-block animate-spin w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full mr-2" />
                        <span>กำลังโหลดข้อมูล...</span>
                      </div>
                    </td>
                  </tr>
                ) : completedProblems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <svg
                          className="w-16 h-16 text-gray-400 mb-4"
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
                        className="hover:bg-gray-50/50 transition-colors duration-150"
                      >
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
                            className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs ${typeDetails.bgColor} ${typeDetails.textColor} border ${typeDetails.borderColor}`}
                          >
                            {typeDetails.icon}
                            <span>{typeDetails.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {problem.reporter_name || "ไม่ระบุ"}
                            </span>
                          </div>
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
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor:
                                problem.status_color ||
                                (problem.status_id === 3
                                  ? "#ecfdf5"
                                  : "#fff7ed"),
                              color:
                                problem.status_id === 3 ? "#065f46" : "#9a3412",
                              borderWidth: "1px",
                              borderColor:
                                problem.status_id === 3 ? "#a7f3d0" : "#fed7aa",
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
          </div>

          {/* Pagination for the table */}
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
      </div>
    </DashboardLayout>
  );
}

export default ProblemAnalysisPage;
