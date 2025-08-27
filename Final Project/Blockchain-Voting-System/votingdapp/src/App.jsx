import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Web3Provider } from "./contexts/Web3Context";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import VoterPanel from "./components/VoterPanel";
import ErrorMonitor from "./components/ErrorMonitor";
import DeploymentStatus from "./components/DeploymentStatus";

function App() {
  return (
    <ErrorBoundary>
      <Web3Provider>
        <Router>
          <DeploymentStatus />
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/vote" element={<VoterPanel />} />
          </Routes>
          <ErrorMonitor />
        </Router>
      </Web3Provider>
    </ErrorBoundary>
  );
}

export default App;
