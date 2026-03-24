import React from "react";
import Dashboard from "@/features/dashboard/Dashboard";
import UserBar from "@/components/layout/UserBar";
import "@css/Home.css";

const Home = () => {
  return (
    <div className="main">
      <UserBar />
      <main className="page-shell">
        <Dashboard />
      </main>
    </div>
  );
};

export default Home;
