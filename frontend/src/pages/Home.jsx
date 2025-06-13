import React, { useEffect, useState } from "react";
import SensorDashboard from "@components/Dashboard";
import UserBar from "@components/UserBar";
import "@css/Home.css";

const Home = () => {
  return (
    <div className="main">
      <UserBar />
      <main className="dashBoard">
        <SensorDashboard />
      </main>
    </div>
  );
};

export default Home;
