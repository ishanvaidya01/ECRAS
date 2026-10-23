import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, User, Phone, Mail, Folder, Send, Sparkles, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, Cpu, Database, FileText, Plus, X, Pencil, Trash2, Save } from 'lucide-react';

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', contact_email: '', phone: '', demographic_category: '' });
  const [applyData, setApplyData] = useState({ job_id: '', lexical_score: 75, semantic_score: '' });
  const [candidateApps, setCandidateApps] = useState([]);
  
  // Vector match state
  const [vectorLoading, setVectorLoading] = useState(false);
  const [vectorResult, setVectorResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // Propositions Modal State (Table 6 - Weak Entity)
  const [selectedCandidateForProps, setSelectedCandidateForProps] = useState(null);
  const [propositions, setPropositions] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [newProp, setNewProp] = useState({ section: 'Experience', prop_text: '' });
  const [propSuccess, setPropSuccess] = useState(null);
  const [editingPropId, setEditingPropId] = useState(null);
  const [editProp, setEditProp] = useState({ section: 'Experience', prop_text: '' });
  const [propBusy, setPropBusy] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/candidates');
      setCandidates(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/jobs');
      setJobs(res.data.data.filter(j => j.status === 'OPEN'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncVectorDB = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const res = await axios.post('http://localhost:3000/api/vector/sync-from-db');
      setSyncMessage(res.data.message || 'Vector DB successfully synchronized!');
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err) {
      setSyncMessage('Failed to sync vector database: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleJobChange = async (jobId) => {
    setApplyData(prev => ({ ...prev, job_id: jobId }));
    setVectorResult(null);
    if (!jobId || !selectedCandidate) return;

    // Trigger Vector Semantic Match
    computeVectorMatch(jobId, selectedCandidate.candidate_id);
  };

  const computeVectorMatch = async (jobId, candidateId) => {
    setVectorLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:3000/api/vector/match-score', {
        candidate_id: candidateId,
        job_id: jobId
      });
      if (res.data?.success && res.data?.data) {
        setVectorResult(res.data.data);
        setApplyData(prev => ({
          ...prev,
          semantic_score: res.data.data.semantic_score
        }));
      }
    } catch (err) {
      console.error('Vector match error:', err);
      setError('Vector calculation error: ' + (err.response?.data?.error || err.message));
    } finally {
      setVectorLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await axios.post('http://localhost:3000/api/candidates', formData);
      setShowModal(false);
      fetchCandidates();
      setFormData({ name: '', contact_email: '', phone: '', demographic_category: '' });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.post('http://localhost:3000/api/applications', {
        candidate_id: selectedCandidate.candidate_id,
        job_id: applyData.job_id,
        lexical_score: Number(applyData.lexical_score) || 75,
        semantic_score: applyData.semantic_score !== '' ? Number(applyData.semantic_score) : undefined
      });
      setSuccess(`Application submitted! Fused Score: ${res.data?.data?.fused_score || 'Computed'}. Oracle rank recomputed.`);
      setTimeout(() => {
        setShowApplyModal(false);
        setSuccess(null);
        setVectorResult(null);
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleOpenPropositions = async (candidate) => {
    setSelectedCandidateForProps(candidate);
    setLoadingProps(true);
    setPropSuccess(null);
    setEditingPropId(null);
    try {
      const res = await axios.get(`http://localhost:3000/api/propositions/candidate/${candidate.candidate_id}`);
      setPropositions(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProps(false);
    }
  };

  const refreshPropositions = async () => {
    if (!selectedCandidateForProps) return;
    const res = await axios.get(`http://localhost:3000/api/propositions/candidate/${selectedCandidateForProps.candidate_id}`);
    setPropositions(res.data.data);
  };

  const handleAddProposition = async (e) => {
    e.preventDefault();
    setPropBusy(true);
    try {
      const res = await axios.post('http://localhost:3000/api/propositions', {
        candidate_id: selectedCandidateForProps.candidate_id,
        section: newProp.section,
        prop_text: newProp.prop_text
      });
      const operation = res.data?.data?.vector?.operation || 'INSERT';
      setPropSuccess(`Proposition stored in Oracle and indexed in ChromaDB (${operation} event). Open Vector DB Inspector to watch it.`);
      setNewProp({ section: 'Experience', prop_text: '' });
      await refreshPropositions();
      setTimeout(() => setPropSuccess(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setPropBusy(false);
    }
  };

  const startEditProposition = (prop) => {
    setEditingPropId(prop.proposition_id);
    setEditProp({ section: prop.section || 'Experience', prop_text: prop.prop_text || '' });
    setPropSuccess(null);
  };

  const cancelEditProposition = () => {
    setEditingPropId(null);
    setEditProp({ section: 'Experience', prop_text: '' });
  };

  const handleUpdateProposition = async (e) => {
    e.preventDefault();
    if (!editingPropId) return;
    setPropBusy(true);
    try {
      const res = await axios.put(`http://localhost:3000/api/propositions/${editingPropId}`, {
        section: editProp.section,
        prop_text: editProp.prop_text
      });
      const operation = res.data?.data?.vector?.operation || 'UPDATE';
      setPropSuccess(`Proposition updated in Oracle and re-embedded in ChromaDB (${operation} event). The original Chroma ID was overwritten.`);
      cancelEditProposition();
      await refreshPropositions();
      setTimeout(() => setPropSuccess(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setPropBusy(false);
    }
  };

  const handleDeleteProposition = async (prop) => {
    if (!window.confirm('Delete this proposition from Oracle and remove its vector from ChromaDB?')) return;
    setPropBusy(true);
    try {
      await axios.delete(`http://localhost:3000/api/propositions/${prop.proposition_id}`);
      setPropSuccess('Proposition deleted from Oracle and removed from ChromaDB (DELETE event).');
      await refreshPropositions();
      setTimeout(() => setPropSuccess(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setPropBusy(false);
    }
  };

  const openApplyModal = async (candidate) => {
    setSelectedCandidate(candidate);
    setApplyData({ job_id: '', lexical_score: 75, semantic_score: '' });
    setVectorResult(null);
    setError(null);
    setSuccess(null);
    setShowApplyModal(true);
    try {
      const res = await axios.get(`http://localhost:3000/api/applications/candidate/${candidate.candidate_id}`);
      setCandidateApps(res.data.data || []);
    } catch (err) {
      setCandidateApps([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Candidates</h1>
          <p className="text-slate-500 mt-1">Talent pool with AI dense proposition retrieval</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncVectorDB}
            disabled={syncLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-sm transition-all shadow-sm"
            title="Sync all relational candidate propositions & job criteria into Vector DB"
          >
            <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
            <span>{syncLoading ? 'Syncing...' : 'Sync Vector DB'}</span>
          </button>

          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Add Candidate
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {candidates.map(candidate => (
          <div key={candidate.candidate_id} className="glass-panel p-6 flex flex-col hover:shadow-2xl transition-all border border-slate-200/80">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-bold text-xl shadow-inner">
                {candidate.name.charAt(0)}
              </div>
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                ID #{candidate.candidate_id}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-800">{candidate.name}</h3>
            <span className="text-xs text-indigo-600 font-medium mb-4">{candidate.demographic_category || 'General Pool'}</span>
            
            <div className="space-y-2 text-sm text-slate-600 mb-6 flex-1">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> <span className="truncate">{candidate.contact_email}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {candidate.phone || 'N/A'}</div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-xs bg-emerald-50 px-2 py-1 rounded">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Dense Propositions Indexed
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleOpenPropositions(candidate)}
                className="w-full btn-secondary text-xs flex items-center justify-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <FileText className="w-3.5 h-3.5" />
                Resume Propositions (Table 6)
              </button>
              <button 
                onClick={() => openApplyModal(candidate)}
                className="w-full btn-primary text-xs flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 font-semibold"
              >
                <Send className="w-3.5 h-3.5" /> Apply & Vector Match
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 w-full max-w-md bg-white">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Add Candidate</h3>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input required type="email" className="input-field" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Demographic Category (For Bias Audit)</label>
                <select className="input-field" value={formData.demographic_category} onChange={e => setFormData({...formData, demographic_category: e.target.value})}>
                  <option value="">Select Category</option>
                  <option value="Gender - Male">Gender - Male</option>
                  <option value="Gender - Female">Gender - Female</option>
                  <option value="Race - Underrepresented Minority">Race - Underrepresented Minority</option>
                  <option value="Race - Majority Group">Race - Majority Group</option>
                  <option value="Age 40+">Age 40+</option>
                  <option value="Age Under 40">Age Under 40</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply to Job Modal with Live Vector Match Breakdown */}
      {showApplyModal && selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-panel p-6 sm:p-8 w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto my-auto shadow-2xl rounded-2xl">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-bold text-slate-800">Apply to Job</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-100 text-indigo-700">
                  Vector DB Enabled
                </span>
                <button 
                  onClick={() => setShowApplyModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Candidate: <span className="font-semibold text-slate-800">{selectedCandidate.name}</span> ({selectedCandidate.demographic_category || 'General'})
            </p>
            
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">{success}</div>}
            
            {(() => {
              const existingApp = candidateApps.find(a => String(a.job_id) === String(applyData.job_id));

              return (
                <form onSubmit={handleApply} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Job Vacancy</label>
                    <select 
                      required 
                      className="input-field" 
                      value={applyData.job_id} 
                      onChange={e => handleJobChange(e.target.value)}
                    >
                      <option value="">-- Choose an open job --</option>
                      {jobs.map(j => {
                        const hasApplied = candidateApps.some(a => String(a.job_id) === String(j.job_id));
                        return (
                          <option key={j.job_id} value={j.job_id}>
                            {j.title} (ID: {j.job_id}) {hasApplied ? '— [Already Applied]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {existingApp && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                      <div className="font-semibold mb-0.5">ℹ️ Candidate Already Enrolled</div>
                      Previous Fused Score: <span className="font-bold">{existingApp.fused_score}</span> (Rank: <span className="font-bold">#{existingApp.rank_position || 'N/A'}</span>). Submitting will update their scores and trigger PL/SQL re-ranking without database conflict.
                    </div>
                  )}

              {/* Vector Match Preview Panel */}
              {applyData.job_id && (
                <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Vector Semantic Similarity Analysis</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => computeVectorMatch(applyData.job_id, selectedCandidate.candidate_id)}
                      disabled={vectorLoading}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs"
                    >
                      <RefreshCw className={`w-3 h-3 ${vectorLoading ? 'animate-spin' : ''}`} />
                      <span>Recalculate</span>
                    </button>
                  </div>

                  {vectorLoading ? (
                    <div className="py-6 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span>Computing 384-dimensional dense cosine similarities via {vectorResult?.engine || 'ChromaDB'}...</span>
                    </div>
                  ) : vectorResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                        <div>
                          <div className="text-xs text-slate-500">Vector Semantic Match Score:</div>
                          <div className="text-2xl font-black text-indigo-700">
                            {vectorResult.semantic_score} <span className="text-sm font-normal text-slate-500">/ 100</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {vectorResult.engine}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {vectorResult.criteria_count} criteria × {vectorResult.propositions_analyzed} propositions
                          </div>
                        </div>
                      </div>

                      {/* Detailed proposition breakdown */}
                      <div className="text-xs font-semibold text-slate-700 pt-1">
                        Turn-by-turn Dense Proposition Alignments:
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {vectorResult.breakdown?.map((item, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-semibold text-slate-800 flex-1">
                                📌 Job Requirement: <span className="text-slate-600 font-normal">{item.criterion}</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.similarity >= 0.70 ? 'bg-emerald-100 text-emerald-800' :
                                item.similarity >= 0.40 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.similarity_percentage}% Match
                              </span>
                            </div>

                            <div className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                              <span className="font-medium text-indigo-900">Top Matched Resume Proposition [{item.section}]: </span>
                              "{item.matched_proposition}"
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-1.5 rounded-full transition-all" 
                                style={{ width: `${Math.min(100, item.similarity_percentage)}%` }} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      Select a job above to trigger real-time dense semantic vector matching.
                    </div>
                  )}
                </div>
              )}

              {/* Score inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Lexical Score (BM25)
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    max="100" 
                    className="input-field" 
                    value={applyData.lexical_score} 
                    onChange={e => setApplyData({...applyData, lexical_score: e.target.value})} 
                  />
                  <span className="text-[10px] text-slate-400">Keyword match score</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Semantic Score (Vector DB)
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.01"
                    className="input-field bg-indigo-50/50 font-semibold text-indigo-900 border-indigo-200" 
                    value={applyData.semantic_score} 
                    onChange={e => setApplyData({...applyData, semantic_score: e.target.value})} 
                  />
                  <span className="text-[10px] text-indigo-600">Calculated via all-MiniLM-L6-v2</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">RRF Fusion: </span> 
                Oracle PL/SQL procedure <code className="bg-slate-200 px-1 rounded">pkg_recruitment.sp_insert_application</code> will fuse lexical + semantic scores (50% each) and recalculate global candidate ranking.
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowApplyModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {existingApp ? 'Update Application Score' : 'Submit Application & Sync Vector'}
                </button>
              </div>
            </form>
          );
        })()}
          </div>
        </div>
      )}

      {/* PROPOSITIONS MODAL (Table 6 - Weak Entity) */}
      {selectedCandidateForProps && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Oracle Table: Propositions (Weak Entity)
                </span>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  Resume Propositions for "{selectedCandidateForProps.name}"
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCandidateForProps(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {propSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
                {propSuccess}
              </div>
            )}

            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg text-[11px] flex items-start gap-2">
              <Database className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600" />
              <span>
                Every add, edit and delete below is dual-written to Oracle and ChromaDB. Open the{' '}
                <span className="font-semibold">Vector DB Inspector → Live Operations</span> tab to watch the INSERT / UPDATE / DELETE events and the re-embedded 384-d vectors.
              </span>
            </div>

            {loadingProps ? (
              <div className="p-8 text-center text-slate-500">Loading resume propositions from Oracle DB...</div>
            ) : (
              <div className="space-y-3 mb-6">
                {propositions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl">
                    No proposition clauses stored for this candidate yet.
                  </div>
                ) : (
                  propositions.map((prop) => (
                    editingPropId === prop.proposition_id ? (
                      <form
                        key={prop.proposition_id}
                        onSubmit={handleUpdateProposition}
                        className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <select
                            className="input-field text-xs py-1.5 w-44"
                            value={editProp.section}
                            onChange={e => setEditProp({ ...editProp, section: e.target.value })}
                          >
                            <option value="Experience">Experience</option>
                            <option value="Skills">Skills</option>
                            <option value="Education">Education</option>
                            <option value="Certifications">Certifications</option>
                            <option value="Projects">Projects</option>
                            <option value="Research">Research</option>
                          </select>
                          <span className="text-[10px] font-mono text-indigo-500">
                            Chroma ID: prop_{prop.proposition_id}
                          </span>
                        </div>
                        <textarea
                          required
                          className="input-field text-sm min-h-[72px]"
                          value={editProp.prop_text}
                          onChange={e => setEditProp({ ...editProp, prop_text: e.target.value })}
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={cancelEditProposition} className="btn-secondary text-xs">
                            Cancel
                          </button>
                          <button type="submit" disabled={propBusy} className="btn-primary text-xs flex items-center gap-1.5">
                            <Save className="w-3.5 h-3.5" />
                            {propBusy ? 'Re-embedding…' : 'Save & re-embed in Chroma'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div key={prop.proposition_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Section: {prop.section}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400 mr-1">
                              Ref: {prop.embedding_ref || 'N/A'}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditProposition(prop)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit proposition (Oracle + Chroma UPDATE)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProposition(prop)}
                              disabled={propBusy}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                              title="Delete proposition (Oracle + Chroma DELETE)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-800 font-medium mt-2">{prop.prop_text}</p>
                      </div>
                    )
                  ))
                )}
              </div>
            )}

            {/* Add Proposition Form */}
            <form onSubmit={handleAddProposition} className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-sm font-bold text-slate-700">Add New Resume Proposition Clause</h4>
              <div className="grid grid-cols-4 gap-3">
                <select
                  className="input-field text-sm"
                  value={newProp.section}
                  onChange={e => setNewProp({...newProp, section: e.target.value})}
                >
                  <option value="Experience">Experience</option>
                  <option value="Skills">Skills</option>
                  <option value="Education">Education</option>
                  <option value="Certifications">Certifications</option>
                </select>
                <input
                  required
                  type="text"
                  placeholder="e.g. Architected microservices with Kafka & Redis serving 1M daily events"
                  className="input-field col-span-3 text-sm"
                  value={newProp.prop_text}
                  onChange={e => setNewProp({...newProp, prop_text: e.target.value})}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-slate-500">Saves to Oracle, then immediately embeds and upserts into ChromaDB.</span>
                <button type="submit" disabled={propBusy} className="btn-primary text-sm">
                  {propBusy ? 'Saving & indexing…' : 'Add Proposition Clause'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Candidates;
