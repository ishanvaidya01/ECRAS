import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Briefcase, Users, BarChart2, Video, ShieldAlert, Cpu, Database, ArrowRight } from 'lucide-react';
import axios from 'axios';

const Layout = () => {
  const [vectorStatus, setVectorStatus] = useState(null);

  useEffect(() => {
    fetchVectorStatus();
    const interval = setInterval(fetchVectorStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchVectorStatus = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/vector/status');
      if (res.data?.success) {
        setVectorStatus(res.data.data);
      }
    } catch (err) {
      // Backend may be starting
    }
  };

  const navItems = [
    { path: '/jobs', label: 'Job Postings', icon: <Briefcase className="w-5 h-5" /> },
    { path: '/candidates', label: 'Candidates & Vector Match', icon: <Users className="w-5 h-5" /> },
    { path: '/ranking', label: 'Application Ranking', icon: <BarChart2 className="w-5 h-5" /> },
    { path: '/interviews', label: 'Interviews', icon: <Video className="w-5 h-5" /> },
    { path: '/bias-audit', label: 'Bias Audit', icon: <ShieldAlert className="w-5 h-5" /> },
    { path: '/audit-trail', label: 'Audit Trail & Reports', icon: <Database className="w-5 h-5" /> },
    { path: '/vector-db', label: 'Vector DB Inspector', icon: <Cpu className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ECRAS
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              Vector DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">DA3 Modern Extension Edition</p>
        </div>

        {/* Vector DB Engine Live Indicator */}
        <NavLink
          to="/vector-db"
          className="mx-4 my-3 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 hover:border-indigo-300 hover:shadow-sm transition-all block"
          title="Open the live ChromaDB inspector"
        >
          <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs mb-1">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>Vector Persistence</span>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-indigo-500">Live</span>
          </div>
          <div className="text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between items-center">
              <span>Engine:</span>
              <span className="font-medium text-indigo-700">{vectorStatus?.engine || 'ChromaDB'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Embeddings:</span>
              <span className="font-medium text-slate-700">384-d MiniLM</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Index:</span>
              <span className="font-medium text-emerald-700">HNSW Cosine</span>
            </div>
            {vectorStatus && (
              <div className="flex justify-between items-center pt-1 border-t border-indigo-100 text-[10px] text-slate-500">
                <span>Indexed Props:</span>
                <span className="font-semibold text-slate-800">{vectorStatus.indexed_propositions}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
            Open live inspector <ArrowRight className="w-3 h-3" />
          </div>
        </NavLink>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex flex-col gap-2">
          <NavLink to="/privacy" className="hover:text-slate-900 transition-colors focus:ring-2 focus:ring-primary-500 rounded outline-none">Privacy Policy</NavLink>
          <NavLink to="/terms" className="hover:text-slate-900 transition-colors focus:ring-2 focus:ring-primary-500 rounded outline-none">Terms and Conditions</NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8 relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
