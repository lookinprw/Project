// pages/ComputerCenterPage.js
import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { AlertCircle} from "lucide-react";
import api from "../utils/axios";

function ComputerCenterPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Fetch only referred_to_cc problems
  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusesRes, problemsRes] = await Promise.all([
        api.get("/status"),
        api.get("/problems"),
      ]);

      if (statusesRes.data.success) {
        setStatuses(statusesRes.data.data);
      }

      if (problemsRes.data.success) {
        const referredProblems = problemsRes.data.data.filter(
          (problem) => problem.status_id === 7 // Computer Center ID
        );
        setProblems(referredProblems);
      }
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (statusId) => {
    if (selectedProblems.length === 0) {
      setError("กรุณาเลือกรายการที่ต้องการอัพเดทสถานะ");
      return;
    }
  
    const statusMessages = {
      8: "ชำรุดเสียหาย",
      3: "เสร็จสิ้น",
    };
  
    const confirmMessage = statusMessages[statusId];
    if (!confirmMessage) {
      setError("ไม่พบสถานะที่ต้องการ");
      return;
    }
  
    if (
      !window.confirm(
        `ยืนยันการเปลี่ยนสถานะเป็น ${confirmMessage} จำนวน ${selectedProblems.length} รายการ?`
      )
    ) {
      return;
    }
  
    try {
      setUpdating(true);
      setError("");
  
      await Promise.all(
        selectedProblems.map((problemId) =>
          api.patch(`/problems/${problemId}/status`, {
            status_id: statusId,
            comment: confirmMessage,
          })
        )
      );
  
      setSelectedProblems([]);
      await fetchData();
    } catch (err) {
      console.error("Error updating status:", err);
      setError("ไม่สามารถอัพเดทสถานะได้");
    } finally {
      setUpdating(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProblems(problems.map((p) => p.id));
    } else {
      setSelectedProblems([]);
    }
  };

  const handleSelectProblem = (problemId) => {
    setSelectedProblems((prev) => {
      if (prev.includes(problemId)) {
        return prev.filter((id) => id !== problemId);
      } else {
        return [...prev, problemId];
      }
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              รายการส่งซ่อมศูนย์คอมพิวเตอร์
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {problems.length > 0
                ? `พบ ${problems.length} รายการที่ส่งซ่อมศูนย์คอมพิวเตอร์`
                : "ไม่พบรายการที่ส่งซ่อมศูนย์คอมพิวเตอร์"}
            </p>
          </div>

          {problems.length > 0 && (
            <div className="space-x-4">
              <button
                onClick={() => handleBulkStatusUpdate(8)}
                disabled={updating || selectedProblems.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                ชำรุดเสียหาย
              </button>
              <button
                onClick={() => handleBulkStatusUpdate(3)}
                disabled={updating || selectedProblems.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                เสร็จสิ้น
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    checked={selectedProblems.length === problems.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ลำดับ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  อุปกรณ์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  รหัสครุภัณฑ์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ห้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ปัญหา
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  วันที่ส่งซ่อม
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {problems.map((problem, index) => (
                <tr key={problem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProblems.includes(problem.id)}
                      onChange={() => handleSelectProblem(problem.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.equipment_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.equipment_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.equipment_room}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {problem.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(problem.updated_at).toLocaleDateString("th-TH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {problems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                ไม่พบรายการที่ส่งซ่อมศูนย์คอมพิวเตอร์
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ComputerCenterPage;
