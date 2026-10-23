import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Calculator, RefreshCw, Trash2, AlertTriangle, Database } from 'lucide-react';

const BiasAudit = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTriggerAlert, setDeleteTriggerAlert] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchAuditLogs();
    } else {
      setAuditLogs([]);
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/jobs');
      setJobs(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`http://localhost:3000/api/bias/job/${selectedJob}`);
      setAuditLogs(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComputeAll = async () => {
    if (!selectedJob) return;
    setLoading(true);
    setError(null);
    try {
      const categoriesToCompute = [
        'Gender - Male', 'Gender - Female', 
        'Age 40+', 'Age Under 40',
        'Race - Underrepresented Minority', 'Race - Majority Group'
      ];
      
      for (let category of categoriesToCompute) {
        try {
          await axios.post('http://localhost:3000/api/bias/compute', {
            job_id: selectedJob,
            demographic_category: category
          });
        } catch (e) {
            // Ignore if no applicants in that category
        }
      }
      
      fetchAuditLogs();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  // Demonstrate Trigger 2: trg_bias_audit_log_guard
  const handleAttemptDelete = async (logId, category) => {
    setDeleteTriggerAlert(null);
    try {
      await axios.delete(`http://localhost:3000/api/bias/${logId}`);
      // Should not reach here
    } catch (err) {
      setDeleteTriggerAlert({
        logId,
        category,
        error: err.response?.data?.error || err.message
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Compliance & Bias Audit</h1>
          <p className="text-slate-500 mt-1">EEOC 4/5ths Rule & NYC Local Law 144 Real-Time Monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/audit-trail')}
            className="btn-secondary flex items-center gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-sm"
          >
            <Database className="w-4 h-4 text-indigo-600" />
            View Audit Trail & Trigger Sandbox →
          </button>
          {selectedJob && (
            <button 
              onClick={handleComputeAll} 
              disabled={loading}
              className="btn-primary flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Compute Audit (pkg_governance)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Trigger Demonstration Alert */}
      {deleteTriggerAlert && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-base text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Oracle Database Trigger Intercepted DELETE Operation:
          </div>
          <div className="font-mono text-sm bg-white/80 p-3 rounded-lg border border-amber-200 text-red-700 font-semibold">
            {deleteTriggerAlert.error}
          </div>
          <p className="text-xs text-amber-800 font-medium">
            ✓ <strong>Compliance Verification:</strong> Under Trigger <code className="font-mono font-bold">trg_bias_audit_log_guard</code>, 
            deletion of compliance records is blocked. An <strong>Autonomous Transaction</strong> has committed this unauthorized deletion attempt into <code className="font-mono font-bold">Audit_Trail</code>!
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/audit-trail')}
              className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
            >
              Inspect newly recorded security event in Audit_Trail →
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel p-6 mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-2">Select Job Posting</label>
        <select 
          className="input-field max-w-md"
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
        >
          <option value="">-- Choose a Job --</option>
          {jobs.map(j => (
            <option key={j.job_id} value={j.job_id}>[{j.status}] {j.title} (ID: {j.job_id})</option>
          ))}
        </select>
      </div>

      {selectedJob && auditLogs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auditLogs.map((log) => {
            const isFlagged = log.impact_ratio < 0.8;
            
            return (
              <div 
                key={log.log_id} 
                className={`glass-panel p-6 border-l-4 flex flex-col justify-between ${isFlagged ? 'border-red-500' : 'border-emerald-500'}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{log.demographic_category}</h3>
                      <span className="text-xs font-mono text-slate-400">Log ID: {log.log_id}</span>
                    </div>
                    {isFlagged ? (
                      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-red-100 text-red-700 rounded-md">
                        <ShieldAlert className="w-3 h-3" /> FLAGGED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md">
                        <ShieldCheck className="w-3 h-3" /> COMPLIANT
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Selection Rate</span>
                        <span className="font-mono font-medium text-slate-700">{log.selection_rate.toFixed(3)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-md h-2 overflow-hidden">
                        <div className="bg-blue-500 h-2 rounded-md" style={{ width: `${log.selection_rate * 100}%` }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Scoring Rate</span>
                        <span className="font-mono font-medium text-slate-700">{log.scoring_rate.toFixed(3)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-md h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-2 rounded-md" style={{ width: `${log.scoring_rate * 100}%` }}></div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl mt-6 ${isFlagged ? 'bg-red-50 text-red-900' : 'bg-slate-50 text-slate-800'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Impact Ratio</span>
                        <span className={`text-2xl font-black ${isFlagged ? 'text-red-600' : 'text-emerald-600'}`}>
                          {log.impact_ratio.toFixed(3)}
                        </span>
                      </div>
                      <p className={`text-xs mt-2 ${isFlagged ? 'text-red-700' : 'text-slate-500'}`}>
                        {isFlagged 
                          ? "Warning: Under 80% (4/5ths) of highest group. Adverse impact detected." 
                          : "Meets 4/5ths rule threshold (≥ 0.80)."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delete Attempt Button (Trigger Proof) */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleAttemptDelete(log.log_id, log.demographic_category)}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors"
                    title="Triggers trg_bias_audit_log_guard to prove in-database deletion protection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Attempt Delete (Test trg_bias_audit_log_guard)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {selectedJob && auditLogs.length === 0 && !loading && (
        <div className="glass-panel p-12 text-center">
          <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-700 mb-2">No Audit Logs Found</h3>
          <p className="text-slate-500">Click "Compute Audit" to run pkg_governance.sp_compute_bias_audit inside Oracle.</p>
        </div>
      )}
    </div>
  );
};

export default BiasAudit;
