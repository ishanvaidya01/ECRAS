import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, Cpu, Database,
  Eye, FileJson, Filter, HardDrive, Hash, Layers, ListTree, Pause, Play,
  Plus, RefreshCw, Search, Server, Sparkles, Terminal, Trash2, Waypoints,
  X, Zap, Boxes, Gauge
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const COLLECTION_META = {
  candidate_propositions: {
    label: 'Candidate Propositions',
    short: 'Propositions',
    color: 'indigo',
    idPrefix: 'prop_'
  },
  job_criteria: {
    label: 'Job Rubric Criteria',
    short: 'Criteria',
    color: 'amber',
    idPrefix: 'crit_'
  },
  job_postings: {
    label: 'Job Postings',
    short: 'Jobs',
    color: 'blue',
    idPrefix: 'job_'
  },
  candidates: {
    label: 'Candidate Profiles',
    short: 'Candidates',
    color: 'emerald',
    idPrefix: 'cand_'
  },
  applications: {
    label: 'Job Applications',
    short: 'Applications',
    color: 'teal',
    idPrefix: 'app_'
  },
  interview_sessions: {
    label: 'Interview Sessions',
    short: 'Interviews',
    color: 'purple',
    idPrefix: 'int_'
  },
  transcripts: {
    label: 'Interview Transcripts',
    short: 'Transcripts',
    color: 'fuchsia',
    idPrefix: 'trn_'
  },
  bias_audit_logs: {
    label: 'Bias Audit Logs',
    short: 'Bias Logs',
    color: 'rose',
    idPrefix: 'bias_'
  },
  audit_trail: {
    label: 'Security Audit Trail',
    short: 'Audit Trail',
    color: 'red',
    idPrefix: 'aud_'
  },
  organizations: {
    label: 'Organizations',
    short: 'Orgs',
    color: 'cyan',
    idPrefix: 'org_'
  },
  users: {
    label: 'System Users',
    short: 'Users',
    color: 'violet',
    idPrefix: 'usr_'
  }
};

const COLLECTION_COLORS = {
  candidate_propositions: '#6366f1',
  job_criteria: '#f59e0b',
  job_postings: '#3b82f6',
  candidates: '#10b981',
  applications: '#14b8a6',
  interview_sessions: '#8b5cf6',
  transcripts: '#d946ef',
  bias_audit_logs: '#f43f5e',
  audit_trail: '#ef4444',
  organizations: '#06b6d4',
  users: '#a855f7'
};

const EVENT_FILTERS = ['ALL', 'INSERT', 'UPDATE', 'DELETE', 'QUERY', 'SYNC', 'REBALANCE', 'FUSION', 'CONNECT'];

const TYPE_STYLES = {
  INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  QUERY: 'bg-sky-50 text-sky-700 border-sky-200',
  SYNC: 'bg-violet-50 text-violet-700 border-violet-200',
  REBALANCE: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  FUSION: 'bg-pink-50 text-pink-700 border-pink-200',
  CONNECT: 'bg-slate-100 text-slate-700 border-slate-200',
  DISCONNECT: 'bg-slate-100 text-slate-700 border-slate-200',
  ERROR: 'bg-red-50 text-red-700 border-red-200'
};

const DOT_STYLES = {
  INSERT: 'bg-emerald-400',
  UPDATE: 'bg-amber-400',
  DELETE: 'bg-rose-400',
  QUERY: 'bg-sky-400',
  SYNC: 'bg-violet-400',
  REBALANCE: 'bg-fuchsia-400',
  FUSION: 'bg-pink-400',
  CONNECT: 'bg-slate-300',
  DISCONNECT: 'bg-slate-300',
  ERROR: 'bg-red-400'
};

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const shortText = (text, length = 160) => {
  if (!text) return '';
  const value = String(text);
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

const numberOrDash = (value) => (value === null || value === undefined ? '—' : value);

const TypeBadge = ({ type }) => (
  <span className={`inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_STYLES[type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
    {type}
  </span>
);

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const style = status === 'SUCCESS'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'FALLBACK' || status === 'BASELINE'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-semibold ${style}`}>
      {status}
    </span>
  );
};

const VectorBars = ({ values, height = 44, count = 24, className = '' }) => {
  const bars = Array.isArray(values) ? values.slice(0, count) : [];
  if (bars.length === 0) {
    return <span className={`text-[10px] text-slate-400 ${className}`}>No vector data</span>;
  }
  const maxAbs = Math.max(...bars.map(value => Math.abs(Number(value) || 0)), 1e-9);

  return (
    <div className={`flex items-end gap-[2px] ${className}`} style={{ height }}>
      {bars.map((value, index) => {
        const numeric = Number(value) || 0;
        const barHeight = Math.max(3, Math.round((Math.abs(numeric) / maxAbs) * height));
        return (
          <div
            key={index}
            title={`dim ${index}: ${numeric.toFixed(6)}`}
            className={`flex-1 min-w-[2px] rounded-t-sm ${numeric >= 0 ? 'bg-indigo-500' : 'bg-rose-400'}`}
            style={{ height: barHeight, opacity: 0.55 + 0.45 * (Math.abs(numeric) / maxAbs) }}
          />
        );
      })}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, hint, tone = 'indigo' }) => {
  const tones = {
    indigo: 'from-indigo-50 to-white border-indigo-100 text-indigo-700',
    emerald: 'from-emerald-50 to-white border-emerald-100 text-emerald-700',
    amber: 'from-amber-50 to-white border-amber-100 text-amber-700',
    slate: 'from-slate-50 to-white border-slate-200 text-slate-700',
    sky: 'from-sky-50 to-white border-sky-100 text-sky-700'
  };

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${tones[tone] || tones.indigo}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
        <Icon className="w-4 h-4 opacity-70" />
      </div>
      <div className="mt-2 text-xl font-black text-slate-800">{value}</div>
      {hint && <div className="mt-1 text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
};

const EventRow = ({ event }) => {
  const previousDocument = event.previous?.document;
  const eventDocument = event.document || event.text;
  const isUpdate = event.type === 'UPDATE' && previousDocument && eventDocument;
  const typeDot = DOT_STYLES[event.type] || 'bg-slate-400';

  return (
    <div className="py-3 border-b border-slate-800/70 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${typeDot}`} />
        <span className="text-slate-500">#{event.seq}</span>
        <span className="text-slate-500">{formatTime(event.timestamp)}</span>
        <TypeBadge type={event.type} />
        <StatusBadge status={event.status} />
        {event.engine && (
          <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
            {event.engine}
          </span>
        )}
        {event.durationMs !== undefined && event.durationMs !== null && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
            <Clock className="w-3 h-3" /> {event.durationMs} ms
          </span>
        )}
      </div>

      <div className="mt-1.5 text-slate-200">{event.message}</div>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        {event.source && (
          <span>source: <span className="text-indigo-300">{event.source}</span></span>
        )}
        {event.collection && <span>collection: <span className="text-slate-300">{event.collection}</span></span>}
        {event.docId && <span>id: <span className="text-slate-300">{event.docId}</span></span>}
      </div>

      {isUpdate ? (
        <div className="mt-2 space-y-1 text-[11px]">
          <div className="text-slate-500">
            <span className="text-rose-300 font-semibold">before </span>
            {shortText(previousDocument, 180)}
          </div>
          <div className="text-slate-400">
            <span className="text-emerald-300 font-semibold">after&nbsp;&nbsp; </span>
            {shortText(eventDocument, 180)}
          </div>
        </div>
      ) : eventDocument ? (
        <div className="mt-2 text-[11px] text-slate-400">
          “{shortText(eventDocument, 200)}”
        </div>
      ) : null}

      {event.vectorPreview && (
        <div className="mt-2 flex items-end gap-3">
          <VectorBars values={event.vectorPreview} height={34} count={24} className="w-40" />
          <span className="text-[10px] text-slate-500">
            {event.dimensions || event.vectorPreview.length}-d preview · ||v|| = {event.vectorNorm ?? '—'}
          </span>
        </div>
      )}

      {event.type === 'QUERY' && (
        <div className="mt-2 grid gap-1 text-[11px] text-slate-400 sm:grid-cols-2">
          <div>
            score: <span className="font-bold text-sky-300">{numberOrDash(event.score)}</span> / 100
          </div>
          <div>
            compared: {numberOrDash(event.criteriaCount)} criteria × {numberOrDash(event.propsAnalyzed)} propositions
          </div>
          {event.topMatch && (
            <div className="sm:col-span-2 text-slate-500">
              top match: <span className="text-sky-300">{event.topMatch.similarity_percentage}%</span> — “{shortText(event.topMatch.matched_proposition, 150)}”
            </div>
          )}
        </div>
      )}

      {event.type === 'FUSION' && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
          <span className="border border-slate-700 rounded px-2 py-0.5">lexical {event.lexicalScore}</span>
          <span className="border border-slate-700 rounded px-2 py-0.5">semantic {event.semanticScore}</span>
          <span className="border border-pink-800 bg-pink-950/40 text-pink-300 rounded px-2 py-0.5">fused {event.fusedScore}</span>
        </div>
      )}

      {event.type === 'SYNC' && (event.propositionCount !== undefined || event.criteriaCount !== undefined) && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
          <span className="border border-violet-800 bg-violet-950/40 text-violet-300 rounded px-2 py-0.5">
            {numberOrDash(event.propositionCount)} propositions
          </span>
          <span className="border border-violet-800 bg-violet-950/40 text-violet-300 rounded px-2 py-0.5">
            {numberOrDash(event.criteriaCount)} criteria
          </span>
        </div>
      )}

      {event.type === 'REBALANCE' && Array.isArray(event.changes) && event.changes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          {event.changes.map(change => (
            <span key={change.criterion_id} className="border border-fuchsia-800 bg-fuchsia-950/30 text-fuchsia-200 rounded px-2 py-0.5">
              crit_{change.criterion_id}: {change.before} → {change.after}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const RecordModal = ({ record, onClose, onChanged, notify }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/vector/record/${record.collection}/${encodeURIComponent(record.id)}`);
      setDetails(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [record.collection, record.id]);

  const handleReupsert = async () => {
    if (!details) return;
    setBusy(true);
    try {
      const prefix = COLLECTION_META[record.collection]?.idPrefix || '';
      const rawId = prefix ? String(details.id).replace(new RegExp(`^${prefix}`), '') : String(details.id);
      const isCriterion = record.collection === 'job_criteria';
      const isProp = record.collection === 'candidate_propositions';
      const payload = isCriterion
        ? {
            type: 'criterion',
            id: rawId,
            text: details.document,
            job_id: details.metadata?.job_id || 1,
            weight: details.metadata?.weight ?? 0.5
          }
        : isProp
          ? {
              type: 'proposition',
              id: rawId,
              text: details.document,
              candidate_id: details.metadata?.candidate_id || 1,
              section: details.metadata?.section || 'General'
            }
          : {
              type: record.collection,
              id: rawId,
              text: details.document,
              metadata: details.metadata || {}
            };

      const res = await axios.post(`${API_BASE}/api/vector/test-insert`, payload);
      notify('success', `${res.data.data.operation} event emitted — vector re-upserted with the same ID.`);
      await fetchDetails();
      onChanged();
    } catch (err) {
      notify('error', err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this vector from ChromaDB? The Oracle/Oracle-fallback row is not changed; run Sync to restore it.')) return;
    setBusy(true);
    try {
      const res = await axios.delete(`${API_BASE}/api/vector/record/${record.collection}/${encodeURIComponent(record.id)}`);
      notify('success', res.data.message || 'Vector record deleted.');
      onChanged();
      onClose();
    } catch (err) {
      notify('error', err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const metadataEntries = details?.metadata ? Object.entries(details.metadata) : [];
  const storage = details?.storage;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 border-slate-200">
                Chroma record
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                {COLLECTION_META[record.collection]?.label || record.collection}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-mono mt-1">{record.id}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && <div className="p-8 text-center text-slate-500">Reading record through Chroma and raw SQLite…</div>}
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          {details && !loading && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Document stored in Chroma</div>
                  <p className="text-sm text-slate-800 leading-relaxed">{details.document || '—'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {metadataEntries.map(([key, value]) => (
                      <span key={key} className="text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600">
                        <span className="text-slate-400">{key}:</span> {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-2">Embedding</div>
                  <div className="text-2xl font-black text-indigo-900">{details.vector_dimensions || '—'}<span className="text-sm font-medium text-indigo-600"> dims</span></div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    norm: <span className="font-mono">{numberOrDash(details.vector_norm)}</span>
                  </div>
                  <VectorBars values={details.vector} height={56} count={48} className="mt-3" />
                  <div className="mt-2 text-[10px] text-slate-500">Full vector is stored in the HNSW segment; the preview shows the first 48 dimensions.</div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="p-4 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <FileJson className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-bold text-slate-800">SQLite metadata rows</h4>
                  </div>
                  {storage?.embedding_row ? (
                    <div className="space-y-2 text-[11px]">
                      <div className="grid grid-cols-2 gap-1 bg-slate-50 rounded p-2 font-mono">
                        {Object.entries(storage.embedding_row).map(([key, value]) => (
                          <React.Fragment key={key}>
                            <span className="text-slate-500">{key}</span>
                            <span className="text-slate-800 truncate" title={String(value)}>{String(value)}</span>
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pt-1">embedding_metadata</div>
                      <div className="space-y-1">
                        {(storage.metadata_rows || []).map(row => (
                          <div key={row.key} className="flex justify-between gap-3 bg-slate-50 rounded px-2 py-1 font-mono">
                            <span className="text-slate-500">{row.key}</span>
                            <span className="text-slate-800 text-right break-all">{String(row.value)}</span>
                          </div>
                        ))}
                      </div>
                      {storage.fulltext_row && (
                        <div className="text-[10px] text-slate-500 pt-1">
                          FTS rowid {storage.fulltext_row.rowid}: “{shortText(storage.fulltext_row.string_value, 120)}”
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No SQLite row available (is chroma_data present?).</div>
                  )}
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Boxes className="w-4 h-4 text-slate-500" />
                    <h4 className="text-sm font-bold text-slate-800">Write-ahead queue row</h4>
                  </div>
                  {storage?.queue_row ? (
                    <div className="space-y-2 text-[11px]">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-mono">seq_id {storage.queue_row.seq_id}</span>
                        <span className="bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-mono">{storage.queue_row.operation_name}</span>
                        <span className="bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-mono">{storage.queue_row.encoding}</span>
                        <span className="bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-mono">{storage.queue_row.vector_bytes} bytes</span>
                      </div>
                      <VectorBars values={storage.queue_row.vector_preview} height={44} count={24} />
                      <div className="text-[10px] text-slate-500">
                        The queue stores the raw FLOAT32 vector before/alongside the HNSW index. This is the exact payload Chroma persists.
                      </div>
                      <div className="bg-slate-50 rounded p-2 font-mono text-[10px] text-slate-600 max-h-32 overflow-y-auto">
                        {JSON.stringify(storage.queue_row.metadata, null, 2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No queue row available.</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-slate-200 rounded-xl">
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono">
                  <span className="text-slate-400">collection_uuid</span>
                  <span className="text-indigo-300 break-all">{storage?.collection?.id || '—'}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono">
                  <span className="text-slate-400">vector_segment</span>
                  <span className="text-emerald-300 break-all">{storage?.vector_segment?.id || '—'}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono">
                  <span className="text-slate-400">metadata_segment</span>
                  <span className="text-amber-300 break-all">{storage?.metadata_segment?.id || '—'}</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  Read via Node's built-in read-only <span className="font-mono">node:sqlite</span> from chroma_data/chroma.sqlite3.
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReupsert}
                  disabled={busy}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  title="Upserts the same ID and text; because the record exists, Chroma emits an UPDATE"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                  Re-upsert (show UPDATE)
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete vector (demo)
                </button>
                <button type="button" onClick={onClose} className="btn-primary text-xs">Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SemanticMap = ({ points, onInspect }) => {
  const [hovered, setHovered] = useState(null);
  const [picked, setPicked] = useState(null);
  const selected = picked || hovered;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">2D semantic map</h3>
          <p className="text-xs text-slate-500">
            PCA projection of every 384-dimensional embedding. Nearby points have similar meaning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Propositions</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Criteria</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Jobs</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Candidates</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Apps</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Interviews</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" /> Transcripts</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
        {points.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-sm text-slate-500">
            No vectors available to project yet.
          </div>
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-[30rem]">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.18" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="url(#grid)" rx="1.5" />
            <line x1="50" y1="4" x2="50" y2="96" stroke="#cbd5e1" strokeWidth="0.22" strokeDasharray="1.2 1.2" />
            <line x1="4" y1="50" x2="96" y2="50" stroke="#cbd5e1" strokeWidth="0.22" strokeDasharray="1.2 1.2" />
            <text x="50" y="98" textAnchor="middle" fill="#94a3b8" fontSize="2.1">PC1</text>
            <text x="2.5" y="50" textAnchor="middle" fill="#94a3b8" fontSize="2.1" transform="rotate(-90 2.5 50)">PC2</text>

            {points.map(point => {
              const pointColor = COLLECTION_COLORS[point.collection] || (point.type === 'criterion' ? '#f59e0b' : '#6366f1');
              const isActive = selected && selected.id === point.id;
              return (
                <g key={`${point.collection}-${point.id}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isActive ? 2.1 : 1.25}
                    fill={pointColor}
                    fillOpacity={isActive ? 1 : 0.82}
                    stroke={isActive ? '#0f172a' : '#ffffff'}
                    strokeWidth={isActive ? 0.45 : 0.25}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHovered(point)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setPicked(point)}
                  >
                    <title>{`${point.collection} / ${point.id} — ${shortText(point.text, 100)}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {selected && (
        <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-indigo-900">{selected.id}</span>
            <span className="inline-flex items-center border rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-white text-indigo-700 border-indigo-200">
              {COLLECTION_META[selected.collection]?.short || selected.collection}
            </span>
            <span className="text-slate-500">
              PC1 {selected.explained_variance !== undefined ? `${(selected.explained_variance * 100).toFixed(1)}%` : '—'} ·
              PC2 {selected.second_variance !== undefined ? `${(selected.second_variance * 100).toFixed(1)}%` : '—'} of variance
            </span>
          </div>
          <p className="mt-2 text-slate-700">{selected.text}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-slate-500">Click any point to see its nearest semantic neighborhood; inspect the raw rows to see exactly what Chroma persisted.</p>
            <button
              type="button"
              onClick={() => onInspect(selected)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-white border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50"
            >
              <Eye className="w-3 h-3" /> Inspect raw storage
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const VectorDatabase = ({ initialTab = 'operations' }) => {
  const [status, setStatus] = useState(null);
  const [events, setEvents] = useState([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [collectionsData, setCollectionsData] = useState({});
  const [storage, setStorage] = useState(null);
  const [projection, setProjection] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('candidate_propositions');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [liveError, setLiveError] = useState(null);
  const latestSeqRef = useRef(0);
  const eventsRef = useRef([]);

  const [demoType, setDemoType] = useState('candidate_propositions');
  const [demoId, setDemoId] = useState('');
  const [demoText, setDemoText] = useState('Built a real-time ChromaDB inspector that exposes vector inserts, updates, deletes and similarity queries across 11 collections.');
  const [demoCandidate, setDemoCandidate] = useState(1);
  const [demoJob, setDemoJob] = useState(1);
  const [demoSection, setDemoSection] = useState('Projects');
  const [demoWeight, setDemoWeight] = useState(0.5);
  const [demoBusy, setDemoBusy] = useState(false);

  const [queryCandidate, setQueryCandidate] = useState(1);
  const [queryJob, setQueryJob] = useState(1);
  const [queryResult, setQueryResult] = useState(null);
  const [queryBusy, setQueryBusy] = useState(false);

  eventsRef.current = events;

  const notify = (type, text) => {
    setNotice({ type, text, at: Date.now() });
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/vector/status`);
      if (res.data?.success) setStatus(res.data.data);
    } catch (err) {
      setLiveError('Backend unreachable. Start the Express server on port 3000.');
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/vector/operations-log`, {
        params: { since: latestSeqRef.current }
      });
      const payload = res.data?.data;
      if (!payload) return;

      if (payload.latest_seq < latestSeqRef.current) {
        latestSeqRef.current = 0;
        return;
      }

      const incoming = Array.isArray(payload.events) ? payload.events : [];
      if (incoming.length > 0) {
        setEvents(previous => {
          const seen = new Set(previous.map(event => event.seq));
          const merged = [...incoming.filter(event => !seen.has(event.seq)), ...previous];
          return merged.sort((a, b) => b.seq - a.seq).slice(0, 300);
        });
      }
      if (typeof payload.latest_seq === 'number') {
        latestSeqRef.current = Math.max(latestSeqRef.current, payload.latest_seq);
      }
      setLiveError(null);
    } catch (err) {
      setLiveError('Live event stream unavailable. Is the backend running on port 3000?');
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/vector/collections-data`);
      if (res.data?.success) {
        setCollectionsData(res.data.data);
      }
    } catch (err) {
      // status/live banner already reports backend issues
    }
  };

  const fetchStorage = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/vector/storage-internals`);
      if (res.data?.success) setStorage(res.data.data);
    } catch (err) {
      // optional
    }
  };

  const fetchProjection = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/vector/2d-projection`);
      if (res.data?.success) setProjection(res.data.data || []);
    } catch (err) {
      // optional
    }
  };

  const refreshAll = async () => {
    await Promise.allSettled([fetchStatus(), fetchCollections(), fetchStorage(), fetchProjection(), fetchEvents()]);
  };

  useEffect(() => {
    refreshAll();
    const statusTimer = setInterval(fetchStatus, 5000);
    const collectionsTimer = setInterval(fetchCollections, 5000);
    const storageTimer = setInterval(fetchStorage, 10000);
    const projectionTimer = setInterval(fetchProjection, 20000);
    let eventsTimer = null;
    if (!paused) {
      eventsTimer = setInterval(fetchEvents, 1500);
    }
    return () => {
      clearInterval(statusTimer);
      clearInterval(collectionsTimer);
      clearInterval(storageTimer);
      clearInterval(projectionTimer);
      if (eventsTimer) clearInterval(eventsTimer);
    };
  }, [paused]);

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/vector/sync-from-db`);
      notify('success', res.data.message || 'Sync complete.');
      await refreshAll();
    } catch (err) {
      notify('error', err.response?.data?.error || err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDemoInsert = async (event) => {
    event.preventDefault();
    if (!demoText.trim()) {
      notify('error', 'Enter some text to embed.');
      return;
    }
    setDemoBusy(true);
    try {
      const payload = {
        type: demoType,
        text: demoText,
        ...(demoId.trim() ? { id: demoId.trim() } : {})
      };
      if (demoType === 'job_criteria' || demoType === 'criterion') {
        payload.job_id = Number(demoJob) || 1;
        payload.weight = Number(demoWeight) || 0.5;
      } else if (demoType === 'candidate_propositions' || demoType === 'proposition') {
        payload.candidate_id = Number(demoCandidate) || 1;
        payload.section = demoSection || 'General';
      } else {
        payload.metadata = { demo_upsert_time: new Date().toISOString() };
      }
      const res = await axios.post(`${API_BASE}/api/vector/test-insert`, payload);
      const data = res.data.data;
      const dest = demoType === 'job_postings' ? 'Job Postings page (/jobs)' : (demoType === 'candidates' ? 'Candidates page (/candidates)' : 'Collections');
      notify('success', `${data.operation} in ${data.engine}: ${data.id} is live in ChromaDB and synchronized with the ${dest}!`);
      await refreshAll();
    } catch (err) {
      notify('error', err.response?.data?.error || err.message);
    } finally {
      setDemoBusy(false);
    }
  };

  const handleRunQuery = async (event) => {
    event.preventDefault();
    setQueryBusy(true);
    setQueryResult(null);
    try {
      const res = await axios.post(`${API_BASE}/api/vector/match-score`, {
        candidate_id: Number(queryCandidate) || 1,
        job_id: Number(queryJob) || 1
      });
      setQueryResult(res.data.data);
      await Promise.allSettled([fetchEvents(), fetchStatus()]);
    } catch (err) {
      notify('error', err.response?.data?.error || err.message);
    } finally {
      setQueryBusy(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filter === 'ALL') return events;
    if (filter === 'CONNECT') return events.filter(event => event.type === 'CONNECT' || event.type === 'DISCONNECT');
    return events.filter(event => event.type === filter);
  }, [events, filter]);

  const totalIndexedVectors = useMemo(() => {
    return Object.keys(COLLECTION_META).reduce((sum, key) => {
      const list = collectionsData[key] || [];
      return sum + list.length;
    }, 0);
  }, [collectionsData]);

  const currentRecords = useMemo(() => {
    return collectionsData[selectedCollection] || [];
  }, [collectionsData, selectedCollection]);

  const allRecords = useMemo(() => {
    const records = currentRecords;
    const needle = search.trim().toLowerCase();
    if (!needle) return records;
    return records.filter(record => {
      const metadataText = Object.values(record.metadata || {}).join(' ');
      return `${record.id} ${record.text} ${metadataText}`.toLowerCase().includes(needle);
    });
  }, [currentRecords, search]);

  const sqliteSize = status?.sqlite_size_bytes
    ?? (storage?.sqlite?.files || []).reduce((sum, file) => sum + file.bytes, 0);
  const hnswSize = (storage?.hnsw || []).reduce((sum, segment) => sum + (segment.total_bytes || 0), 0);
  const totalStorage = sqliteSize + hnswSize;

  const tabs = [
    { id: 'operations', label: 'Live Operations', icon: Activity, badge: events.length },
    { id: 'collections', label: 'Collections (11)', icon: Layers, badge: totalIndexedVectors },
    { id: 'storage', label: 'Storage Internals', icon: HardDrive },
    { id: 'map', label: 'Semantic Map', icon: Waypoints },
    { id: 'demo', label: 'Write Demo', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% ChromaDB Vector Database
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Gauge className="w-7 h-7 text-indigo-600" />
            Vector DB Inspector
          </h1>
          <p className="text-slate-500 mt-1 max-w-3xl">
            Watch the real inserts, updates, deletes and similarity queries produced by the web app, and see exactly how
            ChromaDB stores all 11 project entities: collection metadata in SQLite, 384-d vectors in HNSW segments, and every operation in the live stream.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="btn-secondary text-xs flex items-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            title="Push every project entity into ChromaDB collections and emit SYNC events"
          >
            <ArrowRight className={`w-3.5 h-3.5 ${syncLoading ? 'animate-pulse' : ''}`} />
            {syncLoading ? 'Syncing into ChromaDB…' : 'Sync All Entities → ChromaDB'}
          </button>
          <button onClick={refreshAll} className="btn-primary text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className={`p-3 rounded-xl border text-sm flex items-start gap-2 ${
          notice.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {notice.type === 'error'
            ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {liveError && (
        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{liveError}</span>
        </div>
      )}

      {status && !status.isChromaActive && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          <div className="font-bold flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" /> ChromaDB server is not connected
          </div>
          <p className="text-xs">
            The app is currently using the embedded fallback vector store. Start the real server to see HNSW storage:
          </p>
          <code className="mt-2 inline-block text-[11px] bg-white/70 border border-amber-200 rounded px-2 py-1 font-mono">
            chroma run --path ./chroma_data --port 8000
          </code>
        </div>
      )}

      {status?.isChromaActive && (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="flex items-center gap-1.5 font-semibold"><CheckCircle2 className="w-4 h-4" /> Connected to ChromaDB</span>
          <span>server {status.chroma_version || '—'}</span>
          <span>port {status.port}</span>
          <span>HNSW cosine · 384 dimensions</span>
          <span className="font-mono text-[10px] text-emerald-700">{status.persistence_path}</span>
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Server} label="Engine" value={status?.isChromaActive ? 'ChromaDB' : 'Fallback'} hint={status?.engine || 'Waiting…'} tone={status?.isChromaActive ? 'emerald' : 'amber'} />
        <StatCard icon={Database} label="Indexed Vectors" value={totalIndexedVectors || numberOrDash(status?.total_indexed_vectors)} hint="across 11 collections" tone="indigo" />
        <StatCard icon={ListTree} label="Chroma Collections" value="11" hint="100% ChromaDB schema" tone="amber" />
        <StatCard icon={Cpu} label="Embedding" value="384-d" hint="all-MiniLM-L6-v2 ONNX" tone="sky" />
        <StatCard icon={HardDrive} label="Chroma storage" value={formatBytes(totalStorage)} hint={`${formatBytes(sqliteSize)} SQLite + ${formatBytes(hnswSize)} HNSW`} tone="slate" />
        <StatCard icon={Activity} label="Live events" value={events.length} hint={paused ? 'Stream paused' : 'polling every 1.5s'} tone="indigo" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* LIVE OPERATIONS */}
      {activeTab === 'operations' && (
        <div className="space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {EVENT_FILTERS.map(option => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                    filter === option
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${paused ? 'text-amber-700' : 'text-emerald-700'}`}>
                <span className={`w-2 h-2 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                {paused ? 'PAUSED' : 'LIVE'}
              </span>
              <button
                onClick={() => setPaused(previous => !previous)}
                className="btn-secondary text-[11px] flex items-center gap-1.5 py-1.5"
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => setEvents([])}
                className="btn-secondary text-[11px] flex items-center gap-1.5 py-1.5 text-slate-500"
                title="Clear only the browser view; the server keeps its ring buffer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear view
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">ChromaDB operation stream</span>
              <span className="ml-auto text-[10px] text-slate-500">seq {latestSeqRef.current} · {filteredEvents.length} shown</span>
            </div>
            <div className="p-4 max-h-[42rem] overflow-y-auto font-mono text-xs">
              {filteredEvents.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No operations match this filter yet.</p>
                  <p className="text-[10px] mt-1">Add a proposition, edit a rubric, rebalance weights, or run a vector query to generate events.</p>
                </div>
              ) : (
                filteredEvents.map(event => <EventRow key={event.seq || event.id} event={event} />)
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> INSERT</div>
              <p className="text-emerald-700 mt-1">A new proposition or rubric row gets embedded and upserted into a Chroma collection.</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="font-bold text-amber-800 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> UPDATE</div>
              <p className="text-amber-700 mt-1">Editing text or rebalancing weights reuses the same Chroma ID, so the document/metadata is overwritten.</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <div className="font-bold text-rose-800 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> DELETE</div>
              <p className="text-rose-700 mt-1">Deleting a proposition/rubric removes its vector from the collection and HNSW index.</p>
            </div>
          </div>
        </div>
      )}

      {/* COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLLECTION_META).map(([name, meta]) => {
                const records = collectionsData[name] || [];
                const isActive = selectedCollection === name;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedCollection(name)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    {meta.short || meta.label}
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                      {records.length}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search id, text or metadata…"
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{COLLECTION_META[selectedCollection]?.label || selectedCollection}</span>
            <span>{allRecords.length} of {currentRecords.length} records</span>
            <span className="font-mono text-[10px]">collection.get({'{'} include: ['documents','metadatas','embeddings'] {'}'})</span>
            <span className="ml-auto">Click a row to inspect its SQLite row and HNSW queue payload.</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Chroma ID</th>
                    <th className="px-4 py-3 min-w-[18rem]">Document</th>
                    <th className="px-4 py-3">Metadata</th>
                    <th className="px-4 py-3 min-w-[10rem]">Vector preview</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        No records match. Try syncing into ChromaDB.
                      </td>
                    </tr>
                  ) : (
                    allRecords.map(record => (
                      <tr key={record.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono font-semibold text-indigo-700">{record.id}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{record.collection}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-slate-700 leading-relaxed line-clamp-3">{record.text || '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(record.metadata || {}).map(([key, value]) => (
                              <span key={key} className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <VectorBars values={record.vector_preview} height={34} count={12} className="w-24" />
                          <div className="text-[10px] text-slate-400 mt-1">
                            {record.vector_dimensions || 384}-d · norm {record.vector_norm ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <button
                            onClick={() => setSelectedRecord({ collection: record.collection, id: record.id })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded px-2 py-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STORAGE INTERNALS */}
      {activeTab === 'storage' && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Chroma persistence root</h3>
              </div>
              <div className="font-mono text-[11px] text-slate-600 break-all bg-slate-50 border border-slate-100 rounded p-2">
                {storage?.persistence_path || status?.persistence_path || '—'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                {(storage?.sqlite?.files || status?.sqlite_files || []).map(file => (
                  <span key={file.name} className="border border-slate-200 bg-slate-50 rounded px-2 py-1 text-slate-600 font-mono">
                    {file.name}: {formatBytes(file.bytes)}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-slate-500">
                ChromaDB stores collection/segment metadata in <span className="font-mono">chroma.sqlite3</span> and the graph/vector payload in one HNSW directory per vector segment.
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">On-disk layout</div>
              <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                <div className="flex items-center gap-2"><FileJson className="w-3.5 h-3.5 text-indigo-500" /> chroma.sqlite3 — metadata + queue</div>
                <div className="flex items-center gap-2"><Boxes className="w-3.5 h-3.5 text-indigo-500" /> &lt;segment-uuid&gt;/ — HNSW graph</div>
                <div className="flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-indigo-500" /> 384 floats per vector = 1,536 bytes</div>
                <div className="flex items-center gap-2"><Waypoints className="w-3.5 h-3.5 text-indigo-500" /> cosine distance, m=16 neighbors</div>
              </div>
            </div>
          </div>

          {!storage?.sqlite?.available && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              Raw SQLite inspection is unavailable: {storage?.sqlite?.error || 'chroma_data/chroma.sqlite3 could not be read.'}
            </div>
          )}

          {storage?.sqlite?.collections && (
            <div className="grid gap-4 lg:grid-cols-2">
              {storage.sqlite.collections.filter(collection => collection.name !== 'test_col').map(collection => {
                const segment = (storage.hnsw || []).find(dir => dir.segment_id === collection.vector_segment);
                return (
                  <div key={collection.id} className="p-4 rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-indigo-500" />
                          <h4 className="font-bold text-slate-800">{collection.name}</h4>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-slate-400 break-all">{collection.id}</div>
                      </div>
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-1">
                        {collection.record_count} records
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-slate-400 text-[9px] uppercase">Dimension</div>
                        <div className="font-mono text-slate-800">{collection.dimension || '—'}</div>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-slate-400 text-[9px] uppercase">HNSW space</div>
                        <div className="font-mono text-slate-800">{collection.hnsw_space || '—'}</div>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-slate-400 text-[9px] uppercase">Queue writes</div>
                        <div className="font-mono text-slate-800">{collection.queue_writes}</div>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <div className="text-slate-400 text-[9px] uppercase">First / last write</div>
                        <div className="font-mono text-slate-800 text-[10px]">{collection.first_seen || '—'} → {collection.last_seen || '—'}</div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-[10px] font-mono text-slate-500">
                      <div><span className="text-slate-400">vector_segment</span> {collection.vector_segment || '—'}</div>
                      <div><span className="text-slate-400">metadata_segment</span> {collection.metadata_segment || '—'}</div>
                    </div>

                    {segment && (
                      <div className="mt-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">HNSW files</div>
                        <div className="grid grid-cols-2 gap-1">
                          {segment.files.map(file => (
                            <div key={file.name} className="flex justify-between gap-2 text-[10px] bg-slate-50 rounded px-2 py-1 font-mono">
                              <span className="text-slate-600">{file.name}</span>
                              <span className="text-slate-400">{formatBytes(file.bytes)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-800">SQLite tables</h4>
                <span className="ml-auto text-[10px] text-slate-400">{storage?.sqlite?.tables?.length || 0} tables</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <tbody className="divide-y divide-slate-100">
                    {(storage?.sqlite?.tables || []).map(table => (
                      <tr key={table.name} className="hover:bg-slate-50">
                        <td className="px-4 py-1.5 font-mono text-slate-700">{table.name}</td>
                        <td className="px-4 py-1.5 text-right font-mono text-slate-500">{table.rows === null || table.rows === undefined ? '—' : table.rows}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Waypoints className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-800">How a web-app write is stored</h4>
              </div>
              <ol className="space-y-2">
                {(storage?.write_path || [
                  'React action',
                  'Express endpoint',
                  '384-d embedding',
                  'Chroma upsert/delete',
                  'SQLite + HNSW persistence',
                  'Cosine similarity query'
                ]).map((step, index) => (
                  <li key={step} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* SEMANTIC MAP */}
      {activeTab === 'map' && (
        <SemanticMap
          points={projection}
          onInspect={point => setSelectedRecord({ collection: point.collection, id: point.id })}
        />
      )}

      {/* WRITE DEMO */}
      {activeTab === 'demo' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <form onSubmit={handleDemoInsert} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Upsert a vector from the browser</h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                This calls the same ONNX embedder and Chroma collection used by the real app. Submit the same ID twice to see an UPDATE.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Collection</label>
                <select
                  className="input-field text-sm"
                  value={demoType}
                  onChange={event => setDemoType(event.target.value)}
                >
                  {Object.entries(COLLECTION_META).map(([name, meta]) => (
                    <option key={name} value={name}>{meta.label} ({name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ID (optional numeric or leave blank)</label>
                <input
                  type="text"
                  value={demoId}
                  onChange={event => setDemoId(event.target.value)}
                  placeholder="e.g. 6 (or leave empty for real auto-ID)"
                  className="input-field text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Text to embed & store</label>
              <textarea
                required
                value={demoText}
                onChange={event => setDemoText(event.target.value)}
                className="input-field text-sm min-h-[96px]"
                placeholder={demoType === 'job_postings' ? "Enter 'Job Title: Description' or job title..." : "Write text to embed into ChromaDB…"}
              />
              {demoType === 'job_postings' && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Tip: Use &quot;Title: Description&quot; (e.g. Cloud Architect: Enterprise Kubernetes & Terraform). It will be saved as a real job posting visible on the <Link to="/jobs" className="text-indigo-600 underline font-semibold">Job Postings page</Link>.
                </p>
              )}
            </div>

            {demoType === 'candidate_propositions' || demoType === 'proposition' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Candidate ID</label>
                  <input type="number" min="1" value={demoCandidate} onChange={event => setDemoCandidate(event.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Section</label>
                  <input type="text" value={demoSection} onChange={event => setDemoSection(event.target.value)} className="input-field text-sm" />
                </div>
              </div>
            ) : demoType === 'job_criteria' || demoType === 'criterion' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Job ID</label>
                  <input type="number" min="1" value={demoJob} onChange={event => setDemoJob(event.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Weight</label>
                  <input type="number" step="0.05" min="0.05" max="1" value={demoWeight} onChange={event => setDemoWeight(event.target.value)} className="input-field text-sm" />
                </div>
              </div>
            ) : null}

            <button type="submit" disabled={demoBusy} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              {demoBusy ? 'Embedding & upserting…' : 'Embed & upsert into ChromaDB'}
            </button>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-700">What happens:</span> text → all-MiniLM-L6-v2 → normalized 384-d vector → <span className="font-mono">collection.upsert({'{'} ids, embeddings, metadatas, documents {'}'})</span>. The operation appears in Live Operations and the record appears in Collections.
            </div>
          </form>

          <div className="space-y-5">
            <form onSubmit={handleRunQuery} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-800">Run a real cosine similarity query</h3>
              </div>
              <p className="text-[11px] text-slate-500">
                This is the same score used when a candidate applies. It filters propositions and criteria by metadata, then compares every pair in 384-d space.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Candidate ID</label>
                  <input type="number" min="1" value={queryCandidate} onChange={event => setQueryCandidate(event.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Job ID</label>
                  <input type="number" min="1" value={queryJob} onChange={event => setQueryJob(event.target.value)} className="input-field text-sm" />
                </div>
              </div>
              <button type="submit" disabled={queryBusy} className="btn-secondary w-full text-sm flex items-center justify-center gap-2 text-sky-700 border-sky-200 hover:bg-sky-50">
                <Activity className="w-4 h-4" />
                {queryBusy ? 'Comparing vectors…' : 'Run vector query & emit QUERY event'}
              </button>

              {queryResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-sky-100 bg-sky-50">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-sky-600">Semantic score</div>
                      <div className="text-2xl font-black text-sky-800">{queryResult.semantic_score} <span className="text-xs font-normal text-slate-500">/ 100</span></div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <div className="font-semibold text-sky-700">{queryResult.engine}</div>
                      <div>{queryResult.criteria_count} criteria × {queryResult.propositions_analyzed} props</div>
                      <div>{queryResult.query_time_ms} ms</div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(queryResult.breakdown || []).map((item, index) => (
                      <div key={index} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px]">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-700">{item.criterion}</span>
                          <span className="font-bold text-sky-700 whitespace-nowrap">{item.similarity_percentage}%</span>
                        </div>
                        <div className="mt-1 text-slate-500">{item.matched_proposition}</div>
                        <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-1.5 bg-sky-500 rounded-full" style={{ width: `${Math.min(100, item.similarity_percentage)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-900">Trigger real web-app operations</h3>
              </div>
              <p className="text-[11px] text-indigo-800/80">
                The inspector is wired to the actual pages. Do these actions, then come back to Live Operations:
              </p>
              <div className="mt-3 grid gap-2">
                <Link to="/jobs" className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-indigo-100 text-[11px] text-slate-700 hover:border-indigo-300">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                  <span><span className="font-semibold">Job Postings → Rubric Criteria</span> — add, edit, delete, or rebalance weights</span>
                </Link>
                <Link to="/candidates" className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-indigo-100 text-[11px] text-slate-700 hover:border-indigo-300">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                  <span><span className="font-semibold">Candidates → Resume Propositions</span> — add, edit, or delete a proposition</span>
                </Link>
                <Link to="/candidates" className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-indigo-100 text-[11px] text-slate-700 hover:border-indigo-300">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                  <span><span className="font-semibold">Candidates → Apply & Vector Match</span> — run a semantic query</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <RecordModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onChanged={refreshAll}
          notify={notify}
        />
      )}
    </div>
  );
};

export { EventRow, RecordModal, SemanticMap, VectorBars, StatCard };
export default VectorDatabase;
