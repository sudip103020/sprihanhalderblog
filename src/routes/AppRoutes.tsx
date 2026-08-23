import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";

import Home from "../pages/Home";

import Login from "../admin/Login";
import Dashboard from "../admin/Dashboard";
import Memories from "../admin/Memories";
import MemoryList from "../admin/MemoryList";
import EditMemory from "../admin/EditMemory";

import BlogPost from "../admin/BlogPost";
import BlogList from "../admin/BlogList";

import ProtectedRoute from "../admin/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>

      {/* =========================
          PUBLIC WEBSITE
          Navbar + Footer
      ========================== */}
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={<Home />}
        />

        {/* Admin Login also has Navbar + Footer */}
        <Route
          path="/admin/login"
          element={<Login />}
        />
      </Route>


      {/* =========================
          ADMIN PANEL
          Footer only
      ========================== */}
      <Route element={<AdminLayout />}>

        {/* Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Memories */}
        <Route
          path="/admin/memories"
          element={
            <ProtectedRoute>
              <MemoryList />
            </ProtectedRoute>
          }
        />

        {/* Add Memory */}
        <Route
          path="/admin/memories/add"
          element={
            <ProtectedRoute>
              <Memories />
            </ProtectedRoute>
          }
        />

        {/* Edit Memory */}
        <Route
          path="/admin/memories/edit/:id"
          element={
            <ProtectedRoute>
              <EditMemory />
            </ProtectedRoute>
          }
        />

        {/* =====================
            BLOG
        ====================== */}

        {/* Blog List */}
        <Route
          path="/admin/blogs"
          element={
            <ProtectedRoute>
              <BlogList />
            </ProtectedRoute>
          }
        />

        {/* Add Blog */}
        <Route
          path="/admin/blogs/add"
          element={
            <ProtectedRoute>
              <BlogPost />
            </ProtectedRoute>
          }
        />

        

      </Route>

       {/* Edit Blog */}
        <Route
          path="/admin/blogs/edit/:id"
          element={
            <ProtectedRoute>
              <BlogPost />
            </ProtectedRoute>
          }
        />



      

    </Routes>
  );
};

export default AppRoutes;