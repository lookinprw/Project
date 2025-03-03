// components/layout/DashboardLayout.js
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react"; // Import ChevronRight icon
import Sidebar from "./Sidebar";

function DashboardLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartXRef = useRef(null);

  // Check if device is mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // On desktop, keep sidebar open
      if (!mobile) {
        setSidebarOpen(true);
      }
    };

    // Check initially
    checkIfMobile();

    // Add resize listener
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Touch event handlers for swipe
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartXRef.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchStartX = touchStartXRef.current;
    const swipeDistance = touchEndX - touchStartX;

    // For right swipe (to open sidebar)
    if (isMobile && !isSidebarOpen && swipeDistance > 70 && touchStartX < 30) {
      setSidebarOpen(true);
    }

    // For left swipe (to close sidebar)
    if (isMobile && isSidebarOpen && swipeDistance < -70) {
      setSidebarOpen(false);
    }

    touchStartXRef.current = null;
  };

  return (
    <div
      className="min-h-screen bg-gray-100 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        user={user}
        isMobile={isMobile}
      />

      <main
        className={`transition-all duration-300 ease-in-out flex-1 ${
          isMobile
            ? "ml-0" // Always ml-0 on mobile
            : isSidebarOpen
            ? "ml-64" // Desktop with sidebar open
            : "ml-20" // Desktop with sidebar closed
        }`}
      >
        {/* Add a small arrow tab visible on mobile for opening sidebar */}
        {isMobile && !isSidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-1/2 -translate-y-1/2 left-0 z-30 bg-indigo-600 text-white p-1 rounded-r-md shadow-md opacity-70 hover:opacity-100 transition-opacity duration-200"
            aria-label="Open sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <div className="p-4 sm:p-6">
          {user ? (
            children
          ) : (
            <div className="text-center py-8">กรุณาเข้าสู่ระบบ...</div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
