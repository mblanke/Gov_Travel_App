import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Table2, Map, BarChart3, Plane } from "lucide-react";
import DataTable from "../components/DataTable";
import { formatCurrency } from "@/lib/utils";

interface DashboardPageProps {
  onBack: () => void;
}

export default function DashboardPage({ onBack }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState("per-diem");
  const [perDiemData, setPerDiemData] = useState<any[]>([]);
  const [accommodationData, setAccommodationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from API
    Promise.all([
      fetch("/api/rates/per-diem").then((r) => r.json()),
      fetch("/api/rates/accommodations").then((r) => r.json()),
    ])
      .then(([perDiem, accommodations]) => {
        setPerDiemData(perDiem.data || []);
        setAccommodationData(accommodations.data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, []);

  const perDiemColumns = [
    { key: "country", label: "Country", sortable: true },
    { key: "city", label: "City", sortable: true },
    {
      key: "breakfast",
      label: "Breakfast",
      sortable: true,
      format: (v: number) => formatCurrency(v),
    },
    {
      key: "lunch",
      label: "Lunch",
      sortable: true,
      format: (v: number) => formatCurrency(v),
    },
    {
      key: "dinner",
      label: "Dinner",
      sortable: true,
      format: (v: number) => formatCurrency(v),
    },
    {
      key: "incidentals",
      label: "Incidentals",
      sortable: true,
      format: (v: number) => formatCurrency(v),
    },
  ];

  const accommodationColumns = [
    { key: "city", label: "City", sortable: true },
    { key: "province", label: "Province", sortable: true },
    {
      key: "rate",
      label: "Rate",
      sortable: true,
      format: (v: number) => formatCurrency(v),
    },
    { key: "currency", label: "Currency", sortable: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="glass-dark border-b border-white/10 sticky top-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-semibold">Travel Data Portal</span>
            </button>

            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("per-diem")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === "per-diem"
                    ? "bg-yellow-400 text-gray-900"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <Table2 className="w-4 h-4" />
                Per Diem
              </button>
              <button
                onClick={() => setActiveTab("accommodations")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === "accommodations"
                    ? "bg-yellow-400 text-gray-900"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <Table2 className="w-4 h-4" />
                Accommodations
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "per-diem" && (
              <DataTable
                data={perDiemData}
                columns={perDiemColumns}
                title="Per Diem Rates"
                searchKeys={["country", "city"]}
              />
            )}
            {activeTab === "accommodations" && (
              <DataTable
                data={accommodationData}
                columns={accommodationColumns}
                title="Accommodation Rates"
                searchKeys={["city", "province"]}
              />
            )}
          </motion.div>
        )}
      </div>

      {/* Background effects */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none"></div>
      <div className="fixed top-1/4 -left-48 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-1/4 -right-48 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
