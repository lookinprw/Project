import React, { useState, useEffect } from "react";
import api from "../../utils/axios";

function UnfixableProblems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUnfixableProblems();
  }, []);

  const fetchUnfixableProblems = async () => {
    try {
      setLoading(true);
      const response = await api.get("/problems/unfixable");
      if (response.data.success) {
        setProblems(response.data.data);
        console.log("Unfixable problems:", response.data.data); // Debug log
      }
    } catch (err) {
      console.error("Error fetching unfixable problems:", err);
      setError("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-t-lg">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                เหตุผล
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ผู้แจ้ง
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                สถานะอุปกรณ์
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {problems.map((problem) => (
              <tr key={problem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{problem.equipment_name}</td>
                <td className="px-6 py-4">{problem.equipment_id}</td>
                <td className="px-6 py-4">{problem.room}</td>
                <td className="px-6 py-4 max-w-xs">
                  <div className="text-sm text-gray-900 truncate">
                    {problem.description}
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <div className="text-sm text-red-600">
                    {problem.cannot_fix_reason}
                  </div>
                </td>
                <td className="px-6 py-4">{problem.reporter_name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    ไม่พร้อมใช้งาน
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {problems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            ไม่พบรายการที่ไม่สามารถแก้ไขได้
          </div>
        )}
      </div>
    </div>
  );
}

export default UnfixableProblems;
