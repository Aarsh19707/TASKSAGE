import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { auth } from './firebase';

const Layout = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // New loading state

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false); // Wait until Firebase gives final user/null
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>; // Or a nice loading spinner

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar user={user} />
      <div style={{ flex: 1, display: "flex" }}>
        <Sidebar />
        <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
