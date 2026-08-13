import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Login from "../admin/Login";
import Dashboard from "../admin/Dashboard";
import Memories from "../admin/Memories";
import MemoryList from "../admin/MemoryList";
import ProtectedRoute from "../admin/ProtectedRoute";
import EditMemory from "../admin/EditMemory";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/admin/login" element={<Login />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/memories/add"
          element={
            <ProtectedRoute>
              <Memories />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/memories"
          element={
            <ProtectedRoute>
              <MemoryList />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/admin/memories/edit/:id"
        element={
          <ProtectedRoute>
            <EditMemory />
          </ProtectedRoute>
        }
      />
      
    </Routes>
  );
};

export default AppRoutes;
