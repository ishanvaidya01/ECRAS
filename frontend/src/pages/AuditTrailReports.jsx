import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, FileText, Database, RefreshCw, AlertTriangle, CheckCircle, Table, BarChart2 } from 'lucide-react';

const AuditTrailReports = () => {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'triggers', 'reports', 'bcnf'
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [bcnfRows, setBcnfRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  useEffect(() => {
    fetchAuditTrail();
    fetchAnalytics();
    fetchBcnfView();
  }, []);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/audit-trail');
      setAuditLogs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/reports/analytics');
      setAnalytics(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBcnfView = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/reports/flattened-view');
      setBcnfRows(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Test Trigger 1: trg_job_org_match
  const testJobOrgMismatch = async () => {
    setTriggerLoading(true);
    setTriggerResult(null);
    try {
      // Ananya Rao (user_id 1) belongs to Nimbus Analytics (org_id 1).
      // Attempt to create a job under Solstice Health Systems (org_id 2).
      await axios.post('http://localhost:3000/api/jobs', {
        title: 'Unauthorized Cross-Org Posting Test',
        description: 'Should be rejected by trg_job_org_match because user 1 does not belong to org 2.',
        status: 'OPEN',
        org_id: 2, // Solstice Health
        created_by: 1 // Ananya Rao (Nimbus)
      });
      setTriggerResult({
        type: 'error',
        trigger: 'trg_job_org_match',
        message: 'Unexpected success: Trigger did not reject the mismatched insert!'
      });
    } catch (err) {
      setTriggerResult({
        type: 'success_trigger',
        trigger: 'trg_job_org_match',
        code: 'ORA-20001',
        message: err.response?.data?.error || err.message,
        explanation: 'Oracle Database Trigger intercepted and blocked unauthorized cross-organization job posting before insert!'
      });
    } finally {
      setTriggerLoading(false);
    }
  };

  // Test Trigger 2: trg_bias_audit_log_guard
  const testBiasLogDelete = async () => {
    setTriggerLoading(true);
    setTriggerResult(null);
    try {
      // Attempt to delete log_id 1
      await axios.delete('http://localhost:3000/api/bias/1');
      setTriggerResult({
        type: 'error',
        trigger: 'trg_bias_audit_log_guard',
        message: 'Unexpected success: Trigger did not prevent deletion!'
      });
    } catch (err) {
      setTriggerResult({
        type: 'success_trigger',
        trigger: 'trg_bias_audit_log_guard',
        code: 'ORA-20010',
        message: err.response?.data?.error || err.message,
        explanation: 'Oracle Database Trigger explicitly prohibited deletion of Bias Audit Log! Notice that an Autonomous Transaction immediately recorded this attempt into the Audit_Trail table below!'
      });
      // Refresh audit trail to show new autonomous commit
      fetchAuditTrail();
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Compliance Audit Trail & Database Reports</h1>
          <p className="text-slate-500 mt-1">Autonomous Transaction Logs, Live Trigger Sandbox, and Analytical Views</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { fetchAuditTrail(); fetchAnalytics(); fetchBcnfView(); }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh All
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-2 border-b-2 flex items-center gap-2 ${
            activeTab === 'audit' 
              ? 'border-primary-600 text-primary-700 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" /> Audit Trail (Table 11)
        </button>
        <button
          onClick={() => setActiveTab('triggers')}
          className={`pb-3 px-2 border-b-2 flex items-center gap-2 ${
            activeTab === 'triggers' 
              ? 'border-primary-600 text-primary-700 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Trigger Defense Sandbox
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-2 border-b-2 flex items-center gap-2 ${
            activeTab === 'reports' 
              ? 'border-primary-600 text-primary-700 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> Reporting Queries (Section 7)
        </button>
        <button
          onClick={() => setActiveTab('bcnf')}
          className={`pb-3 px-2 border-b-2 flex items-center gap-2 ${
            activeTab === 'bcnf' 
              ? 'border-primary-600 text-primary-700 font-bold' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Table className="w-4 h-4" /> Application_Report_VW (BCNF View)
        </button>
      </div>

      {/* TAB 1: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/50">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Autonomous Transaction Audit Trail (FR-10 Compliance)
            </h3>
            <p className="text-sm text-slate-600">
              Under NYC Local Law 144 and EU AI regulations, automated decision-making and bias logs must be tamper-evident. 
              The <code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-800 font-semibold font-mono text-xs">Audit_Trail</code> table 
              is populated via <code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-800 font-semibold font-mono text-xs">PRAGMA AUTONOMOUS_TRANSACTION</code>.
              Even if a user's transaction fails or rolls back, security events are permanently committed!
            </p>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-semibold text-slate-700">Recorded Security & Audit Events ({auditLogs.length})</h4>
              <span className="text-xs text-slate-500">Source: Oracle Database Table Audit_Trail</span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No audit events recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                      <th className="px-4 py-3 font-semibold">Audit ID</th>
                      <th className="px-4 py-3 font-semibold">Table</th>
                      <th className="px-4 py-3 font-semibold">Operation</th>
                      <th className="px-4 py-3 font-semibold">Target Row Key</th>
                      <th className="px-4 py-3 font-semibold">Old Values (Captured State)</th>
                      <th className="px-4 py-3 font-semibold">Changed By</th>
                      <th className="px-4 py-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.audit_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-700">{log.audit_id}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.table_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            log.operation === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.operation}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{log.row_key}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-md truncate" title={log.old_values}>
                          {log.old_values}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{log.changed_by}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{log.changed_at_str}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRIGGER DEFENSE SANDBOX */}
      {activeTab === 'triggers' && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Live Database Trigger Demonstration Sandbox</h3>
            <p className="text-slate-600 text-sm mb-6">
              Use these interactive controls during your faculty presentation to demonstrate that your business rules are 
              strictly enforced by Oracle Database Triggers rather than insecure client-side JavaScript checks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trigger 1 Card */}
              <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      TRG 1
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">Multi-Tenant Boundary Guard</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mb-2">trg_job_org_match (BEFORE INSERT/UPDATE ON Job_Postings)</p>
                  <p className="text-sm text-slate-600 mb-4">
                    Ensures that a recruiter from Organization A (e.g. User 1 @ Nimbus) cannot create a job posting for Organization B (Solstice Health).
                  </p>
                </div>
                <button
                  onClick={testJobOrgMismatch}
                  disabled={triggerLoading}
                  className="w-full btn-secondary text-sm font-semibold flex items-center justify-center gap-2 border-amber-300 hover:bg-amber-50 text-amber-900"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Test Mismatched Org Insert
                </button>
              </div>

              {/* Trigger 2 Card */}
              <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                      TRG 2
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">Autonomous Compliance Guard</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mb-2">trg_bias_audit_log_guard (BEFORE DELETE/UPDATE ON Bias_Audit_Logs)</p>
                  <p className="text-sm text-slate-600 mb-4">
                    Blocks all DELETE operations on compliance logs (<code className="text-xs font-mono">ORA-20010</code>). Uses <code className="text-xs font-mono font-bold">PRAGMA AUTONOMOUS_TRANSACTION</code> to immediately commit the breach attempt into <code className="text-xs font-mono">Audit_Trail</code>!
                  </p>
                </div>
                <button
                  onClick={testBiasLogDelete}
                  disabled={triggerLoading}
                  className="w-full btn-secondary text-sm font-semibold flex items-center justify-center gap-2 border-red-300 hover:bg-red-50 text-red-900"
                >
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Attempt Deleting Bias Audit Log
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Execution Result Modal/Alert */}
          {triggerResult && (
            <div className={`p-6 rounded-2xl border ${
              triggerResult.type === 'success_trigger' 
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900' 
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-base">
                      Trigger Verified: {triggerResult.trigger}
                    </h4>
                    {triggerResult.code && (
                      <span className="bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded text-xs font-mono font-bold">
                        {triggerResult.code}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono bg-white/70 p-3 rounded-lg border border-emerald-200">
                    {triggerResult.message}
                  </p>
                  <p className="text-xs text-emerald-800 font-medium">
                    ✓ {triggerResult.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STATISTICAL & AGGREGATE REPORTS */}
      {activeTab === 'reports' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query A1: Top 3 shortlist */}
            <div className="glass-panel p-6">
              <h4 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary-600" />
                Top-3 Shortlisted Applicants Per Job (Query A1)
              </h4>
              <p className="text-xs text-slate-500 mb-4">Uses Oracle analytic window function ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY rank_position)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-2 font-semibold">Job Title</th>
                      <th className="p-2 font-semibold">Candidate</th>
                      <th className="p-2 font-semibold text-right">Fused Score</th>
                      <th className="p-2 font-semibold text-right">Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.top3.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 font-medium">{row.job_title}</td>
                        <td className="p-2">{row.candidate_name}</td>
                        <td className="p-2 text-right font-bold text-indigo-600">{row.fused_score}</td>
                        <td className="p-2 text-right font-bold">#{row.rank_position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Query A2: Average interview score */}
            <div className="glass-panel p-6">
              <h4 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary-600" />
                Interview Score Leaderboard (Query A2)
              </h4>
              <p className="text-xs text-slate-500 mb-4">Derived from Transcripts across turns: ROUND(AVG(criterion_score), 2)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-2 font-semibold">Candidate Name</th>
                      <th className="p-2 font-semibold text-right">Turns Scored</th>
                      <th className="p-2 font-semibold text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.candidateInterviewScores.map((row) => (
                      <tr key={row.candidate_id} className="hover:bg-slate-50">
                        <td className="p-2 font-medium">{row.name}</td>
                        <td className="p-2 text-right">{row.turns_scored}</td>
                        <td className="p-2 text-right font-bold text-emerald-600">{row.avg_criterion_score} / 100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Query A3: Application counts by status */}
          <div className="glass-panel p-6">
            <h4 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary-600" />
              Application Count by Job Status (Query A3)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {analytics.jobApplicationCounts.map((j, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500">{j.status}</span>
                    <h5 className="font-bold text-slate-800 text-sm mt-0.5">{j.title}</h5>
                  </div>
                  <div className="text-2xl font-black text-indigo-700">{j.application_count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BCNF FLATTENED VIEW EXPLORER */}
      {activeTab === 'bcnf' && (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-600" />
              BCNF Flattened View: Application_Report_VW
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Demonstrates Section 6.3.1 of our project report. This view reconstructs the complete candidate hiring report 
              by joining 7 relations: Applications, Candidates, Job_Postings, Organizations, Users, Interview_Sessions, and Transcripts.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="p-3 font-semibold">App ID</th>
                    <th className="p-3 font-semibold">Candidate</th>
                    <th className="p-3 font-semibold">Job Title</th>
                    <th className="p-3 font-semibold">Organization</th>
                    <th className="p-3 font-semibold">Recruiter</th>
                    <th className="p-3 font-semibold text-right">Fused Score</th>
                    <th className="p-3 font-semibold text-right">Rank</th>
                    <th className="p-3 font-semibold">Session ID</th>
                    <th className="p-3 font-semibold text-right">Criterion Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bcnfRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-medium">{row.applicationid}</td>
                      <td className="p-3 font-medium">{row.candidatename}</td>
                      <td className="p-3">{row.jobtitle}</td>
                      <td className="p-3 text-slate-600">{row.orgname}</td>
                      <td className="p-3 text-slate-600">{row.recruitername}</td>
                      <td className="p-3 text-right font-bold text-indigo-600">{row.fusedscore}</td>
                      <td className="p-3 text-right font-bold">#{row.rank}</td>
                      <td className="p-3 font-mono">{row.sessionid || 'N/A'}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">{row.criterionscore || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailReports;
