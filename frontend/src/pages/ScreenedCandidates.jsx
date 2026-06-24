import React, { useState, useEffect } from 'react';
import API_URL from '../apiConfig';
import { useNavigate } from 'react-router-dom';
import {
    BarChart2, Download, FileText, FileSpreadsheet, Loader2, Eye, X,
    Search, Trash2, AlertTriangle, CheckCircle, AlertCircle, ChevronLeft,
    Calendar, Users, TrendingUp, Clock, ArrowRight, Gem, Sparkles,
    RefreshCw, BookOpen, LayoutGrid, List, MessageSquare, Star, ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Score Ring ────────────────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 56 }) => {
    const r = (size - 6) / 2;
    const circ = r * 2 * Math.PI;
    const offset = circ - (Math.min(score, 100) / 100) * circ;
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const bg = score >= 75 ? '#ecfdf5' : score >= 50 ? '#fffbe6' : '#fef2f2';
    const borderGlow = score >= 75 ? 'shadow-[0_0_12px_rgba(16,185,129,0.25)]' : score >= 50 ? 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' : '';
    
    return (
        <div className={`relative flex items-center justify-center rounded-full shrink-0 ${borderGlow}`} style={{ width: size, height: size, background: bg }}>
            <svg className="absolute transform -rotate-90" style={{ width: '100%', height: '100%' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={4.5} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4.5}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
            </svg>
            <span className="text-xs font-black tracking-tight" style={{ color }}>{Math.round(score)}%</span>
        </div>
    );
};

// ─── Custom Req Badge ─────────────────────────────────────────────────────────
const GemBadge = ({ label }) => (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-50/80 text-violet-700 border border-violet-200 shadow-sm animate-pulse-subtle">
        <Gem size={8} className="text-violet-600 animate-spin-slow" /> {label}
    </span>
);

// ─── Utility helpers ─────────────────────────────────────────────────────────
const cleanPhone = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits || phone;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const stripMarkdown = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/#+\s+/g, '')
        .replace(/[*`~_]/g, '')
        .replace(/^[ \t]*[-*+]\s+/gm, '• ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
};

// ─── Export utilities ────────────────────────────────────────────────────────
const AVAILABLE_COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'score', label: 'Score' },
    { key: 'role', label: 'Role' },
    { key: 'location', label: 'Location' },
    { key: 'education_details', label: 'Education' },
    { key: 'experience', label: 'Total Experience' },
    { key: 'keyword_match_pct', label: 'Keyword Match %' },
    { key: 'key_skills_match', label: 'Matched Keywords' },
    { key: 'candidate_summary', label: 'Summary' },
    { key: 'certification_match', label: 'Certification Matches' },
    { key: 'custom_prompt_matches', label: 'Custom Req. Matches' },
    { key: 'missing_skills', label: 'Missing Skills / Gaps' },
    { key: 'reasoning', label: 'AI Evaluation Reasoning' },
];

const exportToPDF = (candidates, selectedColumns) => {
    const compactKeys = ['name', 'phone', 'email', 'score', 'role', 'location', 'education_details', 'experience', 'keyword_match_pct'];
    const compactCols = selectedColumns.filter(col => compactKeys.includes(col.key));
    const detailKeys = ['key_skills_match', 'missing_skills', 'candidate_summary', 'certification_match', 'custom_prompt_matches', 'reasoning'];
    const hasDetails = selectedColumns.some(col => detailKeys.includes(col.key));

    const orientation = compactCols.length > 4 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text("Screened Candidates Report", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Total Candidates: ${candidates.length}`, 14, 24);

    if (compactCols.length > 0) {
        const headers = [["Rank", ...compactCols.map(col => col.label)]];
        const body = candidates.map((c, i) => [
            i + 1,
            ...compactCols.map(col => {
                const a = c.analysis_data || {};
                if (col.key === 'name') return c.name || '—';
                if (col.key === 'phone') return cleanPhone(c.phone) || '—';
                if (col.key === 'email') return (c.email && !c.email.startsWith('no-email-')) ? c.email : '—';
                if (col.key === 'score') return c.score != null ? `${Math.round(c.score)}%` : '—';
                if (col.key === 'role') return c.role || '—';
                if (col.key === 'location') return a.location || '—';
                if (col.key === 'education_details') return a.education_details || '—';
                if (col.key === 'experience') return a.experience || '—';
                if (col.key === 'keyword_match_pct') return a.keyword_match_pct != null ? `${Number(a.keyword_match_pct).toFixed(0)}%` : '—';
                return '—';
            })
        ]);

        autoTable(doc, {
            startY: 28,
            head: headers,
            body,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' }
        });
    }

    if (hasDetails) {
        candidates.forEach((c, idx) => {
            doc.addPage();
            const a = c.analysis_data || {};
            
            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.text(`Candidate Dossier: ${c.name || 'Unknown'}`, 14, 18);
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Rank: #${idx + 1}  |  Score: ${c.score != null ? Math.round(c.score) : 0}%  |  Role: ${c.role || '—'}`, 14, 24);
            const displayEmail = (c.email && !c.email.startsWith('no-email-')) ? c.email : '—';
            doc.text(`Email: ${displayEmail}  |  Phone: ${cleanPhone(c.phone) || '—'}`, 14, 29);
            
            const detailRows = [];
            
            if (selectedColumns.some(col => col.key === 'candidate_summary')) {
                detailRows.push(["Executive Summary", stripMarkdown(a.candidate_summary || a.reasoning || '—')]);
            }
            if (selectedColumns.some(col => col.key === 'key_skills_match')) {
                const skillsList = Array.isArray(a.key_skills_match) ? a.key_skills_match.join(', ') : '—';
                detailRows.push(["Matched Skills", skillsList]);
            }
            if (selectedColumns.some(col => col.key === 'missing_skills')) {
                const missingList = Array.isArray(a.missing_skills) ? a.missing_skills.join(', ') : '—';
                detailRows.push(["Missing Skills / Gaps", missingList]);
            }
            if (selectedColumns.some(col => col.key === 'certification_match')) {
                const certsList = Array.isArray(a.certification_match) ? a.certification_match.join(', ') : '—';
                detailRows.push(["Certification Matches", certsList]);
            }
            if (selectedColumns.some(col => col.key === 'custom_prompt_matches')) {
                const customPromptList = Array.isArray(a.custom_prompt_matches) ? a.custom_prompt_matches.join(', ') : '—';
                detailRows.push(["Custom Req. Matches", customPromptList]);
            }
            if (selectedColumns.some(col => col.key === 'reasoning')) {
                detailRows.push(["AI Reasoning", stripMarkdown(a.reasoning || '—')]);
            }
            
            autoTable(doc, {
                startY: 34,
                head: [["Section", "Details"]],
                body: detailRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                columnStyles: {
                    0: { fontStyle: 'bold', width: 45, fillColor: [249, 250, 251] },
                    1: { cellWidth: 'auto', overflow: 'linebreak' }
                },
                styles: { fontSize: 8.5, cellPadding: 4 }
            });
        });
    }

    doc.save(`screened_candidates_${new Date().toISOString().slice(0, 10)}.pdf`);
};

const exportToExcel = (candidates, selectedColumns) => {
    const headers = ['Rank', ...selectedColumns.map(col => col.label)];
    const data = candidates.map((c, i) => {
        const row = { 'Rank': i + 1 };
        selectedColumns.forEach(col => {
            if (col.key === 'name') row[col.label] = c.name || '—';
            else if (col.key === 'phone') row[col.label] = cleanPhone(c.phone) || '—';
            else if (col.key === 'email') row[col.label] = (c.email && !c.email.startsWith('no-email-')) ? c.email : '—';
            else if (col.key === 'score') row[col.label] = c.score != null ? `${c.score.toFixed(2)}%` : '—';
            else if (col.key === 'role') row[col.label] = c.role || '—';
            else if (col.key === 'location') row[col.label] = c.analysis_data?.location || '—';
            else if (col.key === 'education_details') row[col.label] = c.analysis_data?.education_details || '—';
            else if (col.key === 'experience') row[col.label] = c.analysis_data?.experience || '—';
            else if (col.key === 'keyword_match_pct') row[col.label] = c.analysis_data?.keyword_match_pct != null ? `${Number(c.analysis_data.keyword_match_pct).toFixed(2)}%` : '—';
            else if (col.key === 'key_skills_match') row[col.label] = Array.isArray(c.analysis_data?.key_skills_match) ? c.analysis_data.key_skills_match.join(', ') : '—';
            else if (col.key === 'candidate_summary') row[col.label] = stripMarkdown(c.analysis_data?.candidate_summary || c.analysis_data?.reasoning || '—');
            else if (col.key === 'certification_match') row[col.label] = Array.isArray(c.analysis_data?.certification_match) ? c.analysis_data.certification_match.join(', ') : '—';
            else if (col.key === 'custom_prompt_matches') row[col.label] = Array.isArray(c.analysis_data?.custom_prompt_matches) ? c.analysis_data.custom_prompt_matches.join(', ') : '—';
            else if (col.key === 'missing_skills') row[col.label] = Array.isArray(c.analysis_data?.missing_skills) ? c.analysis_data.missing_skills.join(', ') : '—';
            else if (col.key === 'reasoning') row[col.label] = stripMarkdown(c.analysis_data?.reasoning || '—');
            else row[col.label] = '—';
        });
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Screened Candidates");
    const maxLen = {};
    headers.forEach(h => { maxLen[h] = h.length; });
    data.forEach(row => { Object.keys(row).forEach(key => { const val = String(row[key] || ''); maxLen[key] = Math.max(maxLen[key] || 0, val.length); }); });
    worksheet["!cols"] = headers.map(h => h === 'Summary' ? { wch: 50 } : { wch: Math.min(Math.max(maxLen[h] + 3, 10), 60) });
    XLSX.writeFile(workbook, `screened_candidates_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─── Toast Component ─────────────────────────────────────────────────────────
const Toast = ({ message, type, onDismiss }) => (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold transition-all ${type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
        {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
        {message}
        <button onClick={onDismiss} className="ml-2 hover:opacity-70 transition-opacity"><X size={14} /></button>
    </div>
);

// ─── Confirm Modal ────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, confirmLabel, danger, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-inner" style={{ backgroundColor: danger ? '#FEF2F2' : '#F0FDF4' }}>
                <AlertTriangle size={22} className={danger ? 'text-red-600' : 'text-emerald-600'} />
            </div>
            <div className="text-center">
                <h3 className="text-base font-black text-gray-900 mb-1">{title}</h3>
                <p className="text-xs text-gray-400 font-semibold leading-relaxed">{message}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-500 bg-slate-150 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={onConfirm} className={`flex-1 py-2.5 px-4 text-xs font-bold text-white rounded-xl transition-colors shadow-sm ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{confirmLabel}</button>
            </div>
        </div>
    </div>
);

// ─── Export Config Modal ──────────────────────────────────────────────────────
const ExportConfigModal = ({ isOpen, onClose, candidates, onExport }) => {
    const [selectedCols, setSelectedCols] = useState(AVAILABLE_COLUMNS.slice(0, 7));
    const [format, setFormat] = useState('excel');

    const toggleColumn = (col) => {
        setSelectedCols(prev =>
            prev.some(c => c.key === col.key)
                ? prev.filter(c => c.key !== col.key)
                : [...prev, col]
        );
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm"><Download size={16} className="text-emerald-600" /> Export Configuration</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-150 rounded-lg text-slate-400"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-5">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Export Format</p>
                        <div className="flex gap-2">
                            {[{ k: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet }, { k: 'pdf', label: 'PDF Report', icon: FileText }].map(f => (
                                <button key={f.k} onClick={() => setFormat(f.k)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${format === f.k ? 'border-emerald-500 bg-green-50/30 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <f.icon size={14} /> {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Select Columns</p>
                            <div className="flex gap-2 text-[10px] font-black text-emerald-600">
                                <button onClick={() => setSelectedCols(AVAILABLE_COLUMNS)} className="hover:underline">Select All</button>
                                <span className="text-gray-300">|</span>
                                <button onClick={() => setSelectedCols([])} className="hover:underline">Clear All</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                            {AVAILABLE_COLUMNS.map(col => {
                                const selected = selectedCols.some(c => c.key === col.key);
                                return (
                                    <button key={col.key} onClick={() => toggleColumn(col)} className={`text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selected ? 'bg-green-50/40 border-emerald-500/25 text-emerald-700' : 'bg-gray-50/50 border-gray-100 text-gray-500 hover:bg-gray-100/50'}`}>
                                        {col.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
                    <button
                        onClick={() => onExport(format, selectedCols)}
                        disabled={selectedCols.length === 0}
                        className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                        Download Report
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Analysis Modal ───────────────────────────────────────────────────────────
const AnalysisModal = ({ candidate, onClose }) => {
    const analysis = candidate.analysis_data || {};
    const customMatches = analysis.custom_prompt_matches || [];
    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-3xl shrink-0">
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{candidate.name}</h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">{candidate.role || 'Role N/A'} · Score: {candidate.score?.toFixed(1)}%</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-150 text-slate-400"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs no-scrollbar">
                    {customMatches.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider flex items-center gap-1"><Gem size={11} /> Custom Guideline Matches</p>
                            <div className="flex flex-wrap gap-1.5 bg-violet-50/50 border border-violet-100 p-3 rounded-2xl">
                                {customMatches.map((m, i) => (
                                    <GemBadge key={i} label={m} />
                                ))}
                            </div>
                        </div>
                    )}
                    {analysis.reasoning && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AI Evaluation Description</p>
                            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 text-slate-700 leading-relaxed font-semibold">{analysis.reasoning}</div>
                        </div>
                    )}
                    {Array.isArray(analysis.key_skills_match) && analysis.key_skills_match.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Matched Technologies</p>
                            <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">{analysis.key_skills_match.map((s, i) => <span key={i} className="text-[9px] px-2 py-0.5 bg-white text-emerald-700 border border-emerald-100 rounded-md font-bold uppercase">{s}</span>)}</div>
                        </div>
                    )}
                    {Array.isArray(analysis.missing_skills) && analysis.missing_skills.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Missing Competencies / Gaps</p>
                            <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">{analysis.missing_skills.map((s, i) => <span key={i} className="text-[9px] px-2 py-0.5 bg-white text-rose-600 border border-rose-100 rounded-md font-bold uppercase">{s}</span>)}</div>
                        </div>
                    )}
                    {analysis.candidate_summary && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Candidate Executive Summary</p>
                            <p className="text-xs text-slate-500 italic leading-relaxed">{analysis.candidate_summary}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Batch Detail View (drill-in) ─────────────────────────────────────────────
const BatchDetailView = ({ batchId, batchMeta, onBack, onDeleteBatch }) => {
    const navigate = useNavigate();
    const [batchData, setBatchData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSegment, setActiveSegment] = useState('shortlisted'); // 'shortlisted' | 'rejected' | 'all'
    const [searchQuery, setSearchQuery] = useState('');
    const [analysisCandidate, setAnalysisCandidate] = useState(null);
    const [resumeCandidate, setResumeCandidate] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [toast, setToast] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

    const showToast = (msg, type = 'success') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/resume/screen/batch/${batchId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (res.ok) {
                    const data = await res.json();
                    setBatchData(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [batchId]);

    const shortlisted = (batchData?.results || [])
        .filter(r => r.status === 'completed' && r.candidate)
        .map(r => ({
            ...r.candidate,
            score: r.analysis?.score != null ? r.analysis.score : (r.candidate?.score || 0),
            analysis_data: r.analysis || r.candidate?.analysis_data || {}
        }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    const rejected = (batchData?.results || [])
        .filter(r => r.status === 'failed' || r.status === 'dead')
        .map(r => ({ filename: r.filename, error: r.error, status: r.status }));

    const getDisplayCandidates = () => {
        let candidates = shortlisted;
        if (searchQuery.trim()) {
            candidates = candidates.filter(c =>
                (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return candidates;
    };

    const deepLinkChat = (candidate) => {
        const state = { query: `Tell me about ${candidate.name} — their skills, experience, and score`, candidateName: candidate.name };
        sessionStorage.setItem('chat_deep_link', JSON.stringify(state));
        navigate('/resume-chat', { state });
    };

    return (
        <div className="min-h-screen bg-transparent pb-12 w-full">
            <div className="w-full space-y-6">
                {/* Header card dashboard */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:underline"
                        >
                            <ChevronLeft size={14} /> Back to Archive
                        </button>
                    </div>
                    
                    <div className="flex justify-between items-start flex-wrap gap-4 pt-1">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                                {batchMeta?.batch_name || batchMeta?.role || 'Assessment Run'}
                            </h1>
                            {batchMeta?.batch_name && batchMeta?.role && (
                                <p className="text-xs text-slate-400 mt-2 font-semibold">{batchMeta.role}</p>
                            )}
                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-bold">
                                <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(batchMeta?.created_at)}</span>
                                <span className="text-slate-200">•</span>
                                <span className="flex items-center gap-1"><Users size={12} /> {batchMeta?.total} applicant resumes</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            {batchMeta?.custom_prompt && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3.5 py-1.5 rounded-xl shadow-sm">
                                    <Gem size={12} className="text-violet-600 animate-spin-slow" /> Custom Guidelines Applied
                                </div>
                            )}
                            {shortlisted.length > 0 && (
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md"
                                >
                                    <Download size={14} /> Export Report
                                </button>
                            )}
                            <button
                                onClick={() => onDeleteBatch(batchId)}
                                className="flex items-center gap-2 px-5 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all shadow-sm"
                            >
                                <Trash2 size={14} /> Delete Run
                            </button>
                        </div>
                    </div>

                    {/* Metric widgets */}
                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-black text-emerald-700">{shortlisted.length}</div>
                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Shortlisted Fit</div>
                        </div>
                        <div className="bg-rose-50/50 border border-rose-150 rounded-2xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-black text-rose-600">{rejected.length}</div>
                            <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Failed/Rejected</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-center shadow-sm">
                            <div className="text-2xl font-black text-slate-700">
                                {shortlisted.length > 0 ? Math.round(shortlisted.reduce((s, c) => s + (c.score || 0), 0) / shortlisted.length) : 0}%
                            </div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Average Fit Match</div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                        <Loader2 size={24} className="animate-spin text-emerald-600" />
                        <span className="font-semibold text-sm">Parsing archived run details…</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Tab switcher & Sub Toolbar */}
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex items-center justify-between p-2">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setActiveSegment('shortlisted')}
                                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeSegment === 'shortlisted' ? 'bg-emerald-50 text-emerald-700 border-b-0' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    ✓ Shortlisted Candidates ({shortlisted.length})
                                </button>
                                <button
                                    onClick={() => setActiveSegment('rejected')}
                                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeSegment === 'rejected' ? 'bg-rose-50 text-rose-700' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    ✗ Failed Resumes ({rejected.length})
                                </button>
                            </div>

                            {activeSegment === 'shortlisted' && shortlisted.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <div className="relative hidden md:block">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search candidates…"
                                            className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/15 font-semibold bg-slate-50"
                                        />
                                    </div>
                                    <div className="flex border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                                        <button onClick={() => setViewMode('grid')}
                                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                            <LayoutGrid size={14} />
                                        </button>
                                        <button onClick={() => setViewMode('table')}
                                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                            <List size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Shortlisted views */}
                        {activeSegment === 'shortlisted' && (
                            <>
                                {shortlisted.length === 0 ? (
                                    <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-slate-350 text-center shadow-sm">
                                        <Users size={36} className="mb-3 opacity-20 text-emerald-600" />
                                        <p className="font-black text-slate-700">No candidates shortlisted in this run</p>
                                        <p className="text-xs text-slate-400 mt-1">Check the Failed Resumes tab for details.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* GRID VIEW */}
                                        {viewMode === 'grid' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                                                                {getDisplayCandidates().map((c, i) => {
                                                                                    const gems = [
                                                                                        ...(c.analysis_data?.custom_prompt_matches || []),
                                                                                        ...(c.analysis_data?.certification_match || [])
                                                                                    ];
                                                                                    const skills = c.analysis_data?.key_skills_match || [];
                                                                                    const missing = c.analysis_data?.missing_skills || [];
                                                                                    const score = c.score || 0;
                                                                                    const rankStyle = (i === 0) ? 'bg-amber-400 text-white ring-2 ring-amber-300 shadow-sm'
                                                                                                    : (i === 1) ? 'bg-slate-300 text-white'
                                                                                                    : (i === 2) ? 'bg-orange-400 text-white'
                                                                                                    : 'bg-slate-100 text-slate-500';
                                                                                    const hasCustomMatch = gems.length > 0;
                                                                                    const cardStyle = hasCustomMatch
                                                                                        ? "group bg-gradient-to-br from-white to-violet-50/20 rounded-2xl border border-violet-300 hover:border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.06)] hover:shadow-[0_0_18px_rgba(139,92,246,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
                                                                                        : "group bg-white rounded-2xl border border-slate-250 hover:border-emerald-500/30 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between";

                                                                                    return (
                                                                                        <div key={c.id} onClick={() => setAnalysisCandidate(c)}
                                                                                            className={cardStyle}>
                                                                                            <div className={`h-1.5 w-full ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                                                                                            <div className="p-5 flex-1 flex flex-col justify-between">
                                                                                                <div className="flex items-start justify-between gap-3 mb-4">
                                                                                                    <div className="flex items-center gap-3">
                                                                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${rankStyle}`}>
                                                                                                            #{i + 1}
                                                                                                        </div>
                                                                                                        <div className="min-w-0">
                                                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                                                <div className="font-extrabold text-slate-800 text-sm truncate group-hover:text-emerald-600 transition-colors">
                                                                                                                    {c.name || 'Unknown'}
                                                                                                                </div>
                                                                                                                {hasCustomMatch && (
                                                                                                                    <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded bg-violet-600 text-white shadow-sm shrink-0">
                                                                                                                        <Sparkles size={8} className="text-white" /> CUSTOM MATCH
                                                                                                                    </span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <div className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                                                                                                                {(c.email && !c.email.startsWith('no-email-')) ? c.email : '—'}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <ScoreRing score={score} size={48} />
                                                                                                </div>

                                                                                                <div className="flex flex-wrap gap-1.5 mb-3 text-[9px] font-extrabold">
                                                                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">✓ {skills.length} matched</span>
                                                                                                    {missing.length > 0 && <span className="px-2 py-0.5 bg-slate-50 text-slate-450 rounded-md">✗ {missing.length} gaps</span>}
                                                                                                </div>

                                                                                                {gems.length > 0 && (
                                                                                                    <div className="flex flex-wrap gap-1 mb-3">
                                                                                                        {gems.map((g, idx) => <GemBadge key={idx} label={g} />)}
                                                                                                    </div>
                                                                                                )}

                                                                                                {skills.length > 0 && (
                                                                                                    <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-slate-100">
                                                                                                        {skills.slice(0, 3).map((s, idx) => (
                                                                                                            <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-bold uppercase">
                                                                                                                {s}
                                                                                                            </span>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-1">
                                                                                                <button onClick={e => { e.stopPropagation(); deepLinkChat(c); }}
                                                                                                    className="text-[10px] font-bold text-slate-550 hover:text-emerald-600 flex items-center gap-1 transition-colors shrink-0">
                                                                                                    <MessageSquare size={12} className="text-emerald-500" /> Ask AI
                                                                                                </button>
                                                                                                <button onClick={e => {
                                                                                                    e.stopPropagation();
                                                                                                    if (c.resume_file) setResumeCandidate(c);
                                                                                                    else showToast('Resume file not available.', 'error');
                                                                                                }}
                                                                                                    className="text-[10px] font-bold text-slate-550 hover:text-blue-600 flex items-center gap-1 transition-colors shrink-0">
                                                                                                    <FileText size={12} className="text-blue-500" /> Resume
                                                                                                </button>
                                                                                                <button onClick={() => setAnalysisCandidate(c)} className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 hover:gap-1 transition-all shrink-0">
                                                                                                    View Analysis <ChevronRight size={12} />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                            </div>
                                        )}

                                        {/* TABLE VIEW */}
                                        {viewMode === 'table' && (
                                            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                                                <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider w-16">Rank</th>
                                                                <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider">Candidate</th>
                                                                <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider">Phone</th>
                                                                <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider">Email</th>
                                                                <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider w-24">Score</th>
                                                                <th className="px-5 py-4 text-left font-bold text-slate-400 tracking-wider uppercase">Matches</th>
                                                                <th className="px-5 py-4 text-center font-bold text-slate-400 uppercase tracking-wider w-36">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {getDisplayCandidates().map((c, idx) => {
                                                                const score = c.score || 0;
                                                                const scoreBg = score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-rose-50 text-rose-700 border-rose-150';
                                                                const gems = [
                                                                    ...(c.analysis_data?.custom_prompt_matches || []),
                                                                    ...(c.analysis_data?.certification_match || [])
                                                                ];
                                                                return (
                                                                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="px-5 py-4">
                                                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-black">
                                                                                #{idx + 1}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            <span className="font-extrabold text-slate-800 block text-sm">{c.name || '—'}</span>
                                                                            {c.role && <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">{c.role}</span>}
                                                                        </td>
                                                                        <td className="px-5 py-4 text-slate-500 font-mono font-bold">
                                                                            {cleanPhone(c.phone) || <span className="text-slate-300 italic font-sans font-normal">Not provided</span>}
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            {c.email && !c.email.startsWith('no-email-') ? (
                                                                                <a href={`mailto:${c.email}`} className="text-emerald-600 hover:underline font-bold">{c.email}</a>
                                                                            ) : '—'}
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black border ${scoreBg}`}>
                                                                                {Math.round(score)}%
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {gems.map((m, i) => (
                                                                                    <GemBadge key={i} label={m} />
                                                                                ))}
                                                                                {gems.length === 0 && <span className="text-slate-300 italic">No matches</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button
                                                                                    onClick={() => setAnalysisCandidate(c)}
                                                                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-lg text-xs font-bold text-slate-650 flex items-center gap-1 shadow-sm"
                                                                                >
                                                                                    <Eye size={12} /> Analysis
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (c.resume_file) setResumeCandidate(c);
                                                                                        else showToast('Resume file not available.', 'error');
                                                                                    }}
                                                                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                                                                                >
                                                                                    <Search size={12} /> Resume
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Rejected log views */}
                        {activeSegment === 'rejected' && (
                            <div className="p-1.5">
                                {rejected.length === 0 ? (
                                    <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-slate-350 text-center shadow-sm">
                                        <CheckCircle size={36} className="mb-3 opacity-20 text-emerald-500" />
                                        <p className="font-black text-slate-700">Perfect Processing Score</p>
                                        <p className="text-xs text-slate-400 mt-1">No failed, rejected, or unprocessable resumes in this run.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {rejected.map((r, idx) => (
                                            <div key={idx} className="bg-white border border-rose-100 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all duration-300">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <span className="font-extrabold text-slate-800 text-sm truncate">{r.filename}</span>
                                                        <span className="text-[9px] px-2 py-0.5 bg-rose-100 text-rose-600 border border-rose-200 rounded-full font-black uppercase shrink-0">{r.status}</span>
                                                    </div>
                                                    {r.error && (
                                                        <p className="text-xs text-rose-700 bg-rose-50/50 border border-rose-100/50 p-3 rounded-xl leading-relaxed font-semibold">
                                                            {r.error}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="pt-2 border-t border-slate-100 flex justify-end">
                                                    <button
                                                        onClick={() => setResumeCandidate({ name: r.filename, resume_file: r.filename })}
                                                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-205 text-slate-650 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                                    >
                                                        <FileText size={12} className="text-slate-400" /> View Resume
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Analysis Modal */}
            {analysisCandidate && (
                <AnalysisModal candidate={analysisCandidate} onClose={() => setAnalysisCandidate(null)} />
            )}

            {/* Resume Viewer Modal */}
            {resumeCandidate && (
                <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setResumeCandidate(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-zoom-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4.5 border-b border-slate-200 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shadow-inner shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-black text-slate-800 truncate">{resumeCandidate.name}'s Resume</h3>
                                    <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{resumeCandidate.resume_file}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={`${API_URL}/media/resumes/${resumeCandidate.resume_file}`} target="_blank" rel="noopener noreferrer" className="px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 shadow-sm">
                                    Open in New Tab
                                </a>
                                <button onClick={() => setResumeCandidate(null)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100">
                            <iframe src={`${API_URL}/media/resumes/${resumeCandidate.resume_file}`} className="w-full h-full border-0" title="Resume Viewer" />
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            <ExportConfigModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                candidates={shortlisted}
                onExport={(format, columns) => {
                    setShowExportModal(false);
                    if (format === 'pdf') exportToPDF(shortlisted, columns);
                    else if (format === 'excel') exportToExcel(shortlisted, columns);
                }}
            />

            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        </div>
    );
};

// ─── Main ScreenedCandidates Component (Batch List View) ─────────────────────
const ScreenedCandidates = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null); // { batch_id, ...meta }
    const [toast, setToast] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchBatches = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/resume/batches/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setBatches(data);
            } else {
                throw new Error(`Server returned ${res.status}`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBatches(); }, []);

    const handleDeleteBatch = (batchId) => {
        setConfirmDialog({ type: 'delete_batch', batchId });
    };

    const confirmDeleteBatch = async () => {
        const batchId = confirmDialog.batchId;
        setConfirmDialog(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/resume/batches/${batchId}/`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                showToast('Batch deleted successfully.');
                if (selectedBatch?.batch_id === batchId) setSelectedBatch(null);
                fetchBatches();
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `Server returned ${res.status}`);
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        }
    };

    // ── Drill-in view ────────────────────────────────────────────────────────
    if (selectedBatch) {
        return (
            <BatchDetailView
                batchId={selectedBatch.batch_id}
                batchMeta={selectedBatch}
                onBack={() => setSelectedBatch(null)}
                onDeleteBatch={(id) => {
                    setSelectedBatch(null);
                    handleDeleteBatch(id);
                }}
            />
        );
    }

    // ── Batch list view ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-transparent pb-12 w-full">
            <div className="w-full space-y-6">

                {/* Header card */}
                <div className="bg-white border border-slate-205 rounded-3xl shadow-sm p-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Screened Candidates</h1>
                                <p className="text-sm font-semibold text-slate-400 mt-2">
                                    AI-ranked candidate batches from resume screening. Select a run to inspect shortlisted applicant portfolios and fit logs.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-white text-emerald-650 px-4 py-2.5 rounded-2xl text-xs font-black border border-slate-200 flex items-center gap-2 shadow-sm">
                                <BookOpen size={14} className="text-emerald-550" />
                                <span className="text-slate-350 uppercase tracking-widest text-[9px] font-bold">Processed Runs</span>
                                <span className="text-lg font-black text-emerald-650 leading-none">{batches.length}</span>
                            </div>
                            <button
                                onClick={fetchBatches}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh History
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold"><strong>Error:</strong> {error}</span>
                        <button onClick={fetchBatches} className="text-xs font-bold underline hover:text-rose-800">Retry</button>
                    </div>
                )}

                {/* Batch Grid */}
                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-20 flex items-center justify-center gap-3 text-slate-400 shadow-sm">
                        <Loader2 size={24} className="animate-spin text-emerald-600" />
                        <span className="font-semibold text-sm">Loading archived batches…</span>
                    </div>
                ) : batches.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-20 flex flex-col items-center justify-center text-slate-350 text-center shadow-sm">
                        <BarChart2 size={40} className="mb-4 opacity-20 text-emerald-600" />
                        <p className="font-black text-slate-700">No Screened Batches Archived</p>
                        <p className="text-xs text-slate-400 mt-1">Run AI Resume Screening to create your first assessment batch.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {batches.map((batch) => {
                            const passRate = batch.total > 0 ? Math.round((batch.completed / batch.total) * 100) : 0;
                            const hasPending = (batch.pending || 0) > 0;
                            return (
                                <div
                                    key={batch.batch_id}
                                    onClick={() => setSelectedBatch(batch)}
                                    className="group bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                                >
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 pr-3">
                                                <h3 className="font-extrabold text-slate-800 text-sm leading-snug truncate">
                                                    {batch.batch_name || batch.role || 'Assessment Run'}
                                                </h3>
                                                {batch.batch_name && batch.role && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">{batch.role}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.batch_id); }}
                                                className="text-slate-300 hover:text-rose-500 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>

                                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 uppercase">
                                            <Calendar size={11} />
                                            {new Date(batch.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>

                                        {batch.custom_prompt && (
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg w-fit shadow-sm">
                                                <Gem size={8} className="text-violet-550 animate-spin-slow" /> Custom requirements applied
                                            </div>
                                        )}

                                        {/* Pass rate bar */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                <span>Fit Match Rate</span>
                                                <span className="text-emerald-600 font-extrabold">{passRate}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${passRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex gap-2.5 text-[10px] font-bold text-slate-400 uppercase">
                                            <span className="text-emerald-600">{batch.completed} OK</span>
                                            {batch.failed > 0 && <span className="text-rose-500">{batch.failed} ERR</span>}
                                            {hasPending && (
                                                <span className="text-amber-500 flex items-center gap-0.5 animate-pulse">
                                                    <Clock size={9} /> {batch.pending} run
                                                </span>
                                            )}
                                            <span>/ {batch.total} total</span>
                                        </div>
                                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-all">
                                            Open Run <ArrowRight size={12} />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Confirm Dialogs */}
            {confirmDialog?.type === 'delete_batch' && (
                <ConfirmModal
                    title="Delete Run Archive?"
                    message="This will delete this screening run's historical metrics and remove unpromoted candidates. This action is irreversible."
                    confirmLabel="Delete Run"
                    danger
                    onConfirm={confirmDeleteBatch}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        </div>
    );
};

export default ScreenedCandidates;
