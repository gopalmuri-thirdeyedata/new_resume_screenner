import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import {
    Upload, FileText, Brain, Loader2, CheckCircle, AlertCircle,
    X, Sparkles, ChevronDown, ArrowRight, FolderOpen, Cloud, HardDrive,
    Tag, Sliders, Calendar, Trash2, RefreshCw, Layers,
    Gem, Wand2, Clock, Play, ChevronRight, Plus, Minus,
    BarChart2, Star, TrendingUp, Zap, MessageSquare, Filter,
    LayoutGrid, List, Eye, Download, FileSpreadsheet, Lock, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../apiConfig';
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
    const borderGlow = score >= 75 ? 'shadow-[0_0_12px_rgba(16,185,129,0.2)]' : score >= 50 ? 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' : '';
    
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

// ─── Score Bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ label, value, max, color = '#5d8c2c' }) => (
    <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
            <span>{label}</span>
            <span className="font-bold text-slate-800">{value} / {max}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(value / max) * 100}%`, background: color }} />
        </div>
    </div>
);

// ─── Custom Req Badge ─────────────────────────────────────────────────────────
const GemBadge = ({ label }) => (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 shadow-sm animate-pulse-subtle">
        <Gem size={8} className="text-violet-600 animate-spin-slow" /> {label}
    </span>
);

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

const AVAILABLE_COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'score', label: 'Score' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Screened Date' },
    { key: 'experience', label: 'Total Experience' },
    { key: 'keyword_match_pct', label: 'Keyword Match %' },
    { key: 'key_skills_match', label: 'Matched Keywords' },
    { key: 'candidate_summary', label: 'Summary' },
    { key: 'certification_match', label: 'Certification Matches' },
    { key: 'custom_prompt_matches', label: 'Custom Req. Matches' },
    { key: 'missing_skills', label: 'Missing Skills / Gaps' },
    { key: 'reasoning', label: 'AI Evaluation Reasoning' },
    { key: 'stage', label: 'Candidate Stage' },
];

const exportToPDF = (candidates, selectedColumns) => {
    const compactKeys = ['name', 'phone', 'email', 'score', 'role', 'status', 'created_at', 'experience', 'keyword_match_pct', 'stage'];
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
                const a = c.analysis || {};
                if (col.key === 'name') return c.name || '—';
                if (col.key === 'phone') return cleanPhone(c.candidate?.phone || c.phone) || '—';
                if (col.key === 'email') return c.candidate?.email || c.email || '—';
                if (col.key === 'score') return c.score != null ? `${Math.round(c.score)}%` : '—';
                if (col.key === 'role') return c.role || c.candidate?.role || '—';
                if (col.key === 'status') return c.status || c.candidate?.status || '—';
                if (col.key === 'created_at') return formatDate(c.created_at || c.candidate?.created_at);
                if (col.key === 'experience') return a.experience || '—';
                if (col.key === 'keyword_match_pct') return a.keyword_match_pct != null ? `${Number(a.keyword_match_pct).toFixed(0)}%` : '—';
                if (col.key === 'stage') return c.stage || c.candidate?.stage || '—';
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
            const a = c.analysis || {};
            
            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.text(`Candidate Dossier: ${c.name || 'Unknown'}`, 14, 18);
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Rank: #${idx + 1}  |  Score: ${c.score != null ? Math.round(c.score) : 0}%  |  Role: ${c.role || c.candidate?.role || '—'}`, 14, 24);
            doc.text(`Email: ${c.email || c.candidate?.email || '—'}  |  Phone: ${cleanPhone(c.phone || c.candidate?.phone) || '—'}`, 14, 29);
            
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
        const a = c.analysis || {};
        selectedColumns.forEach(col => {
            if (col.key === 'name') row[col.label] = c.name || '—';
            else if (col.key === 'phone') row[col.label] = cleanPhone(c.candidate?.phone || c.phone) || '—';
            else if (col.key === 'email') row[col.label] = c.candidate?.email || c.email || '—';
            else if (col.key === 'score') row[col.label] = c.score != null ? `${c.score.toFixed(2)}%` : '—';
            else if (col.key === 'role') row[col.label] = c.role || c.candidate?.role || '—';
            else if (col.key === 'status') row[col.label] = c.status || c.candidate?.status || '—';
            else if (col.key === 'created_at') row[col.label] = formatDate(c.created_at || c.candidate?.created_at);
            else if (col.key === 'experience') row[col.label] = a.experience || '—';
            else if (col.key === 'keyword_match_pct') row[col.label] = a.keyword_match_pct != null ? `${Number(a.keyword_match_pct).toFixed(2)}%` : '—';
            else if (col.key === 'key_skills_match') row[col.label] = Array.isArray(a.key_skills_match) ? a.key_skills_match.join(', ') : '—';
            else if (col.key === 'candidate_summary') row[col.label] = stripMarkdown(a.candidate_summary || a.reasoning || '—');
            else if (col.key === 'certification_match') row[col.label] = Array.isArray(a.certification_match) ? a.certification_match.join(', ') : '—';
            else if (col.key === 'custom_prompt_matches') row[col.label] = Array.isArray(a.custom_prompt_matches) ? a.custom_prompt_matches.join(', ') : '—';
            else if (col.key === 'missing_skills') row[col.label] = Array.isArray(a.missing_skills) ? a.missing_skills.join(', ') : '—';
            else if (col.key === 'reasoning') row[col.label] = stripMarkdown(a.reasoning || '—');
            else if (col.key === 'stage') row[col.label] = c.stage || c.candidate?.stage || '—';
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

// ─── Pipeline Item Row ────────────────────────────────────────────────────────
const PipelineItem = ({ name, status, score, error }) => {
    let statusText = 'Pending';
    let dotColor = 'bg-slate-300';
    let icon = <Clock size={11} className="text-slate-400" />;

    if (status === 'processing') {
        statusText = 'AI Matching…';
        dotColor = 'bg-amber-500 animate-ping';
        icon = <Loader2 size={11} className="animate-spin text-amber-500" />;
    } else if (status === 'completed') {
        statusText = `Completed (${Math.round(score || 0)}%)`;
        dotColor = 'bg-emerald-500';
        icon = <CheckCircle size={11} className="text-emerald-500" />;
    } else if (status === 'failed' || status === 'dead') {
        statusText = 'Failed';
        dotColor = 'bg-rose-500';
        icon = <AlertCircle size={11} className="text-rose-500" />;
    }

    return (
        <div className="flex items-center justify-between p-2.5 bg-white/70 border border-slate-100 rounded-xl text-xs gap-3">
            <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                <span className="truncate font-semibold text-slate-700">{name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium shrink-0">
                {icon}
                <span className={status === 'failed' ? 'text-rose-500' : status === 'completed' ? 'text-emerald-600' : ''}>{statusText}</span>
            </div>
        </div>
    );
};

// ─── Processing Progress ──────────────────────────────────────────────────────
const ProcessingBanner = ({ completed, total, results }) => {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="relative bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 text-white overflow-hidden shadow-lg">
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }} />
            
            <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                    <div>
                        <p className="font-extrabold text-base tracking-tight">AI Assessment Workspace Running</p>
                        <p className="text-xs text-emerald-100 font-medium mt-0.5">{completed} of {total} resumes processed</p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-3xl font-black">{pct}%</div>
                    <div className="text-[10px] text-emerald-200 uppercase tracking-widest font-black">progress</div>
                </div>
            </div>
            
            <div className="relative mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-white rounded-full"
                    initial={{ width: '0%' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
            </div>

            {/* Pipeline list inside processing */}
            <div className="relative mt-5 pt-4 border-t border-white/10 space-y-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 mb-1">Queue Pipeline Ticker</p>
                {results.map((r, i) => (
                    <PipelineItem key={r.id} name={r.name} status={r.isPending ? (r.name === 'Scanning…' ? 'processing' : 'pending') : (r.status === 'Failed' ? 'failed' : 'completed')} score={r.score} error={r.reasoning} />
                ))}
            </div>
        </motion.div>
    );
};

// ─── Candidate Card ───────────────────────────────────────────────────────────
const CandidateCard = ({ candidate, rank, onClick, onChat }) => {
    const a = candidate.analysis || {};
    const gems = [
        ...(a.custom_prompt_matches || []),
        ...(a.certification_match || [])
    ];
    const skills = a.key_skills_match || [];
    const missing = a.missing_skills || [];
    const score = candidate.score || 0;

    const rankStyle = rank === 1
        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md ring-2 ring-amber-300'
        : rank === 2
            ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm ring-1 ring-slate-200'
            : rank === 3
                ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-sm ring-1 ring-orange-300'
                : 'bg-slate-100 text-slate-500';

    const hasCustomMatch = gems.length > 0;
    const cardStyle = hasCustomMatch
        ? "group bg-gradient-to-br from-white to-violet-50/20 rounded-2xl border border-violet-300 hover:border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.06)] hover:shadow-[0_0_18px_rgba(139,92,246,0.15)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
        : "group bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/40 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between";

    return (
        <motion.div layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className={cardStyle}
            onClick={onClick}>
            {/* Top score strip */}
            <div className={`h-1.5 w-full ${score >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : score >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} />

            <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        {/* Rank badge */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${rankStyle}`}>
                            #{rank}
                        </div>
                        {/* Info */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="font-extrabold text-slate-800 text-sm truncate group-hover:text-emerald-600 transition-colors">
                                    {candidate.name || 'Unknown'}
                                </div>
                                {hasCustomMatch && (
                                    <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded bg-violet-600 text-white shadow-sm shrink-0">
                                        <Sparkles size={8} className="text-white" /> CUSTOM MATCH
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 font-medium truncate mt-0.5">
                                {candidate.candidate?.email || '—'}
                            </div>
                        </div>
                    </div>
                    {/* Score ring */}
                    <ScoreRing score={score} size={50} />
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] font-bold">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                        ✓ {skills.length} skills matched
                    </span>
                    {missing.length > 0 && (
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md">
                            ✗ {missing.length} gaps
                        </span>
                    )}
                    {a.experience && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">
                            {a.experience}
                        </span>
                    )}
                </div>

                {/* Gem badges */}
                {gems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {gems.map((g, i) => <GemBadge key={i} label={g} />)}
                    </div>
                )}

                {/* Skills preview */}
                {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-slate-100">
                        {skills.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-slate-600 uppercase">
                                {s}
                            </span>
                        ))}
                        {skills.length > 3 && (
                            <span className="text-[9px] text-slate-400 font-bold self-center">+{skills.length - 3}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                    onClick={e => { e.stopPropagation(); onChat(); }}
                    className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                    <MessageSquare size={12} className="text-emerald-500" /> Ask Resume AI
                </button>
                <button onClick={onClick} className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 hover:gap-1.5 transition-all">
                    View Profile <ChevronRight size={12} />
                </button>
            </div>
        </motion.div>
    );
};

// ─── Dossier Drawer ────────────────────────────────────────────────────────────
const DossierDrawer = ({ open, onClose, candidate, rank, onChat, onPromote, promoting, promoted }) => {
    if (!candidate) return null;
    const a = candidate.analysis || {};
    const cs = a.component_scores || {};
    const gems = a.custom_prompt_matches || [];
    const skills = a.key_skills_match || [];
    const missing = a.missing_skills || [];
    const certs = a.certification_match || [];

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50" onClick={onClose} />
                    <motion.aside
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                        className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white z-50 shadow-2xl flex flex-col border-l border-slate-100">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate Dossier · Rank #{rank}</div>
                                <h2 className="text-lg font-black text-slate-900 mt-1">{candidate.name}</h2>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-400 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth no-scrollbar">
                            {/* Score overview */}
                            <div className="flex items-center gap-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                                <ScoreRing score={candidate.score || 0} size={76} />
                                <div className="flex-1 space-y-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Overall Match Fit</div>
                                    <div className="text-sm font-black text-slate-800">
                                        {(a.extracted_role && a.extracted_role.trim() !== '' && a.extracted_role.toLowerCase() !== 'n/a' && a.extracted_role.toLowerCase() !== 'none')
                                            ? a.extracted_role
                                            : (candidate.candidate?.role || 'N/A')}
                                    </div>
                                    <div className="text-xs text-slate-500 font-semibold">
                                        Total Experience: <span className="font-bold text-slate-700">{a.experience || 'N/A'}</span>
                                    </div>
                                    {a.candidate_summary && (
                                        <p className="text-xs text-slate-500 italic leading-relaxed mt-1.5">{a.candidate_summary}</p>
                                    )}
                                </div>
                            </div>

                            {/* Gem badges */}
                            {gems.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-violet-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Gem size={11} className="text-violet-500" /> Custom Criteria Matches
                                    </div>
                                    <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3.5 flex flex-wrap gap-2">
                                        {gems.map((g, i) => (
                                            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white text-violet-700 border border-violet-200 rounded-xl shadow-sm">
                                                <Gem size={11} className="text-violet-500 animate-spin-slow" /> {g}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Score breakdown */}
                            <div className="space-y-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <BarChart2 size={11} className="text-emerald-500" /> Scoring Metrics Breakdown
                                </div>
                                <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3.5 shadow-sm">
                                    <ScoreBar label="Skills Match" value={cs.skills || 0} max={40} color="#10b981" />
                                    <ScoreBar label="Experience Depth" value={cs.experience || 0} max={25} color="#16a34a" />
                                    <ScoreBar label="Projects Complexity" value={cs.projects || 0} max={20} color="#0d9488" />
                                    <ScoreBar label="Education/Certs" value={cs.education || 0} max={10} color="#0891b2" />
                                    <ScoreBar label="Preferred / Bonus Skills" value={cs.bonus || 0} max={5} color="#7c3aed" />
                                </div>
                            </div>

                            {/* AI Reasoning */}
                            {candidate.reasoning && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles size={11} className="text-emerald-500" /> AI Interview Fit Summary
                                    </div>
                                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 text-xs text-slate-700 leading-relaxed font-medium">
                                        {candidate.reasoning}
                                    </div>
                                </div>
                            )}

                            {/* Strengths / Gaps */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">✓ Core Strengths</div>
                                    <div className="flex flex-wrap gap-1.5 bg-slate-50 rounded-xl p-3 border border-slate-100 min-h-[70px]">
                                        {skills.map((s, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 bg-white text-emerald-700 border border-emerald-100 rounded-md font-bold uppercase">{s}</span>
                                        ))}
                                        {!skills.length && <span className="text-[10px] text-slate-300 italic">No skills listed</span>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-rose-700 uppercase tracking-wide">✗ Identified Gaps</div>
                                    <div className="flex flex-wrap gap-1.5 bg-slate-50 rounded-xl p-3 border border-slate-100 min-h-[70px]">
                                        {missing.map((s, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 bg-white text-rose-600 border border-rose-100 rounded-md font-bold uppercase">{s}</span>
                                        ))}
                                        {!missing.length && <span className="text-[10px] text-slate-300 italic">No missing skills</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Certs */}
                            {certs.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Certifications Found</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {certs.map((c, i) => (
                                            <span key={i} className="text-[11px] px-2.5 py-1 bg-blue-50/50 text-blue-700 border border-blue-100 rounded-lg font-semibold flex items-center gap-1">
                                                <CheckCircle size={10} className="text-blue-500" /> {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex gap-3">
                            <button onClick={onChat}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all">
                                <Brain size={14} className="text-emerald-500 animate-pulse" /> Chat with Resume
                            </button>
                            <button onClick={onPromote} disabled={promoting || promoted}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white rounded-xl transition-all ${promoted ? 'bg-emerald-600' : promoting ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'}`}>
                                {promoting ? <Loader2 size={13} className="animate-spin" /> : promoted ? '✓ Candidate Promoted' : 'Promote to Next Stage'}
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

// ─── Local Upload Modal ─────────────────────────────────────────────────────
const LocalUploadModal = ({ isOpen, onClose, onUpload }) => {
    const [tempFiles, setTempFiles] = useState([]);
    const browseRef = useRef(null);

    const addFiles = useCallback((incoming) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const filtered = incoming.filter(f => {
            const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
            return allowed.includes(ext);
        });
        setTempFiles(prev => {
            const existing = new Set(prev.map(f => f.name));
            return [...prev, ...filtered.filter(f => !existing.has(f.name))];
        });
    }, []);

    const getFilesFromEvent = async (event) => {
        const files = [];
        const isDrop = event.type === 'drop';
        const items = isDrop ? event.dataTransfer.items : event.target.files;
        if (isDrop && items) {
            const scan = async (entry) => {
                if (entry.isFile) {
                    const file = await new Promise(r => entry.file(r));
                    files.push(file);
                } else if (entry.isDirectory) {
                    const reader = entry.createReader();
                    const readEntries = () => new Promise(r => reader.readEntries(r));
                    let entries = await readEntries();
                    while (entries.length > 0) {
                        for (const c of entries) await scan(c);
                        entries = await readEntries();
                    }
                }
            };
            for (const item of items) {
                const entry = item.webkitGetAsEntry?.();
                if (entry) await scan(entry);
                else { const file = item.getAsFile?.(); if (file) files.push(file); }
            }
        } else if (items) {
            for (let i = 0; i < items.length; i++) files.push(items[i]);
        }
        return files;
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: addFiles, getFilesFromEvent, noClick: true });

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <FolderOpen size={16} className="text-emerald-500" /> Upload from Local Directory
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-400"><X size={16} /></button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    <input ref={browseRef} type="file" multiple accept=".pdf,.doc,.docx"
                        onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} className="hidden" />
                    <div {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center text-center transition-all ${isDragActive ? 'border-emerald-500 bg-green-50/30' : 'border-slate-200 hover:border-emerald-500/40'}`}>
                        <input {...getInputProps()} />
                        <FolderOpen size={28} className="text-emerald-500 mb-2" />
                        <p className="text-sm font-bold text-slate-700">{isDragActive ? 'Drop here…' : 'Drag & drop folder'}</p>
                        <p className="text-xs text-slate-400 mt-0.5 mb-3">Supports PDF and DOCX files</p>
                        <button onClick={() => browseRef.current?.click()}
                            className="text-xs font-bold text-emerald-600 border border-emerald-500/20 px-4 py-1.5 rounded-lg hover:bg-green-50">
                            Browse Files
                        </button>
                    </div>
                    {tempFiles.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                <span>{tempFiles.length} files selected</span>
                                <button onClick={() => setTempFiles([])} className="text-rose-500">Clear all</button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {tempFiles.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs border border-slate-100">
                                        <span className="truncate max-w-[280px] font-semibold text-slate-700">{f.name}</span>
                                        <button onClick={() => setTempFiles(p => p.filter((_, j) => j !== i))}
                                            className="text-slate-300 hover:text-rose-500 ml-2"><X size={11} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-3 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={() => { onUpload(tempFiles); setTempFiles([]); onClose(); }}
                        disabled={!tempFiles.length}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-40 transition-all">
                        Add to Queue
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const ResumeScreening = () => {
    const navigate = useNavigate();

    // ── Persisted state ─────────────────────────────────────────────────────
    const [jd, setJd] = useState(() => sessionStorage.getItem('rs_jd') || '');
    const [batchLabel, setBatchLabel] = useState(() => sessionStorage.getItem('rs_batchLabel') || '');
    const [keywords, setKeywords] = useState(() => { try { return JSON.parse(sessionStorage.getItem('rs_kw')) || []; } catch { return []; } });
    const [customPrompt, setCustomPrompt] = useState(() => sessionStorage.getItem('rs_cp') || '');
    const [shortlist, setShortlist] = useState(() => Number(sessionStorage.getItem('rs_n')) || 5);
    const [results, setResults] = useState(() => { try { return JSON.parse(sessionStorage.getItem('rs_results')) || []; } catch { return []; } });

    // ── UI state ─────────────────────────────────────────────────────────────
    const [files, setFiles] = useState([]);
    const [kwInput, setKwInput] = useState('');
    const [tab, setTab] = useState('workspace');
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [activeBatch, setActiveBatch] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerCandidate, setDrawerCandidate] = useState(null);
    const [screening, setScreening] = useState(false);
    const [batchCompleted, setBatchCompleted] = useState(0);
    const [batchTotal, setBatchTotal] = useState(0);
    const [promoting, setPromoting] = useState(false);
    const [promoted, setPromoted] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [showLocalModal, setShowLocalModal] = useState(false);
    const [showFolderMenu, setShowFolderMenu] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [showExportModal, setShowExportModal] = useState(false);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    const jdFileRef = useRef(null);
    const pollRef = useRef(null);

    const PRESETS = ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Docker', 'AWS', 'FastAPI', 'Machine Learning'];

    // ── Session sync ─────────────────────────────────────────────────────────
    useEffect(() => { sessionStorage.setItem('rs_jd', jd); }, [jd]);
    useEffect(() => { sessionStorage.setItem('rs_batchLabel', batchLabel); }, [batchLabel]);
    useEffect(() => { sessionStorage.setItem('rs_kw', JSON.stringify(keywords)); }, [keywords]);
    useEffect(() => { sessionStorage.setItem('rs_cp', customPrompt); }, [customPrompt]);
    useEffect(() => { sessionStorage.setItem('rs_n', String(shortlist)); }, [shortlist]);
    useEffect(() => { if (results.length) sessionStorage.setItem('rs_results', JSON.stringify(results)); else sessionStorage.removeItem('rs_results'); }, [results]);
    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    // ── Fetch batches ─────────────────────────────────────────────────────────
    const fetchBatches = async () => {
        setLoadingBatches(true);
        try {
            const token = localStorage.getItem('token');
            const r = await fetch(`${API_URL}/api/resume/batches/`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (r.ok) setBatches(await r.json());
        } catch (e) { console.error(e); }
        setLoadingBatches(false);
    };

    useEffect(() => { if (tab === 'history') fetchBatches(); }, [tab]);

    // ── Load past batch ────────────────────────────────────────────────────────
    const loadBatch = async (batchId) => {
        try {
            const token = localStorage.getItem('token');
            const r = await fetch(`${API_URL}/api/resume/screen/batch/${batchId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!r.ok) return;
            const data = await r.json();
            const mapped = (data.results || [])
                .filter(x => x.status === 'completed' && x.candidate)
                .map((x, i) => ({
                    id: `b-${batchId}-${i}`,
                    name: x.candidate?.name || x.filename,
                    score: x.candidate?.score || x.analysis?.score || 0,
                    status: 'Screened',
                    analysis: x.analysis || {},
                    reasoning: x.analysis?.reasoning || '',
                    candidate: x.candidate,
                }));
            const failed = (data.results || [])
                .filter(x => x.status === 'failed' || x.status === 'dead')
                .map((x, i) => ({
                    id: `bf-${batchId}-${i}`,
                    name: x.filename,
                    score: 0,
                    status: 'Failed',
                    analysis: {},
                    reasoning: x.error || 'Processing failed',
                    candidate: null,
                    error: x.error,
                }));
            setResults([...mapped.sort((a, b) => b.score - a.score), ...failed]);
            setActiveBatch(batchId);
            setTab('workspace');
        } catch (e) { console.error(e); }
    };

    const deleteBatch = async (batchId, e) => {
        e.stopPropagation();
        if (!confirm('Delete this batch permanently?')) return;
        const token = localStorage.getItem('token');
        const r = await fetch(`${API_URL}/api/resume/batches/${batchId}/`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (r.ok) { if (activeBatch === batchId) resetAll(); fetchBatches(); }
    };

    // ── Map poll results ──────────────────────────────────────────────────────
    const mapResults = (data, includesPending = true) => {
        const done = (data.results || []).filter(x => x.status === 'completed' && x.candidate)
            .map((x, i) => ({ id: `r-${x.job_id || i}`, name: x.candidate?.name || x.filename, score: x.analysis?.score != null ? x.analysis.score : (x.candidate?.score || 0), status: 'Screened', analysis: x.analysis || {}, reasoning: x.analysis?.reasoning || '', candidate: x.candidate, isPending: false }));
        const failed = (data.results || []).filter(x => x.status === 'failed' || x.status === 'dead')
            .map((x, i) => ({ id: `f-${x.job_id || i}`, name: x.filename, score: 0, status: 'Failed', analysis: {}, reasoning: x.error || '', candidate: null, isPending: false }));
        const pending = includesPending ? (data.results || []).filter(x => x.status === 'pending' || x.status === 'processing')
            .map((x, i) => ({ id: `p-${x.job_id || i}`, name: x.filename || 'Scanning…', score: 0, status: 'Pending', analysis: {}, reasoning: '', candidate: null, isPending: true })) : [];
        return [...done.sort((a, b) => b.score - a.score), ...failed, ...pending];
    };

    // ── Resilient Polling Setup ───────────────────────────────────────────────
    const resumeScreeningPoll = useCallback((batchId) => {
        if (pollRef.current) clearInterval(pollRef.current);
        setScreening(true);
        setActiveBatch(batchId);

        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const poll = async () => {
            try {
                const pr = await fetch(`${API_URL}/api/resume/screen/batch/${batchId}`, { headers });
                if (!pr.ok) {
                    clearInterval(pollRef.current);
                    setScreening(false);
                    localStorage.removeItem('active_screening_batch_id');
                    return;
                }
                const pd = await pr.json();
                setBatchCompleted(pd.completed || 0);
                setBatchTotal(pd.total || 0);
                setResults(mapResults(pd, true));

                if (pd.status === 'completed') {
                    clearInterval(pollRef.current);
                    setResults(mapResults(pd, false));
                    setScreening(false);
                    localStorage.removeItem('active_screening_batch_id');
                }
            } catch (e) {
                console.error(e);
            }
        };

        poll();
        pollRef.current = setInterval(poll, 2500);
    }, []);

    // Load active screening from local storage on mount
    useEffect(() => {
        const activeBatchId = localStorage.getItem('active_screening_batch_id');
        if (activeBatchId) {
            resumeScreeningPoll(activeBatchId);
        }
    }, [resumeScreeningPoll]);

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetAll = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        setJd(''); setBatchLabel(''); setFiles([]); setKeywords([]); setCustomPrompt('');
        setResults([]); setActiveBatch(null); setScreening(false); setBatchCompleted(0); setBatchTotal(0);
        setPromoted(false); setShowReset(false);
        localStorage.removeItem('active_screening_batch_id');
        ['rs_jd', 'rs_batchLabel', 'rs_kw', 'rs_cp', 'rs_n', 'rs_results'].forEach(k => sessionStorage.removeItem(k));
    };

    // ── Keyword helpers ────────────────────────────────────────────────────────
    const addKw = () => { const c = kwInput.trim().toLowerCase(); if (c && !keywords.includes(c)) setKeywords(p => [...p, c]); setKwInput(''); };
    const removeKw = (k) => setKeywords(p => p.filter(x => x !== k));
    const togglePreset = (s) => { const l = s.toLowerCase(); if (keywords.includes(l)) removeKw(l); else setKeywords(p => [...p, l]); };

    // ── Drop zone ─────────────────────────────────────────────────────────────
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: f => setFiles(p => [...p, ...f]),
        accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
    });

    // ── JD file import ────────────────────────────────────────────────────────
    const handleJDFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = ev => setJd(ev.target.result);
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    // ── Start screening ────────────────────────────────────────────────────────
    const startScreening = async () => {
        if (!isValid || screening) return;
        if (pollRef.current) clearInterval(pollRef.current);
        setScreening(true); setResults([]); setBatchCompleted(0); setBatchTotal(files.length); setPromoted(false); setActiveBatch(null);

        const form = new FormData();
        form.append('job_description', jd);
        form.append('top_n', shortlist);
        if (batchLabel.trim()) form.append('batch_name', batchLabel.trim());
        if (keywords.length) form.append('keywords', keywords.join(', '));
        if (customPrompt.trim()) form.append('custom_prompt', customPrompt.trim());
        files.forEach(f => form.append('files', f));

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/resume/screen/`, {
                method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`); }
            const { batch_id } = await res.json();
            localStorage.setItem('active_screening_batch_id', batch_id);
            resumeScreeningPoll(batch_id);
        } catch (e) {
            console.error(e);
            setScreening(false);
        }
    };

    // ── Promote ────────────────────────────────────────────────────────────────
    const promoteAll = async () => {
        setShowPremiumModal(true);
    };

    const promoteSingle = async (candidateId) => {
        setShowPremiumModal(true);
    };

    const deepLinkChat = (candidate) => {
        // Stash search state so sidebar in Chat resolves correctly
        const state = { query: `Tell me about ${candidate.name} — their skills, experience, and score`, candidateName: candidate.name };
        sessionStorage.setItem('chat_deep_link', JSON.stringify(state));
        navigate('/resume-chat', { state });
    };

    // ── Computed ──────────────────────────────────────────────────────────────
    const screened = results.filter(r => r.status === 'Screened');
    const failed = results.filter(r => r.status === 'Failed');
    const pending = results.filter(r => r.isPending);
    const topScore = screened.length ? Math.max(...screened.map(r => r.score)) : 0;
    const avgScore = screened.length ? Math.round(screened.reduce((s, r) => s + r.score, 0) / screened.length) : 0;
    const isValid = files.length > 0 && jd.trim() && shortlist > 0 && shortlist <= (files.length || 999);

    const filteredScreened = screened.filter(c =>
        (c.name || '').toLowerCase().includes(candidateSearch.toLowerCase()) ||
        (c.candidate?.email || '').toLowerCase().includes(candidateSearch.toLowerCase())
    );

    return (
        <div className="w-full min-h-screen pb-12">

            {/* ── Page Header ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">AI Resume Screening</h1>
                        <p className="text-sm font-semibold text-slate-400 mt-2">Filter requirements, batch process resumes, and let Gemini evaluate applicant quality.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {screened.length > 0 && (
                        <button onClick={promoteAll} disabled={promoting || promoted}
                            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-md ${promoted ? 'bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                            {promoting ? <Loader2 size={13} className="animate-spin inline mr-1" /> : promoted ? '✓ Shortlist Promoted' : 'Promote Shortlist'}
                        </button>
                    )}
                    <button onClick={() => setShowReset(true)}
                        className="px-5 py-2.5 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-all">
                        Reset Workspace
                    </button>
                </div>
            </div>

            {/* ── Main Layout Split ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start w-full">

                {/* LEFT WORKSPACE SETUP PANEL */}
                <div className="xl:col-span-4 flex flex-col gap-6 w-full">

                    {/* Step 1: Criteria */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:border-slate-300">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-inner">
                                    <FileText size={14} />
                                </div>
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">1 · Job Requirements</span>
                            </div>
                            <button onClick={() => jdFileRef.current?.click()}
                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/50 hover:bg-emerald-100/60 px-2.5 py-1.5 rounded-lg transition-all shadow-sm">
                                Import Text File
                            </button>
                            <input ref={jdFileRef} type="file" accept=".txt" onChange={handleJDFile} className="hidden" />
                        </div>
                        <div className="p-5 space-y-3">
                            <textarea value={jd} onChange={e => setJd(e.target.value)}
                                placeholder="Paste Job Description, roles, or requirements here…"
                                rows={6}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder:text-slate-300 resize-none transition-all leading-relaxed" />
                        </div>
                    </div>

                    {/* Step 2: Custom AI Prompt */}
                    <div className="bg-white rounded-3xl border border-violet-200 shadow-sm overflow-hidden transition-all duration-300 hover:border-violet-300">
                        <div className="px-5 py-4 border-b border-violet-100 flex items-center justify-between bg-violet-50/30">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center shadow-inner">
                                    <Wand2 size={14} />
                                </div>
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">2 · Custom Guidelines</span>
                            </div>
                            {customPrompt.trim() && (
                                <span className="text-[9px] font-black text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse-subtle">Active</span>
                            )}
                        </div>
                        <div className="p-5 space-y-3.5">
                            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                                Highlight unique needs (e.g. AWS Certification, Bilingual, Leadership). Matched requirements generate premium <span className="text-violet-600 font-bold">gem badges</span> in leaderboard.
                            </p>
                            <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                                placeholder={"e.g. Must have led a team of 5+ engineers\nMust have AWS Cloud Practitioner certification\nMust have worked in early-stage startups"}
                                rows={4}
                                className="w-full px-4 py-3 bg-violet-50/20 border border-violet-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-300/30 resize-none placeholder:text-slate-350 font-semibold transition-all leading-relaxed text-violet-950" />
                        </div>
                    </div>

                    {/* Step 3: Match Parameters */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:border-slate-300">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-inner">
                                    <Sliders size={14} />
                                </div>
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">3 · Matching Parameters</span>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Shortlist count */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shortlist Target Capacity</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setShortlist(s => Math.max(1, s - 1))}
                                            className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                            <Minus size={11} />
                                        </button>
                                        <span className="text-xs font-black text-emerald-600 w-8 text-center">{shortlist}</span>
                                        <button onClick={() => setShortlist(s => Math.min(files.length || 99, s + 1))}
                                            className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                            <Plus size={11} />
                                        </button>
                                    </div>
                                </div>
                                <input type="range" min={1} max={files.length || 20} value={shortlist}
                                    onChange={e => setShortlist(+e.target.value)}
                                    className="w-full accent-emerald-600 cursor-pointer" />
                            </div>

                            {/* Keywords */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Required Keywords (Gate)</label>
                                <div className="flex gap-2">
                                    <input value={kwInput} onChange={e => setKwInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKw(); } }}
                                        placeholder="Type key skill & Enter"
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 font-semibold placeholder:text-slate-300 transition-all" />
                                    <button onClick={addKw}
                                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm">
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {PRESETS.map(s => {
                                        const active = keywords.includes(s.toLowerCase());
                                        return (
                                            <button key={s} onClick={() => togglePreset(s)}
                                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition-all ${active ? 'bg-emerald-600 text-white border-transparent shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-500/20'}`}>
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                                {keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                                        {keywords.map(k => (
                                            <span key={k} className="inline-flex items-center gap-1.5 text-[9px] px-2.5 py-0.5 bg-green-50 text-emerald-700 border border-green-150 rounded-md font-bold uppercase shadow-sm">
                                                {k}
                                                <button onClick={() => removeKw(k)} className="hover:text-rose-500"><X size={10} /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 4: Resume Source */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:border-slate-300">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shadow-inner">
                                    <Upload size={14} />
                                </div>
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">4 · Resume Sources</span>
                            </div>
                            <div className="relative">
                                <button onClick={() => setShowFolderMenu(v => !v)}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-250/20 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100/50 transition-all shadow-sm">
                                    <FolderOpen size={11} /> Load Folder <ChevronDown size={9} />
                                </button>
                                {showFolderMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowFolderMenu(false)} />
                                        <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                                            <button onClick={() => { setShowFolderMenu(false); setShowLocalModal(true); }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100">
                                                <HardDrive size={13} className="text-emerald-600" /> Local Directory
                                            </button>
                                            <button className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-slate-300 cursor-not-allowed">
                                                <Cloud size={13} className="text-blue-400" /> OneDrive (soon)
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div {...getRootProps()}
                                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all ${isDragActive ? 'border-emerald-500 bg-green-50/20 scale-[1.01]' : 'border-slate-200 hover:border-emerald-500/30 hover:bg-slate-50/50'}`}>
                                <input {...getInputProps()} />
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2 text-emerald-600 shadow-inner">
                                    <Upload size={18} />
                                </div>
                                <p className="text-xs font-bold text-slate-700">Drop PDF / DOCX resumes</p>
                                <p className="text-[10px] text-slate-400 mt-1">or click to browse local files</p>
                            </div>

                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span>File Queue ({files.length})</span>
                                        <button onClick={() => setFiles([])} className="text-rose-500 hover:underline">Clear Queue</button>
                                    </div>
                                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 scroll-smooth">
                                        {files.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i < batchCompleted ? 'bg-emerald-500' : screening ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
                                                <span className="truncate font-semibold text-slate-600 flex-1">{f.name}</span>
                                                {!screening && (
                                                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                                                        className="text-slate-300 hover:text-rose-500"><X size={11} /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* RIGHT ACTIVE WORKSPACE & BATCH ARCHIVE PANEL */}
                <div className="xl:col-span-8 flex flex-col gap-6 w-full">

                    {/* Tab Navigation & Toolbar */}
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-between p-2 gap-4">
                        <div className="flex gap-1.5">
                            {[
                                { id: 'workspace', label: 'Screening Leaderboard', icon: TrendingUp },
                                { id: 'history', label: 'Run Archive', icon: Calendar },
                            ].map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${tab === t.id ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>
                                    <t.icon size={13} className={tab === t.id ? 'text-emerald-500' : ''} /> {t.label}
                                    {t.id === 'history' && batches.length > 0 && (
                                        <span className="bg-slate-100 text-slate-500 rounded-full text-[9px] font-black px-1.5 py-0.5 ml-1">{batches.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {tab === 'workspace' && (
                            <div className="flex items-center gap-3">
                                {/* Search box */}
                                {results.length > 0 && (
                                    <div className="relative hidden md:block">
                                        <input type="text" placeholder="Filter candidates…" value={candidateSearch}
                                            onChange={e => setCandidateSearch(e.target.value)}
                                            className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/10 font-semibold" />
                                    </div>
                                )}
                                {/* View Mode Toggle */}
                                {screened.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setShowExportModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold shadow-sm transition-all">
                                            <Download size={13} /> Export
                                        </button>
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
                                {/* Start screening button */}
                                <button onClick={startScreening} disabled={!isValid || screening}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md ${!isValid || screening ? 'bg-slate-100 text-slate-350 cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5'}`}>
                                    {screening
                                        ? <><Loader2 size={13} className="animate-spin" /> Analyzing Resumes…</>
                                        : <><Play size={11} fill="currentColor" /> Start Screening</>}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ─── Leaderboard Workspace Tab ─── */}
                    {tab === 'workspace' && (
                        <div className="space-y-6">
                            {/* Progress Pipeline Dashboard */}
                            <AnimatePresence>
                                {screening && (
                                    <ProcessingBanner completed={batchCompleted} total={batchTotal} results={results} />
                                )}
                            </AnimatePresence>

                            {/* Summary KPI Panel (only when results exist) */}
                            {results.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Uploaded', value: results.filter(r => !r.isPending).length, color: 'text-slate-800', bg: 'bg-white', border: 'border-slate-200' },
                                        { label: 'Passed Screening', value: screened.length, color: 'text-emerald-700', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
                                        { label: 'Top AI Fit Score', value: `${topScore}%`, color: 'text-emerald-600', bg: 'bg-green-50/20', border: 'border-green-100' },
                                        { label: 'Average Match Fit', value: `${avgScore}%`, color: 'text-amber-700', bg: 'bg-amber-50/30', border: 'border-amber-100' },
                                    ].map(s => (
                                        <div key={s.label} className={`${s.bg} border ${s.border} rounded-3xl p-5 flex flex-col shadow-sm`}>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{s.label}</span>
                                            <span className={`text-2xl font-black leading-none ${s.color}`}>{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty state instructions */}
                            {results.length === 0 && !screening && (
                                <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center text-center shadow-sm">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-inner text-slate-300">
                                        <Brain size={30} />
                                    </div>
                                    <h3 className="text-base font-black text-slate-700">Ready to Screen Applicants</h3>
                                    <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed font-semibold">
                                        Configure job requirements, optional parameters, custom prompts, and drag applicant resumes on the left.
                                    </p>
                                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-lg">
                                        {[
                                            { label: 'Job Description', done: jd.trim().length > 0 },
                                            { label: 'Keywords Gate', done: keywords.length > 0 },
                                            { label: 'Custom Guidelines', done: customPrompt.trim().length > 0 },
                                            { label: 'Resumes Loaded', done: files.length > 0 },
                                        ].map((s, i) => (
                                            <div key={i} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all shadow-sm ${s.done ? 'bg-green-50/40 border-green-150' : 'bg-slate-50/30 border-slate-100'}`}>
                                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${s.done ? 'bg-green-100 text-emerald-600 shadow-inner' : 'bg-slate-150 text-slate-400'}`}>
                                                    {s.done ? '✓' : i + 1}
                                                </div>
                                                <span className="text-[10px] font-extrabold text-slate-500 text-center leading-tight uppercase">{s.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* GRID VIEW RESULTS */}
                            {screened.length > 0 && viewMode === 'grid' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Star size={12} className="text-amber-400 fill-amber-400 animate-spin-slow" /> Ranked Candidates List ({filteredScreened.length})
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                                        <AnimatePresence>
                                            {filteredScreened.map((c, i) => (
                                                <CandidateCard key={c.id} candidate={c} rank={i + 1}
                                                    onClick={() => { setDrawerCandidate(c); setDrawerOpen(true); }}
                                                    onChat={() => deepLinkChat(c)} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                    {filteredScreened.length === 0 && (
                                        <p className="text-xs font-semibold text-slate-400 text-center py-6">No matching candidates found.</p>
                                    )}
                                </div>
                            )}

                            {/* TABLE VIEW RESULTS */}
                            {screened.length > 0 && viewMode === 'table' && (
                                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                                    <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider w-16">Rank</th>
                                                    <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider">Candidate Details</th>
                                                    <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider">Experience</th>
                                                    <th className="px-5 py-4 text-left font-bold text-slate-400 uppercase tracking-wider w-24">Match Score</th>
                                                    <th className="px-5 py-4 text-left font-bold text-slate-400 tracking-wider uppercase">Matches / Custom Badges</th>
                                                    <th className="px-5 py-4 text-center font-bold text-slate-400 uppercase tracking-wider w-36">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredScreened.map((c, i) => {
                                                    const score = c.score || 0;
                                                    const scoreBg = score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-rose-50 text-rose-700 border-rose-150';
                                                    const gems = c.analysis?.custom_prompt_matches || [];
                                                    return (
                                                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-5 py-4">
                                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-black">
                                                                    #{i + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <span className="font-extrabold text-slate-800 block text-sm">{c.name}</span>
                                                                <span className="text-slate-400 font-semibold">{c.candidate?.email || '—'}</span>
                                                            </td>
                                                            <td className="px-5 py-4 text-slate-600 font-bold uppercase">
                                                                {c.analysis?.experience || 'None'}
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black border ${scoreBg}`}>
                                                                    {Math.round(score)}%
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {gems.map((g, idx) => (
                                                                        <GemBadge key={idx} label={g} />
                                                                    ))}
                                                                    {gems.length === 0 && <span className="text-slate-300 italic">No matches</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button onClick={() => { setDrawerCandidate(c); setDrawerOpen(true); }}
                                                                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold flex items-center gap-1 shadow-sm">
                                                                        <Eye size={11} /> Dossier
                                                                    </button>
                                                                    <button onClick={() => deepLinkChat(c)}
                                                                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/60 border border-emerald-250/20 text-emerald-700 rounded-lg font-bold flex items-center gap-1 shadow-sm">
                                                                        <MessageSquare size={11} /> Ask
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

                            {/* Pending Spinner queue */}
                            {pending.length > 0 && !screening && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Loader2 size={12} className="animate-spin" /> Scanning Queue ({pending.length} files)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {pending.map(r => (
                                            <div key={r.id} className="bg-amber-50/20 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                                                <Loader2 size={14} className="animate-spin text-amber-500 shrink-0" />
                                                <span className="text-xs font-bold text-slate-600 truncate">{r.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Failed resumes panel */}
                            {failed.length > 0 && (
                                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 space-y-3 shadow-sm">
                                    <h4 className="text-xs font-black text-rose-700 flex items-center gap-2 uppercase tracking-wider">
                                        <AlertCircle size={14} /> Failed / Unprocessable Resumes ({failed.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {failed.map(f => (
                                            <div key={f.id} className="bg-white border border-rose-100 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-sm">
                                                <span className="text-xs font-bold text-slate-700 truncate">{f.name}</span>
                                                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 leading-tight">{f.reasoning || 'Deduction rules or parse error'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* ─── Archive Tab ─── */}
                    {tab === 'history' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Saved Run Archive</h3>
                                <button onClick={fetchBatches} disabled={loadingBatches}
                                    className="text-[11px] font-black text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                                    <RefreshCw size={11} className={loadingBatches ? 'animate-spin' : ''} /> Refresh History
                                </button>
                            </div>

                            {loadingBatches ? (
                                <div className="bg-white border border-slate-200 rounded-3xl p-20 flex items-center justify-center gap-2 text-slate-400 shadow-sm">
                                    <Loader2 className="animate-spin text-emerald-500" size={22} />
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="bg-white border border-slate-250 border-dashed rounded-3xl p-16 flex flex-col items-center text-center">
                                    <Calendar size={36} className="text-slate-300 mb-3" />
                                    <h4 className="text-sm font-black text-slate-700">No Screening History Found</h4>
                                    <p className="text-xs text-slate-400 mt-2 font-semibold">Run your first resume screening batch to archive runs here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
                                    {batches.map(b => {
                                        const passRate = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
                                        const isActive = activeBatch === b.batch_id;
                                        return (
                                            <div key={b.batch_id} onClick={() => loadBatch(b.batch_id)}
                                                className={`group bg-white border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col gap-4 justify-between ${isActive ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-green-50/10' : 'border-slate-200 hover:border-emerald-500/30'}`}>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 pr-2">
                                                            <h4 className="text-sm font-extrabold text-slate-800 truncate leading-snug">
                                                                {b.batch_name || b.role || 'General Screening'}
                                                            </h4>
                                                            {b.batch_name && b.role && (
                                                                <p className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">{b.role}</p>
                                                            )}
                                                            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-slate-400">
                                                                <Calendar size={10} />
                                                                {new Date(b.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                            </div>
                                                        </div>
                                                        <button onClick={e => deleteBatch(b.batch_id, e)}
                                                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-50 hover:text-rose-500 text-slate-300 rounded-xl transition-all shadow-sm">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>

                                                    {b.custom_prompt && (
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg w-fit">
                                                            <Gem size={8} className="text-violet-500 animate-spin-slow" /> Custom Guidelines applied
                                                        </div>
                                                    )}

                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                            <span>Screen Fit Rate</span>
                                                            <span className="text-emerald-600">{passRate}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${passRate}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                                                    <div className="flex gap-2.5 text-[10px] font-bold text-slate-400">
                                                        <span className="text-emerald-600">{b.completed} OK</span>
                                                        {b.failed > 0 && <span className="text-rose-500">{b.failed} ERR</span>}
                                                        {(b.pending || 0) > 0 && (
                                                            <span className="text-amber-500 flex items-center gap-0.5 animate-pulse">
                                                                <Clock size={9} /> {b.pending}
                                                            </span>
                                                        )}
                                                        <span>/ {b.total} resumes</span>
                                                    </div>
                                                    <span className="text-emerald-600 text-xs font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-all">
                                                        Load Run <ArrowRight size={12} />
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Dossier slide-over Drawer */}
            <DossierDrawer
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerCandidate(null); setPromoted(false); }}
                candidate={drawerCandidate}
                rank={drawerCandidate ? screened.findIndex(r => r.id === drawerCandidate.id) + 1 : 1}
                onChat={() => drawerCandidate && deepLinkChat(drawerCandidate)}
                onPromote={() => drawerCandidate?.candidate?.id && promoteSingle(drawerCandidate.candidate.id)}
                promoting={promoting}
                promoted={promoted}
            />

            {/* Local Directory upload Modal */}
            <AnimatePresence>
                {showLocalModal && <LocalUploadModal isOpen onClose={() => setShowLocalModal(false)} onUpload={files => setFiles(p => [...p, ...files])} />}
            </AnimatePresence>

            {/* Premium Blocker Modal */}
            <AnimatePresence>
                {showPremiumModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setShowPremiumModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-800 overflow-hidden" 
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Decorative background blur glows */}
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl" />
                            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl" />
                            
                            {/* Close Button */}
                            <button onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>

                            {/* Crown / Premium Icon */}
                            <div className="relative w-16 h-16 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-amber-300 shadow-[0_0_20px_rgba(124,58,237,0.3)] mb-6">
                                <Crown size={30} className="animate-pulse" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-slate-950 border border-slate-900 shadow">
                                    <Lock size={10} />
                                </div>
                            </div>

                            {/* Text Content */}
                            <div className="text-center relative z-10 space-y-3">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-black uppercase tracking-wider rounded-full">
                                    <Zap size={10} className="fill-violet-300 animate-pulse" /> Next Stage: Aptitude Round
                                </div>
                                <h3 className="text-xl font-black tracking-tight text-white">Unlock Premium Access</h3>
                                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                                    Aptitude, Coding, and Technical Interview assessment rounds are premium features. Upgrade your plan to access automated evaluations, interactive coding sandboxes, and real-time voice interview agents.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 mt-8 relative z-10">
                                <button onClick={() => window.open("https://thirdeyedata.ai/contact-us/", "_blank")}
                                    className="w-full py-3.5 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 rounded-2xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2">
                                    <Sparkles size={14} className="fill-slate-950" /> Unlock Premium Now
                                </button>
                                <button onClick={() => setShowPremiumModal(false)}
                                    className="w-full py-3 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-800 transition-all">
                                    Maybe Later
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reset Dialogue modal */}
            {showReset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={() => setShowReset(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-inner">
                            <AlertCircle size={22} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-slate-800">Clear Active Workspace?</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-semibold mt-1">
                                This clears your current JD and resume queue. Historical batches in the database will remain archived.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowReset(false)}
                                className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
                            <button onClick={resetAll}
                                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm">Reset Workspace</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Config Modal */}
            <ExportConfigModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                candidates={screened}
                onExport={(format, columns) => {
                    setShowExportModal(false);
                    if (format === 'pdf') exportToPDF(screened, columns);
                    else if (format === 'excel') exportToExcel(screened, columns);
                }}
            />

        </div>
    );
};

export default ResumeScreening;
