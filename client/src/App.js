import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import AlertContainer from "./components/common/AlertContainer";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import axios from "./utils/axios";

// Import your pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import EquipmentPage from "./pages/EquipmentPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";
import UnfixablePage from "./pages/UnfixablePage";
import StatusPage from "./pages/StatusPage";
import ComputerCenterPage from "./pages/ComputerCenterPage";
import ProblemAnalyticsPage from "./pages/ProblemAnalyticsPage";

function App() {
  // Add environment check on app startup
  useEffect(() => {
    console.log("Environment Variables:", {
      nodeEnv: process.env.NODE_ENV,
      apiUrl: process.env.REACT_APP_API_URL,
      baseUrl: axios.defaults.baseURL,
    });
  }, []);

  return (
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <AlertContainer />
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/problem-analytics"
              element={
                <ProtectedRoute requiredRole={["admin", "equipment_manager"]}>
                  <ProblemAnalyticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/equipment"
              element={
                <ProtectedRoute
                  requiredRole={[
                    "admin",
                    "equipment_manager",
                    "equipment_assistant",
                  ]}
                >
                  <EquipmentPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/status"
              element={
                <ProtectedRoute requiredRole={["admin", "equipment_manager"]}>
                  <StatusPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/unfixable"
              element={
                <ProtectedRoute requiredRole={["admin", "equipment_manager"]}>
                  <UnfixablePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/computer-center"
              element={
                <ProtectedRoute requiredRole={["admin", "equipment_manager"]}>
                  <ComputerCenterPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute requiredRole={["admin", "equipment_manager"]}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  );
}

export default App;
