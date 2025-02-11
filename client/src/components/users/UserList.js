import React, { useState, useEffect } from "react";
import { Trash2, Search as SearchIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";

function UserList() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const ROLE_OPTIONS = {
    admin: "ผู้ดูแลระบบ",
    reporter: "ผู้แจ้งปัญหา",
    equipment_manager: "ผู้จัดการครุภัณฑ์",
    equipment_assistant: "ผู้ช่วยดูแลครุภัณฑ์",
  };

  const getAvailableRoles = (currentUserRole) => {
    if (currentUserRole === "admin") {
      return ROLE_OPTIONS;
    } else if (currentUserRole === "equipment_manager") {
      return {
        student: ROLE_OPTIONS.reporter,
        equipment_assistant: ROLE_OPTIONS.equipment_assistant,
      };
    }
    return {};
  };

  const canModifyRole = (targetUser) => {
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "equipment_manager") {
      return !["admin", "equipment_manager"].includes(targetUser.role);
    }
    return false;
  };

  const canDeleteUser = (targetUser) => {
    if (targetUser.username === currentUser.username) return false;
    if (targetUser.role === "admin") return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "equipment_manager") {
      return !["admin", "equipment_manager"].includes(targetUser.role);
    }
    return false;
  };

  const getRoleText = (role) => ROLE_OPTIONS[role] || role;

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "equipment_manager":
        return "bg-blue-100 text-blue-700";
      case "equipment_assistant":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter((user) => {
      if (!searchQuery) return true;

      const searchLower = searchQuery.toLowerCase();
      return (
        (user.username || "").toLowerCase().includes(searchLower) ||
        (user.firstname || "").toLowerCase().includes(searchLower) ||
        (user.lastname || "").toLowerCase().includes(searchLower) ||
        (user.branch || "").toLowerCase().includes(searchLower) ||
        (getRoleText(user.role) || "").toLowerCase().includes(searchLower)
      );
    });

    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      if (response.data.success) {
        setUsers(response.data.data);
        setFilteredUsers(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || !canModifyRole(targetUser) || updating) return;

    try {
      setUpdating(userId);
      setError("");
      const response = await api.patch(`/users/${userId}/role`, {
        role: newRole,
      });
      if (response.data.success) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Error updating role:", err);
      setError(err.response?.data?.message || "ไม่สามารถอัพเดทสิทธิ์การใช้งาน");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId, studentId) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || !canDeleteUser(targetUser)) {
      setError("ไม่สามารถลบผู้ใช้นี้ได้");
      return;
    }

    if (!window.confirm(`ยืนยันการลบผู้ใช้ ${studentId}?`)) return;

    try {
      setDeleteLoading(userId);
      setError("");
      const response = await api.delete(`/users/${userId}`);
      if (response.data.success) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการลบผู้ใช้งาน");
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="mb-6">
          <div className="max-w-md">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              ค้นหาผู้ใช้งาน
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัสผู้ใช้, ชื่อ, นามสกุล, สาขา..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white 
                          placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              พบ {filteredUsers.length} รายการ{" "}
              {searchQuery && `จากการค้นหา "${searchQuery}"`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รหัสผู้ใช้
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อ-นามสกุล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สาขา
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สิทธิ์การใช้งาน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.firstname} {user.lastname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.branch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => {
                        if (
                          e.target.value === "equipment_manager" &&
                          currentUser.role !== "admin"
                        ) {
                          setError(
                            "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถกำหนดสิทธิ์ผู้จัดการครุภัณฑ์ได้"
                          );
                          return;
                        }
                        handleRoleChange(user.id, e.target.value);
                      }}
                      disabled={!canModifyRole(user) || updating === user.id}
                      className={`block w-40 py-1 px-2 border rounded-md text-sm font-medium
                        ${getRoleBadgeColor(
                          user.role
                        )} border-0 focus:ring-2 focus:ring-indigo-500`}
                    >
                      <option value={user.role}>
                        {ROLE_OPTIONS[user.role]}
                      </option>
                      {canModifyRole(user) &&
                        Object.entries(getAvailableRoles(currentUser.role))
                          .filter(([key]) => key !== user.role)
                          .map(([key, value]) => (
                            <option key={key} value={key}>
                              {value}
                            </option>
                          ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={
                        !canDeleteUser(user) || deleteLoading === user.id
                      }
                      className={`text-red-600 hover:text-red-900 
                        disabled:opacity-50 disabled:cursor-not-allowed 
                        transition-colors ${
                          deleteLoading === user.id ? "opacity-50" : ""
                        }`}
                      title={
                        !canDeleteUser(user)
                          ? "ไม่สามารถลบผู้ใช้นี้ได้"
                          : "ลบผู้ใช้"
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery
                  ? "ไม่พบผู้ใช้งานที่ตรงกับการค้นหา"
                  : "ไม่พบข้อมูลผู้ใช้งาน"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserList;
