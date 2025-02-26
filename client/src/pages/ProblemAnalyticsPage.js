import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
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

function ProblemAnalysisPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();

  // State
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [roomStats, setRoomStats] = useState([]);
  const [summary, setSummary] = useState({ statuses: [], total: 0 });

  // Colors for charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82ca9d",
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

  // Fetch data
  useEffect(() => {
    if (!hasPermission) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [monthlyResponse, roomsResponse, summaryResponse] =
          await Promise.all([
            api.get("/problems/stats/monthly"),
            api.get("/problems/stats/rooms"),
            api.get("/problems/stats/summary"),
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
        }

        // Process summary stats
        if (summaryResponse.data.success) {
          setSummary(summaryResponse.data.data);
        }
      } catch (error) {
        console.error("Error fetching analysis data:", error);
        showError("ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hasPermission, showError]);

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

  if (loading) {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            การวิเคราะห์ข้อมูลปัญหา
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            วิเคราะห์ข้อมูลสถิติของปัญหาครุภัณฑ์คอมพิวเตอร์ทั้งหมด
          </p>
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

          {summary.statuses.slice(0, 3).map((status, index) => (
            <div
              key={status.status_id}
              className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {status.status_name}
              </h3>
              <div className="flex items-center">
                <p
                  className="text-3xl font-bold"
                  style={{ color: status.status_color || "#4F46E5" }}
                >
                  {status.count}
                </p>
                <span className="text-sm text-gray-500 ml-2">
                  {summary.total > 0
                    ? `(${Math.round((status.count / summary.total) * 100)}%)`
                    : "(0%)"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trends */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              แนวโน้มรายเดือน
            </h3>
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
                  <Bar dataKey="hardware" name="ฮาร์ดแวร์" fill="#0088FE" />
                  <Bar dataKey="software" name="ซอฟต์แวร์" fill="#00C49F" />
                  <Bar dataKey="other" name="อื่นๆ" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Problems by Room */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              ปัญหาตามห้อง (30 วันล่าสุด)
            </h3>
            <div className="h-80">
              {roomStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomStats}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="room"
                      label={({ room, total, percent }) =>
                        `${room}: ${total} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {roomStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        value,
                        `ห้อง ${props.payload.room}`,
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">
                    ไม่มีข้อมูลในช่วง 30 วันที่ผ่านมา
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Problem Status Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            การกระจายตามสถานะ
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ร้อยละ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.statuses.map((status) => (
                  <tr key={status.status_id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: status.status_color }}
                        ></span>
                        <span className="text-sm font-medium text-gray-900">
                          {status.status_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {status.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.total > 0
                        ? `${((status.count / summary.total) * 100).toFixed(
                            2
                          )}%`
                        : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProblemAnalysisPage;
