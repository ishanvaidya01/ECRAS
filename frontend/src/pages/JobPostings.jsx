import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Building, User, Activity, ListChecks, AlertTriangle, X, Trash2, CheckCircle2, Scale, Pencil, Save } from 'lucide-react';

const JobPostings = () => {
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'OPEN', org_id: '', created_by: '' });
  const [meta, setMeta] = useState({ orgs: [], users: [] });
  const [error, setError] = useState(null);

  // Rubric Criteria Modal State (Table 4)
  const [selectedJobForRubrics, setSelectedJobForRubrics] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [loadingRubrics, setLoadingRubrics] = useState(false);
  const [newCriterion, setNewCriterion] = useState({ criterion_text: '', weight: 0.5 });
  const [rubricSuccess, setRubricSuccess] = useState(null);
  const [editingCritId, setEditingCritId] = useState(null);
  const [editCrit, setEditCrit] = useState({ criterion_text: '', weight: 0.5 });
  const [rubricBusy, setRubricBusy] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchMeta();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/jobs');
      setJobs(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMeta = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/meta');
      setMeta(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await axios.post('http://localhost:3000/api/jobs', formData);
      setShowModal(false);
      fetchJobs();
      setFormData({ title: '', description: '', status: 'OPEN', org_id: '', created_by: '' });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // Open Rubric Criteria Modal for a Job
  const handleOpenRubrics = async (job) => {
    setSelectedJobForRubrics(job);
    setLoadingRubrics(true);
    setRubricSuccess(null);
    setEditingCritId(null);
    try {
      const res = await axios.get(`http://localhost:3000/api/rubrics/job/${job.job_id}`);
      const list = res.data.data;
      setRubrics(list);
      const total = list.reduce((sum, c) => sum + Number(c.weight || 0), 0);
      const remaining = Math.max(0.05, Math.round((1.0 - total) * 100) / 100);
      setNewCriterion({ criterion_text: '', weight: total < 1.0 ? remaining : 0.2 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRubrics(false);
    }
  };

  const refreshRubrics = async () => {
    if (!selectedJobForRubrics) return;
    const res = await axios.get(`http://localhost:3000/api/rubrics/job/${selectedJobForRubrics.job_id}`);
    const list = res.data.data;
    setRubrics(list);
    const total = list.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    const remaining = Math.max(0.05, Math.round((1.0 - total) * 100) / 100);
    setNewCriterion({ criterion_text: '', weight: total < 1.0 ? remaining : 0.2 });
    return list;
  };

  const handleAddCriterion = async (e) => {
    e.preventDefault();
    setRubricBusy(true);
    try {
      const res = await axios.post('http://localhost:3000/api/rubrics', {
        job_id: selectedJobForRubrics.job_id,
        criterion_text: newCriterion.criterion_text,
        weight: Number(newCriterion.weight)
      });
      const operation = res.data?.data?.vector?.operation || 'INSERT';
      setRubricSuccess(`Criterion added to Oracle and indexed in ChromaDB (${operation} event). Open Vector DB Inspector to watch it.`);
      await refreshRubrics();
      setTimeout(() => setRubricSuccess(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setRubricBusy(false);
    }
  };

  const startEditCriterion = (crit) => {
    setEditingCritId(crit.criterion_id);
    setEditCrit({ criterion_text: crit.criterion_text || '', weight: crit.weight ?? 0.5 });
    setRubricSuccess(null);
  };

  const cancelEditCriterion = () => {
    setEditingCritId(null);
    setEditCrit({ criterion_text: '', weight: 0.5 });
  };

  const handleUpdateCriterion = async (e) => {
    e.preventDefault();
    if (!editingCritId) return;
    setRubricBusy(true);
    try {
      const res = await axios.put(`http://localhost:3000/api/rubrics/${editingCritId}`, {
        criterion_text: editCrit.criterion_text,
        weight: Number(editCrit.weight)
      });
      const operation = res.data?.data?.vector?.operation || 'UPDATE';
      setRubricSuccess(`Criterion updated in Oracle and re-embedded in ChromaDB (${operation} event). The same Chroma ID was overwritten.`);
      cancelEditCriterion();
      await refreshRubrics();
      setTimeout(() => setRubricSuccess(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setRubricBusy(false);
    }
  };

  const handleDeleteCriterion = async (criterionId) => {
    if (!window.confirm('Delete this rubric criterion from Oracle and remove its vector from ChromaDB?')) return;
    setRubricBusy(true);
    try {
      await axios.delete(`http://localhost:3000/api/rubrics/${criterionId}`);
      setRubricSuccess('Criterion removed from Oracle and deleted from ChromaDB (DELETE event).');
      await refreshRubrics();
      setTimeout(() => setRubricSuccess(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setRubricBusy(false);
    }
  };

  const handleRebalance = async () => {
    setRubricBusy(true);
    try {
      await axios.put(`http://localhost:3000/api/rubrics/rebalance/${selectedJobForRubrics.job_id}`);
      setRubricSuccess('Weights rebalanced to 100%. Every criterion was re-upserted into ChromaDB, so the metadata weight changed in place (UPDATE events).');
      await refreshRubrics();
      setTimeout(() => setRubricSuccess(null), 6000);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setRubricBusy(false);
    }
  };

  // Demonstration trigger helper
  const prefillTriggerTest = () => {
    // Ananya Rao is user 1 (Nimbus Analytics, org 1).
    // Set org_id to 2 (Solstice Health).
    setFormData({
      title: 'Mismatched Org Demo Posting',
      description: 'Will trigger trg_job_org_match because User 1 does not belong to Org 2.',
      status: 'OPEN',
      org_id: '2',
      created_by: '1'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Job Postings</h1>
          <p className="text-slate-500 mt-1">Manage recruitment positions and evaluation rubrics</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> New Job
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map(job => (
          <div key={job.job_id} className="glass-panel p-6 hover:-translate-y-1 transition-transform flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-800">{job.title}</h3>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                  job.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                  job.status === 'CLOSED' ? 'bg-slate-100 text-slate-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {job.status}
                </span>
              </div>
              <p className="text-slate-600 text-sm mb-6 line-clamp-2">{job.description}</p>
              <div className="space-y-2 text-sm text-slate-500 mb-6">
                <div className="flex items-center gap-2"><Building className="w-4 h-4 text-slate-400" /> {job.org_name}</div>
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> Recruiter: {job.created_by_name}</div>
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400" /> Job ID: {job.job_id}</div>
              </div>
            </div>

            <button
              onClick={() => handleOpenRubrics(job)}
              className="w-full btn-secondary text-sm flex items-center justify-center gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <ListChecks className="w-4 h-4 text-indigo-600" />
              View Rubric Criteria (Table 4)
            </button>
          </div>
        ))}
      </div>

      {/* CREATE JOB MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Create Job Posting</h3>
              <button 
                type="button" 
                onClick={prefillTriggerTest} 
                className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold hover:bg-amber-100"
                title="Fill with Ananya (Org 1) and Solstice (Org 2) to demonstrate trigger trg_job_org_match"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Prefill Mismatch Test
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> Trigger Intercepted:
                </div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input required type="text" className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className="input-field min-h-[80px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                  <select required className="input-field" value={formData.org_id} onChange={e => setFormData({...formData, org_id: e.target.value})}>
                    <option value="">Select Org</option>
                    {meta.orgs.map(o => <option key={o.org_id} value={o.org_id}>{o.org_name} (ID: {o.org_id})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Created By (User)</label>
                  <select required className="input-field" value={formData.created_by} onChange={e => setFormData({...formData, created_by: e.target.value})}>
                    <option value="">Select User</option>
                    {meta.users.map(u => <option key={u.user_id} value={u.user_id}>{u.name} (Org: {u.org_id})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Posting</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RUBRIC CRITERIA MODAL (Table 4) */}
      {selectedJobForRubrics && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Oracle Table: Rubric_Criteria
                </span>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  Rubric Criteria for "{selectedJobForRubrics.title}"
                </h3>
              </div>
              <button 
                onClick={() => setSelectedJobForRubrics(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rubricSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
                {rubricSuccess}
              </div>
            )}

            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg text-[11px] flex items-start gap-2">
              <Activity className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600" />
              <span>
                Every add, edit, delete and rebalance below is dual-written to Oracle and ChromaDB.
                Open the <span className="font-semibold">Vector DB Inspector → Live Operations</span> tab to watch the
                INSERT / UPDATE / DELETE / REBALANCE events and the re-embedded 384-d vectors.
              </span>
            </div>

            {(() => {
              const totalWeight = rubrics.reduce((sum, c) => sum + Number(c.weight || 0), 0);
              const totalPct = Math.round(totalWeight * 100);
              const isBalanced = totalPct === 100;

              return (
                <>
                  {/* WEIGHT STATUS & REBALANCE HEADER */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-4 rounded-xl border bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluation Weights Total</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {totalPct}%
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {isBalanced ? 'Valid & Balanced (100%)' : totalPct > 100 ? `Over-allocated by ${totalPct - 100}%` : `Under-allocated by ${100 - totalPct}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isBalanced && rubrics.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRebalance}
                        disabled={rubricBusy}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm disabled:opacity-50"
                        title="Scale all criteria weights proportionally so they sum to exactly 100%"
                      >
                        <Scale className="w-3.5 h-3.5" /> {rubricBusy ? 'Re-indexing…' : 'Rebalance to 100%'}
                      </button>
                    )}
                  </div>

                  {loadingRubrics ? (
                    <div className="p-8 text-center text-slate-500">Loading criteria from Oracle DB...</div>
                  ) : (
                    <div className="space-y-4 mb-6">
                      {rubrics.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl">
                          No rubric criteria defined for this job yet.
                        </div>
                      ) : (
                        rubrics.map((crit) => (
                          editingCritId === crit.criterion_id ? (
                            <form
                              key={crit.criterion_id}
                              onSubmit={handleUpdateCriterion}
                              className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-indigo-600">
                                  Chroma ID: crit_{crit.criterion_id}
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Weight</label>
                                  <input
                                    type="number"
                                    required
                                    step="0.05"
                                    min="0.05"
                                    max="1"
                                    className="input-field text-xs py-1.5 w-28"
                                    value={editCrit.weight}
                                    onChange={e => setEditCrit({ ...editCrit, weight: e.target.value })}
                                  />
                                </div>
                              </div>
                              <textarea
                                required
                                className="input-field text-sm min-h-[64px]"
                                value={editCrit.criterion_text}
                                onChange={e => setEditCrit({ ...editCrit, criterion_text: e.target.value })}
                              />
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={cancelEditCriterion} className="btn-secondary text-xs">
                                  Cancel
                                </button>
                                <button type="submit" disabled={rubricBusy} className="btn-primary text-xs flex items-center gap-1.5">
                                  <Save className="w-3.5 h-3.5" />
                                  {rubricBusy ? 'Re-embedding…' : 'Save & re-embed in Chroma'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div key={crit.criterion_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                              <div className="flex justify-between items-start gap-4">
                                <div className="font-semibold text-slate-800 text-sm flex-1">{crit.criterion_text}</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-800">
                                    Weight: {(crit.weight * 100).toFixed(0)}%
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => startEditCriterion(crit)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Edit Criterion (Oracle + Chroma UPDATE)"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCriterion(crit.criterion_id)}
                                    disabled={rubricBusy}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40"
                                    title="Delete Criterion (Oracle + Chroma DELETE)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${isBalanced ? 'bg-indigo-600' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(100, crit.weight * 100)}%` }}
                                />
                              </div>
                            </div>
                          )
                        ))
                      )}
                    </div>
                  )}

                  {/* Add Criterion Form */}
                  <form onSubmit={handleAddCriterion} className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-700">Add New Rubric Criterion</h4>
                      {totalPct < 100 && (
                        <span className="text-xs text-indigo-600 font-medium">
                          Suggested Weight: {(100 - totalPct)}%
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <input
                        required
                        type="text"
                        placeholder="e.g. Demonstrated proficiency in Python and Airflow pipelines"
                        className="input-field flex-1 text-sm"
                        value={newCriterion.criterion_text}
                        onChange={e => setNewCriterion({...newCriterion, criterion_text: e.target.value})}
                      />
                      <input
                        required
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="1"
                        placeholder="Weight (0.1 - 1.0)"
                        className="input-field w-32 text-sm"
                        value={newCriterion.weight}
                        onChange={e => setNewCriterion({...newCriterion, weight: e.target.value})}
                      />
                      <button type="submit" disabled={rubricBusy} className="btn-primary text-sm whitespace-nowrap">
                        {rubricBusy ? 'Saving & indexing…' : 'Add Criterion'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Saves to Oracle, then immediately embeds the criterion and upserts it into ChromaDB.
                    </p>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostings;
