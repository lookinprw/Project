// src/components/layout/Sidebar.js
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  LogOut,
  MessageCircle,
  Wrench,
  Users,
  AlertCircle,
  User,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/logo.png"; // Make sure to import the logo

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth(); // Changed from currentUser to user
  const location = useLocation();

  // Use user instead of currentUser
  const isAdmin = ["admin", "equipment_manager"].includes(user?.role);
  const canManageEquip = ["admin", "equipment_manager"].includes(user?.role);
  const canViewUnfix = ["admin", "equipment_manager"].includes(user?.role);

  const isActivePath = (path) => location.pathname === path;

  const getRoleText = (role) => {
    const roleLabels = {
      admin: "ผู้ดูแลระบบ",
      student: "นักศึกษา",
      equipment_manager: "ผู้จัดการครุภัณฑ์",
      equipment_assistant: "ผู้ช่วยดูแลครุภัณฑ์",
    };
    return roleLabels[role] || role;
  };

  const menuItems = [
    {
      path: "/dashboard",
      icon: <MessageCircle size={20} />,
      text: "แจ้งปัญหา",
      show: true,
    },
    {
      path: "/equipment",
      icon: <Wrench size={20} />,
      text: "จัดการครุภัณฑ์",
      show: canManageEquip,
    },
    {
      path: "/unfixable",
      icon: <AlertCircle size={20} />,
      text: "รายการที่ไม่สามารถแก้ไขได้",
      show: canViewUnfix,
    },
    {
      path: "/users",
      icon: <Users size={20} />,
      text: "จัดการผู้ใช้",
      show: isAdmin,
    },
  ];

  return (
    <div
      className={`fixed left-0 top-0 bottom-0 
        ${isOpen ? "w-64" : "w-20"} 
        bg-gradient-to-b from-indigo-600 to-indigo-800 text-white transition-all duration-300 ease-in-out
        shadow-xl z-50`}
    >
      {/* Header with Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-indigo-500/30">
        {isOpen ? (
          <div className="flex items-center space-x-2">
            <img src={Logo} alt="Logo" className="h-8 w-8 object-contain" />
            <h2 className="font-bold text-xl">IT Support</h2>
          </div>
        ) : (
          <span className="mx-auto">
            <img src={Logo} alt="Logo" className="h-8 w-8 object-contain" />
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-indigo-700 rounded-lg transition-colors duration-200"
        >
          <Menu
            size={20}
            className="transform transition-transform duration-200"
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4">
        {menuItems.map(
          (item, index) =>
            item.show && (
              <Link
                key={index}
                to={item.path}
                className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200
                ${
                  isActivePath(item.path)
                    ? "bg-indigo-700 shadow-lg"
                    : "hover:bg-indigo-700/50"
                }
                group relative overflow-hidden`}
              >
                <span className="relative z-10 flex items-center">
                  {item.icon}
                  {isOpen && (
                    <span className="ml-3 font-medium tracking-wide">
                      {item.text}
                    </span>
                  )}
                </span>
                {isActivePath(item.path) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 to-indigo-800/50" />
                )}
                {!isOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-indigo-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs whitespace-nowrap">
                    {item.text}
                  </div>
                )}
              </Link>
            )
        )}
      </nav>

      {/* User Profile */}
      {isOpen && user && (
        <Link
          to="/profile"
          className="absolute bottom-20 left-0 right-0 px-4 group"
        >
          <div
            className="bg-indigo-700/50 backdrop-blur-sm rounded-lg p-4 border border-indigo-500/30
                        hover:bg-indigo-700/70 transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-600 p-2 rounded-full">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {user.firstname} {user.lastname}
                </p>
                <p className="text-xs text-indigo-200">
                  {getRoleText(user.role)}
                </p>

                {/* LINE Connection Status */}
                <div className="mt-2 flex items-center text-xs">
                  <MessageSquare size={14} className="mr-1" />
                  {user.line_user_id ? (
                    <span className="text-green-300">เชื่อมต่อ LINE แล้ว</span>
                  ) : (
                    <span className="text-yellow-300">
                      ยังไม่ได้เชื่อมต่อ LINE
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight
                size={16}
                className="text-indigo-300 group-hover:translate-x-1 transition-transform duration-200"
              />
            </div>
          </div>
        </Link>
      )}

      {/* Logout Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-red-500/20 text-red-100 transition-colors duration-200
                   hover:shadow-lg group relative"
        >
          <LogOut size={20} />
          {isOpen && <span className="ml-3 font-medium">ออกจากระบบ</span>}
          {!isOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-red-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs whitespace-nowrap">
              ออกจากระบบ
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
