import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Trophy, User, Sparkles, Database, Video, CheckCircle, Calendar } from 'lucide-react';

const ApplicationRanking = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchApplications(false);
    } else {
      setApplications([]);
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

  const fetchApplications = async (rerank = false) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3000/api/applications/job/${selectedJob}?rerank=${rerank}`);
      setApplications(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRerank = () => {
    fetchApplications(true);
  };

  const handleScheduleInterview = async (applicationId, candidateName) => {
    setScheduleStatus(null);
    try {
      const res = await axios.post('http://localhost:3000/api/interviews', {
        application_id: applicationId,
        webrtc_room_ref: `room_candidate_${applicationId}_${Date.now()}`
      });
      setScheduleStatus({
        type: 'success',
        message: `Interview Session #${res.data.data.session_id} created in Oracle Database for ${candidateName}!`,
        sessionId: res.data.data.session_id
      });
      setTimeout(() => {
        navigate('/interviews');
      }, 1500);
    } catch (err) {
      setScheduleStatus({
        type: 'error',
        message: err.response?.data?.error || err.message
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Application Ranking</h1>
          <p className="text-slate-500 mt-1">Hybrid Fused Ranking: 50% Lexical (BM25) + 50% Vector Dense Similarity</p>
        </div>
        {selectedJob && (
          <button 
            onClick={handleRerank} 
            disabled={loading}
            className="btn-primary flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
            Re-rank Candidates (PL/SQL)
          </button>
        )}
      </div>

      {scheduleStatus && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
          scheduleStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>{scheduleStatus.message}</span>
          </div>
          {scheduleStatus.sessionId && (
            <span className="text-xs font-semibold underline cursor-pointer" onClick={() => navigate('/interviews')}>
              Go to Virtual Interview Room &rarr;
            </span>
          )}
        </div>
      )}

      <div className="glass-panel p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Job Vacancy</label>
          <select 
            className="input-field max-w-md"
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
          >
            <option value="">-- Choose a Job Posting --</option>
            {jobs.map(j => (
              <option key={j.job_id} value={j.job_id}>[{j.status}] {j.title} (ID: #{j.job_id})</option>
            ))}
          </select>
        </div>

        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 max-w-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dense Semantic Reranker</span>
          </div>
          <p className="text-slate-600">
            Fused score computes <code className="bg-indigo-100 px-1 rounded">0.5*Lexical + 0.5*VectorScore</code>, ordering candidates in Oracle PL/SQL.
          </p>
        </div>
      </div>

      {selectedJob && (
        <div className="glass-panel overflow-hidden border border-slate-200">
          {applications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No applications found for this job. Submit applications via the Candidates tab.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-semibold">Rank</th>
                  <th className="px-6 py-4 font-semibold">Candidate</th>
                  <th className="px-6 py-4 font-semibold">Demographic Cohort</th>
                  <th className="px-6 py-4 font-semibold text-center">Scoring Engine</th>
                  <th className="px-6 py-4 font-semibold text-right">Fused Score</th>
                  <th className="px-6 py-4 font-semibold text-center">Interview Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {applications.map((app, index) => (
                  <tr key={app.application_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      {index === 0 ? (
                        <div className="flex items-center gap-1.5 text-yellow-600 font-bold">
                          <Trophy className="w-5 h-5 fill-yellow-400" /> #1
                        </div>
                      ) : index === 1 ? (
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                          <Trophy className="w-5 h-5 fill-slate-300" /> #2
                        </div>
                      ) : index === 2 ? (
                        <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                          <Trophy className="w-5 h-5 fill-amber-500" /> #3
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-500 pl-6">#{app.rank_position || (index + 1)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-xs">
                          {app.candidate_name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">{app.candidate_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 font-medium">
                        {app.demographic_category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                        <Database className="w-3 h-3" /> Dense Vector RRF
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-base font-bold font-mono text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                        {app.fused_score ? parseFloat(app.fused_score).toFixed(2) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleScheduleInterview(app.application_id, app.candidate_name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                        title="Schedule Virtual Interview (Table 8)"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Schedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationRanking;
