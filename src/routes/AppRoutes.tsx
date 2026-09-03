import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";

import Home from "../pages/Home";

import Memoriespublic from "../pages/Memories";
import BlogDetails from "../pages/BlogDetails";
import Blogs from "../pages/Blogs";

import MemoryDetails from "../pages/MemoryDetails";

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

import FamilyMembers from "../admin/FamilyMembers";
import GiftCorner from "../admin/GiftCorner";

import UserProtectedRoute from "../admin/UserProtectedRoute";




import UserDashboard from "../admin/user/dashboard/UserDashboard";
import Adminuser from "../admin/user/messages/UserList";
import Chat from "../admin/user/messages/Chat";
import AdminuserProfile from "../admin/user/profile/UserProfile";
import UserSettings from "../admin/user/settings/UserSettings";
import ChangePassword from "../admin/user/settings/ChangePassword";
import Medical from "../admin/user/medical/Medical";

import ProtectedRoute from "../admin/ProtectedRoute";
import UserLayout from "../admin/user/components/UserLayout";

const AppRoutes = () => {
  return (
    <Routes>
      {/* =========================
          PUBLIC
      ========================== */}

      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/memories" element={<Memoriespublic />} />
        <Route path="/blog/:id" element={<BlogDetails />} />
        <Route path="/blogs" element={<Blogs />} />

        <Route path="/memory/:id" element={<MemoryDetails />} />

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

        {/* =========================
    FAMILY MEMBERS
========================== */}

        <Route
          path="/admin/family-members"
          element={
            <ProtectedRoute>
              <FamilyMembers />
            </ProtectedRoute>
          }
        />

        {/* =========================
    GIFT CORNER
========================== */}

        <Route
          path="/admin/gift-corner"
          element={
            <ProtectedRoute>
              <GiftCorner />
            </ProtectedRoute>
          }
        />

        {/* User List */}
<Route
  path="/user/dashboard"
  element={
    <UserProtectedRoute>
      <UserLayout>
        <UserDashboard />
      </UserLayout>
    </UserProtectedRoute>
  }
/>

<Route
  path="/user/messages"
  element={
    <UserProtectedRoute>
      <UserLayout>
        <Adminuser />
      </UserLayout>
    </UserProtectedRoute>
  }
/>

<Route
  path="/user/messages/:userId"
  element={
    <UserProtectedRoute>
      <UserLayout>
        <Chat />
      </UserLayout>
    </UserProtectedRoute>
  }
/>


<Route
  path="/user/profile"
  element={
    <UserProtectedRoute>
      <UserLayout>
        <AdminuserProfile />
      </UserLayout>
    </UserProtectedRoute>
  }
/>

 <Route
  path="/user/settings"
  element={
    <UserProtectedRoute>
      <UserLayout>
        <UserSettings />
      </UserLayout>
    </UserProtectedRoute>
  }
/>

<Route
  path="/user/settings/password"
  element={
    <UserProtectedRoute>
      <UserLayout>
        <ChangePassword />
      </UserLayout>
    </UserProtectedRoute>
  }
/>

       <Route
  path="/user/medical"
  element={
    <UserProtectedRoute>
      <UserLayout>
        <Medical />
      </UserLayout>
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
