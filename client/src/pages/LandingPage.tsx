import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Plane,
  Building2,
  DollarSign,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

function AnimatedCounter({
  end,
  duration = 2000,
  suffix = "",
  prefix = "",
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return (
    <span className="text-gold-gradient text-5xl md:text-7xl font-bold">
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function LandingPage({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

      {/* Hero Section */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark mb-8">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">
                Premium Travel Data Portal
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6">
              Government Travel
              <span className="block text-gold-gradient">Made Transparent</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Access comprehensive travel rate data, per-diem allowances, and
              accommodation costs for government employees across Canada and
              internationally.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 rounded-full font-semibold text-lg shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 animate-glow"
            >
              Explore Data Portal
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Animated Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-24"
          >
            <div className="glass-dark p-8 rounded-2xl text-center">
              <Plane className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <AnimatedCounter end={233} suffix="+" />
              <p className="text-gray-400 mt-2">Countries Covered</p>
            </div>

            <div className="glass-dark p-8 rounded-2xl text-center">
              <Building2 className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <AnimatedCounter end={1356} suffix="+" />
              <p className="text-gray-400 mt-2">Accommodation Rates</p>
            </div>

            <div className="glass-dark p-8 rounded-2xl text-center">
              <DollarSign className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <AnimatedCounter end={9114} suffix="+" />
              <p className="text-gray-400 mt-2">Per-Diem Entries</p>
            </div>

            <div className="glass-dark p-8 rounded-2xl text-center">
              <MapPin className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <AnimatedCounter end={6072} suffix="+" />
              <p className="text-gray-400 mt-2">Airport Locations</p>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24"
          >
            <div className="group relative overflow-hidden rounded-2xl glass-dark p-8 hover:bg-white/15 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-3">
                  Interactive Maps
                </h3>
                <p className="text-gray-400">
                  Explore travel rates geographically with our interactive map
                  interface. Filter by country, city, or region.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl glass-dark p-8 hover:bg-white/15 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-3">
                  Live Data Tables
                </h3>
                <p className="text-gray-400">
                  Search, sort, and export comprehensive travel rate data with
                  advanced filtering capabilities.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl glass-dark p-8 hover:bg-white/15 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4">
                  <Plane className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-3">
                  Flight Integration
                </h3>
                <p className="text-gray-400">
                  Get real-time flight data integrated with travel allowances
                  for complete trip cost estimation.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-yellow-400/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl"></div>
    </div>
  );
}
