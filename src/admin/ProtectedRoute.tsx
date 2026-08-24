import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({
  children,
}: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        // =========================
        // No logged in user
        // =========================
        if (!firebaseUser) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Set current user
        setUser(firebaseUser);

        try {
          const userRef = doc(
            db,
            "users",
            firebaseUser.uid
          );

          const userSnap = await getDoc(userRef);

          if (
            userSnap.exists() &&
            userSnap.data().role === "admin"
          ) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error(
            "Admin check error:",
            error
          );

          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================
  // Loading
  // =========================

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div
          className="spinner-border"
          role="status"
        />
      </div>
    );
  }

  // =========================
  // Not Logged In
  // =========================

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  // =========================
  // Logged in but not Admin
  // =========================

  if (!isAdmin) {
    return (
      <Navigate
        to="/users"
        replace
      />
    );
  }

  // =========================
  // Admin
  // =========================

  return <>{children}</>;
};

export default ProtectedRoute;