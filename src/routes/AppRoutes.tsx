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

import DocumentList from "../admin/DocumentList";
import DocumentPost from "../admin/DocumentPost";

import UserRegister from "../admin/UserRegister";

import UserList from "../admin/UserList";
import UserProtectedRoute from "../admin/UserProtectedRoute";

import Chat from "../admin/Chat";

import UserProfile from "../admin/UserProfile";

import ProtectedRoute from "../admin/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>
      {/* =========================
          PUBLIC
      ========================== */}

      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/admin/login" element={<Login />} />
      </Route>

      {/* =========================
          ADMIN PANEL
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

        {/* Admin only - Register User */}
        <Route
          path="/admin/users/register"
          element={
            <ProtectedRoute>
              <UserRegister />
            </ProtectedRoute>
          }
        />

        {/* User List */}
        <Route
          path="/users"
          element={
            <UserProtectedRoute>
              <UserList />
            </UserProtectedRoute>
          }
        />

        <Route
  path="/user/profile"
  element={
    <UserProtectedRoute>
      <UserProfile />
    </UserProtectedRoute>
  }
/>

        {/* Chat */}
        <Route
          path="/messages/:userId"
          element={
            <UserProtectedRoute>
              <Chat />
            </UserProtectedRoute>
          }
        />

        {/* =========================
            MEMORIES
        ========================== */}

        <Route
          path="/admin/memories"
          element={
            <ProtectedRoute>
              <MemoryList />
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
          path="/admin/memories/edit/:id"
          element={
            <ProtectedRoute>
              <EditMemory />
            </ProtectedRoute>
          }
        />

        {/* =========================
            BLOG
        ========================== */}

        <Route
          path="/admin/blogs"
          element={
            <ProtectedRoute>
              <BlogList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/blogs/add"
          element={
            <ProtectedRoute>
              <BlogPost />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/blogs/edit/:id"
          element={
            <ProtectedRoute>
              <BlogPost />
            </ProtectedRoute>
          }
        />

        {/* =========================
            DOCUMENTS
        ========================== */}

        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute>
              <DocumentList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/documents/add"
          element={
            <ProtectedRoute>
              <DocumentPost />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/documents/edit/:id"
          element={
            <ProtectedRoute>
              <DocumentPost />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
