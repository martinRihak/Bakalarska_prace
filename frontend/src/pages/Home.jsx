import React, { useEffect, useState } from "react";
import Dashboard from "@/features/dashboard/Dashboard";
import UserBar from "@/components/layout/UserBar";
import "@css/Home.css";

const Home = () => {
  return (
    <div className="main">
      <UserBar />
      <main className="dashBoard">
        <Dashboard />
      </main>
    </div>
  );
};

export default Home;
