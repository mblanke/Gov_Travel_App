import { useState, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="min-h-screen">
      {!showDashboard ? (
        <LandingPage onGetStarted={() => setShowDashboard(true)} />
      ) : (
        <DashboardPage onBack={() => setShowDashboard(false)} />
      )}
    </div>
  );
}

export default App;
