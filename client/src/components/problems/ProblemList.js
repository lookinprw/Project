import React, { useState, useEffect } from "react";
import { Trash2, Search as SearchIcon } from "lucide-react";
import api from "../../utils/axios";

function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/problems"), api.get("/status")]).then(
      ([problemsRes, statusesRes]) => {
        setProblems(problemsRes.data.data);
        setStatuses(statusesRes.data.data);
        setLoading(false);
      }
    );
  }, []);

  const getStatusDetails = (statusId) => {
    return (
      statuses.find((s) => s.id === statusId) || {
        name: "ไม่ระบุ",
        color: "#666666",
      }
    );
  };

  const getStatusFilters = () => {
    const resolvedId = 3;
    const damagedId = 8;
    
    return [
      { id: resolvedId, label: "เสร็จสิ้น" },
      { id: damagedId, label: "ชำรุดเสียหาย" }
    ];
  };
  
  

  const handleStatusChange = async (problemId, newStatusId) => {
    try {
      await api.patch(`/problems/${problemId}/status`, {
        status_id: newStatusId,
      });
      const response = await api.get("/problems");
      setProblems(response.data.data);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        // In your ProblemList component
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
              {(user?.role === "admin" ||
                user?.role === "equipment_manager" ||
                user?.role === "equipment_assistant") && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {problems.map((problem, index) => (
              <tr key={problem.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(problem.created_at).toLocaleDateString("th-TH")}
                </td>
                {/* ... other columns ... */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {problem.equipment_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {problem.equipment_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {problem.room}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {problem.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {problem.problem_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {problem.reporter_name}
                </td>
                {(user?.role === "admin" ||
                  user?.role === "equipment_manager" ||
                  user?.role === "equipment_assistant") && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <StatusSelect
                      problem={problem}
                      statuses={statuses}
                      onStatusChange={handleStatusChange}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProblemList;
