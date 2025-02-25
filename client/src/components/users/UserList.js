// src/components/users/UserList.js
import React, { useState, useEffect } from "react";
import { Trash2, Search as SearchIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import api from "../../utils/axios";
import Pagination from "../common/Pagination";
import ConfirmationDialog from "../common/ConfirmationDialog";

function UserList() {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Confirmation dialogs state
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    userId: null,
    username: "",
    isLoading: false,
  });

  const [roleConfirm, setRoleConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    userId: null,
    username: "",
    newRole: "",
    newRoleText: "",
    isLoading: false,
  });

  // Updated role options with your desired order
  const ROLE_OPTIONS = {
    reporter: "ผู้แจ้งปัญหา",
    equipment_assistant: "ผู้ช่วยดูแลครุภัณฑ์",
    equipment_manager: "ผู้จัดการครุภัณฑ์",
    admin: "ผู้ดูแลระบบ",
  };
  // Role priority for sorting (lower number = higher in list)
  const ROLE_PRIORITY = {
    reporter: 1,
    equipment_assistant: 2,
    equipment_manager: 3,
    admin: 4,
  };

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter users based on search query
  useEffect(() => {
    const filtered = users.filter((user) => {
      if (!debouncedSearch) return true;

      const searchLower = debouncedSearch.toLowerCase();
      return (
        (user.username || "").toLowerCase().includes(searchLower) ||
        (user.firstname || "").toLowerCase().includes(searchLower) ||
        (user.lastname || "").toLowerCase().includes(searchLower) ||
        (user.branch || "").toLowerCase().includes(searchLower) ||
        (getRoleText(user.role) || "").toLowerCase().includes(searchLower)
      );
    });

    // Calculate pages after filtering
    setFilteredUsers(filtered);
    setTotalPages(Math.ceil(filtered.length / pageSize));
  }, [debouncedSearch, users, pageSize]);

  const getAvailableRoles = (currentUserRole) => {
    if (currentUserRole === "admin") {
      return ROLE_OPTIONS;
    } else if (currentUserRole === "equipment_manager") {
      return {
        reporter: ROLE_OPTIONS.reporter,
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      if (response.data.success) {
        // Sort users by role priority when they are fetched
        const sortedUsers = [...response.data.data].sort((a, b) => {
          return (ROLE_PRIORITY[a.role] || 99) - (ROLE_PRIORITY[b.role] || 99);
        });
        setUsers(sortedUsers);
        setFilteredUsers(sortedUsers);
        setTotalPages(Math.ceil(sortedUsers.length / pageSize));
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      showError("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChangeClick = (userId, username, newRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || !canModifyRole(targetUser) || updating) return;

    if (newRole === "equipment_manager" && currentUser.role !== "admin") {
      showError(
        "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถกำหนดสิทธิ์ผู้จัดการครุภัณฑ์ได้"
      );
      return;
    }

    setRoleConfirm({
      isOpen: true,
      title: "ยืนยันการเปลี่ยนสิทธิ์การใช้งาน",
      message: `คุณต้องการเปลี่ยนสิทธิ์การใช้งานของ "${username}" เป็น "${getRoleText(
        newRole
      )}" ใช่หรือไม่?`,
      userId,
      username,
      newRole,
      newRoleText: getRoleText(newRole),
      isLoading: false,
    });
  };

  const handleConfirmRoleChange = async () => {
    setRoleConfirm((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.patch(`/users/${roleConfirm.userId}/role`, {
        role: roleConfirm.newRole,
      });
      if (response.data.success) {
        await fetchUsers();
        showSuccess(
          `เปลี่ยนสิทธิ์ผู้ใช้เป็น ${roleConfirm.newRoleText} สำเร็จ`
        );
      }
    } catch (err) {
      console.error("Error updating role:", err);
      showError(
        err.response?.data?.message || "ไม่สามารถอัพเดทสิทธิ์การใช้งาน"
      );
    } finally {
      setRoleConfirm((prev) => ({ ...prev, isOpen: false, isLoading: false }));
    }
  };

  const handleDeleteClick = (userId, username) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || !canDeleteUser(targetUser)) {
      showError("ไม่สามารถลบผู้ใช้นี้ได้");
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      title: "ยืนยันการลบผู้ใช้",
      message: `คุณต้องการลบผู้ใช้ "${username}" ใช่หรือไม่?`,
      userId,
      username,
      isLoading: false,
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.delete(`/users/${deleteConfirm.userId}`);
      if (response.data.success) {
        showSuccess(`ลบผู้ใช้ ${deleteConfirm.username} สำเร็จ`);
        await fetchUsers();
      }
    } catch (err) {
      console.error("Delete error:", err);
      showError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการลบผู้ใช้งาน"
      );
    } finally {
      setDeleteConfirm((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
    }
  };

  // Get paginated data
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading && users.length === 0) {
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
              {debouncedSearch && `จากการค้นหา "${debouncedSearch}"`}
            </p>
          </div>
        </div>

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
              {paginatedUsers.map((user) => (
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
                      onChange={(e) =>
                        handleRoleChangeClick(
                          user.id,
                          user.username,
                          e.target.value
                        )
                      }
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
                      onClick={() => handleDeleteClick(user.id, user.username)}
                      disabled={!canDeleteUser(user)}
                      className={`text-red-600 hover:text-red-900 
                        disabled:opacity-50 disabled:cursor-not-allowed 
                        transition-colors`}
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

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        isLoading={deleteConfirm.isLoading}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Role Change Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={roleConfirm.isOpen}
        onClose={() => setRoleConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmRoleChange}
        title={roleConfirm.title}
        message={roleConfirm.message}
        isLoading={roleConfirm.isLoading}
        confirmText="เปลี่ยน"
        cancelText="ยกเลิก"
        confirmButtonClass="bg-indigo-600 hover:bg-indigo-700"
      />
    </div>
  );
}

export default UserList;
