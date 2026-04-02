import React from "react";
import Dashboard from "@/features/dashboard/Dashboard";
import "@css/Home.css";

const Home = () => {
  return (
    <div className="main">
      <main className="page-shell">
        <Dashboard />
      </main>
    </div>
  );
};

export default Home;
