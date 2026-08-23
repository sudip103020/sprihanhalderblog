import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";

const AdminLayout = () => {
  return (
    <>
      <main>
        <Outlet />
      </main>

      <Footer />
    </>
  );
};

export default AdminLayout;