import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Filter, Trash2 } from "lucide-react";
import api from "../utils/axios";

function ProblemAnalyticsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [filters, setFilters] = useState({
    status: [],  // Will store status IDs
    type: [],    // Will store problem types
  });

  const getProblemTypeStats = () => {
    const stats = problems.reduce((acc, problem) => {
      const type =
        problem.problem_type === "hardware" ? "ฮาร์ดแวร์" : "ซอฟต์แวร์";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const getRoomStats = () => {
    const stats = problems.reduce((acc, problem) => {
      acc[problem.room] = (acc[problem.room] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const fetchProblems = async () => {
    try {
      const response = await api.get("/problems");
      let filteredData = response.data.data.filter(
        (problem) => problem.status_id === 3 || problem.status_id === 8
      );

      // Apply status filter if selected
      if (filters.status.length > 0) {
        filteredData = filteredData.filter((problem) =>
          filters.status.includes(problem.status_id)
        );
      }

      // Apply type filter if selected
      if (filters.type.length > 0) {
        filteredData = filteredData.filter((problem) =>
          filters.type.includes(problem.problem_type)
        );
      }

      setProblems(filteredData);
      setLoading(false);
    } catch (error) {
      setError("ไม่สามารถดึงข้อมูลได้");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [filters]); // Re-fetch when filters change

  const handleDelete = async (ids) => {
    if (!window.confirm(`ยืนยันการลบ ${ids.length} รายการ?`)) return;

    try {
      await Promise.all(ids.map((id) => api.delete(`/problems/${id}`)));
      await fetchProblems();
      setSelectedProblems([]);
    } catch (error) {
      setError("ไม่สามารถลบรายการได้");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            รายการแจ้งปัญหาที่เสร็จสิ้นและชำรุดเสียหาย
          </h1>
          {selectedProblems.length > 0 && (
            <button
              onClick={() => handleDelete(selectedProblems)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              ลบรายการที่เลือก ({selectedProblems.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">สัดส่วนประเภทปัญหา</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getProblemTypeStats()}>
                  <XAxis dataKey="name" />
                  <YAxis tickCount={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">
              ห้องที่พบปัญหามากที่สุด
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getRoomStats()}>
                  <XAxis dataKey="name" />
                  <YAxis tickCount={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">สถานะ</label>
              <div className="space-x-2">
                {[
                  { id: 3, name: "เสร็จสิ้น" },
                  { id: 8, name: "ชำรุดเสียหาย" }
                ].map((status) => (
                  <label key={status.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status.id)}
                      onChange={() => {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status.includes(status.id)
                            ? prev.status.filter(s => s !== status.id)
                            : [...prev.status, status.id]
                        }));
                      }}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="ml-2 text-sm">{status.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                ประเภทปัญหา
              </label>
              <div className="space-x-2">
                {["hardware", "software"].map((type) => (
                  <label key={type} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type)}
                      onChange={() => {
                        setFilters(prev => ({
                          ...prev,
                          type: prev.type.includes(type)
                            ? prev.type.filter(t => t !== type)
                            : [...prev.type, type]
                        }));
                      }}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="ml-2 text-sm">
                      {type === "hardware" ? "ฮาร์ดแวร์" : "ซอฟต์แวร์"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-4 p-4">
                  <input
                    type="checkbox"
                    checked={selectedProblems.length === problems.length}
                    onChange={(e) =>
                      setSelectedProblems(
                        e.target.checked ? problems.map((p) => p.id) : []
                      )
                    }
                    className="rounded border-gray-300 text-indigo-600"
                  />
                </th>
                {[
                  "ลำดับ",
                  "วันที่",
                  "อุปกรณ์",
                  "รหัสครุภัณฑ์",
                  "ห้อง",
                  "ปัญหา",
                  "ประเภท",
                  "สถานะ",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {problems.map((problem, index) => (
                <tr key={problem.id} className="hover:bg-gray-50">
                  <td className="w-4 p-4">
                    <input
                      type="checkbox"
                      checked={selectedProblems.includes(problem.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProblems([...selectedProblems, problem.id]);
                        } else {
                          setSelectedProblems(
                            selectedProblems.filter((id) => id !== problem.id)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm">{index + 1}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(problem.created_at).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-6 py-4 text-sm">{problem.equipment_name}</td>
                  <td className="px-6 py-4 text-sm">{problem.equipment_id}</td>
                  <td className="px-6 py-4 text-sm">{problem.room}</td>
                  <td className="px-6 py-4 text-sm">{problem.description}</td>
                  <td className="px-6 py-4 text-sm">
                    {problem.problem_type === "hardware"
                      ? "ฮาร์ดแวร์"
                      : "ซอฟต์แวร์"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 text-xs rounded-full"
                      style={{
                        backgroundColor: problem.status_color,
                        color: "#000000",
                      }}
                    >
                      {problem.status_name}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {problems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              ไม่พบรายการที่ตรงกับเงื่อนไข
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProblemAnalyticsPage;