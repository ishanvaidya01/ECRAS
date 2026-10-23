import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Video, Search, MessageSquare, Plus, Star, Award, Sparkles } from 'lucide-react';

const Interviews = () => {
  const [sessionsList, setSessionsList] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({ question_text: '', answer_text: '', criterion_score: '' });

  useEffect(() => {
    fetchSessionsList();
  }, []);

  const fetchSessionsList = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/interviews');
      setSessionsList(res.data.data);
      if (res.data.data.length > 0 && !sessionId) {
        // Auto select first session
        setSessionId(res.data.data[0].session_id);
        loadSessionById(res.data.data[0].session_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSessionById = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`http://localhost:3000/api/interviews/${id}`);
      setInterviewData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setInterviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (id) => {
    setSessionId(id);
    loadSessionById(id);
  };

  const handleAddTurn = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:3000/api/interviews/${sessionId}/turns`, {
        question_text: formData.question_text,
        answer_text: formData.answer_text,
        criterion_score: Number(formData.criterion_score)
      });
      setShowModal(false);
      setFormData({ question_text: '', answer_text: '', criterion_score: '' });
      loadSessionById(sessionId); // Refresh to get new turn and new avg score
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Interview Transcripts</h1>
        <p className="text-slate-500 mt-1">Review live Q&A turns and dynamic AI rubric scores</p>
      </div>

      <div className="glass-panel p-6 flex flex-col md:flex-row items-stretch md:items-end gap-4">
        {/* Session Dropdown Selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Active Interview Session (Table 8)</label>
          <select 
            className="input-field"
            value={sessionId}
            onChange={e => handleSelectSession(e.target.value)}
          >
            <option value="">-- Choose an Interview Session --</option>
            {sessionsList.map(s => (
              <option key={s.session_id} value={s.session_id}>
                Session #{s.session_id} — {s.candidate_name} ({s.job_title})
              </option>
            ))}
          </select>
        </div>

        {/* Manual ID Input */}
        <div className="w-full md:w-48">
          <label className="block text-sm font-medium text-slate-700 mb-2">Or Lookup ID</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="number" 
              className="input-field pl-9" 
              placeholder="e.g. 1"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadSessionById(sessionId)}
            />
          </div>
        </div>
        <button 
          onClick={() => loadSessionById(sessionId)} 
          disabled={loading || !sessionId} 
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? 'Loading...' : 'Load Session'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      {interviewData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" /> Transcript Turns ({interviewData.turns.length})
              </h3>
              <button onClick={() => setShowModal(true)} className="btn-secondary text-sm flex items-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                <Plus className="w-4 h-4" /> Add Turn (pkg_interview)
              </button>
            </div>
            
            {interviewData.turns.length === 0 ? (
              <div className="glass-panel p-8 text-center text-slate-500">No transcripts recorded yet for this session.</div>
            ) : (
              interviewData.turns.map(turn => (
                <div key={turn.transcript_id} className="glass-panel p-6 space-y-4">
                  <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-100 pb-2">
                    <span className="font-semibold">Turn #{turn.turn_index}</span>
                    <span className="font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Score: {turn.criterion_score !== null ? `${turn.criterion_score} / 100` : 'Not Scored'}
                    </span>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-md bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-700 font-bold text-xs">AI</div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-tl-none w-full">
                      <p className="text-slate-800 font-medium">{turn.question_text}</p>
                    </div>
                  </div>
                  {turn.answer_text && (
                    <div className="flex gap-4 flex-row-reverse">
                      <div className="w-8 h-8 rounded-md bg-emerald-100 flex-shrink-0 flex items-center justify-center text-emerald-700 font-bold text-xs">C</div>
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl rounded-tr-none w-full">
                        <p className="text-slate-700">{turn.answer_text}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Right Summary Column */}
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Dynamic Session Score
              </h4>
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-4xl font-black text-indigo-700 mb-1">
                  {interviewData.computedScore !== null ? `${interviewData.computedScore}` : '0'}
                  <span className="text-lg text-slate-400 font-normal"> / 100</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Computed Average Score
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200 text-xs text-blue-900 rounded-lg">
                <p className="font-semibold mb-1">Zero Update Anomalies Proof:</p>
                This average score is <strong>not</strong> stored as a column in <code className="font-mono">Interview_Sessions</code>. It is computed live via Oracle PL/SQL package function <code className="font-mono">pkg_interview.fn_compute_interview_score</code> whenever the session is fetched!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD TURN MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 w-full max-w-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-4">Add Interview Transcript Turn</h3>
            <p className="text-xs text-slate-500 mb-6">
              Invokes <code className="font-mono font-semibold text-indigo-700">pkg_interview.sp_insert_transcript_turn</code>.
            </p>
            <form onSubmit={handleAddTurn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interviewer Question</label>
                <textarea 
                  required 
                  className="input-field min-h-[70px]" 
                  placeholder="e.g. Can you explain your experience tuning Spark executors for large shuffle operations?"
                  value={formData.question_text} 
                  onChange={e => setFormData({...formData, question_text: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Candidate Answer</label>
                <textarea 
                  required 
                  className="input-field min-h-[90px]" 
                  placeholder="e.g. I tuned spark.sql.shuffle.partitions and adjusted executor memory overhead to prevent OOM errors..."
                  value={formData.answer_text} 
                  onChange={e => setFormData({...formData, answer_text: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Criterion Score (0 - 100)</label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="1"
                  className="input-field" 
                  placeholder="85"
                  value={formData.criterion_score} 
                  onChange={e => setFormData({...formData, criterion_score: e.target.value})} 
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Turn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
