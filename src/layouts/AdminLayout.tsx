import { Outlet } from "react-router-dom";


const AdminLayout = () => {
  return (
    <>
      <main>
        <Outlet />
      </main>

      <footer className="admin-footer">
  © 2026 Sprihan Halder • Admin Panel
</footer>

      
    </>
  );
};

export default AdminLayout;