import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Users, FileText, CheckCircle, BrainCircuit, Activity,
    Award, Sparkles, AlertCircle, RefreshCw, ChevronRight, Briefcase, Lock,
    Download, FileSpreadsheet, ChevronDown, Eye, ChevronUp, ExternalLink,
    UserCheck, XCircle, ArrowRight, Target, BarChart2, Zap
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import API_URL from '../apiConfig';
import AnalyticsModal from '../components/AnalyticsModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatTimeAgo = (iso) => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
};

const getRecruiterStatus = (lastActive) => {
    if (!lastActive) return { label: 'Inactive', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500' };
    const hrs = (Date.now() - new Date(lastActive).getTime()) / 3600000;
    if (hrs < 24) return { label: 'Active', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' };
    if (hrs < 168) return { label: 'Recent', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700' };
    return { label: 'Inactive', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500' };
};

const hasResumeFile = (f) => {
    if (!f) return false;
    const s = String(f).trim().toLowerCase();
    return s !== '' && s !== 'null' && s !== 'undefined' && s !== 'n/a' && s !== 'none';
};

const getInitials = (email) => {
    const parts = (email || '').split('@')[0].split(/[._-]/);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?';
};

// ── Pipeline Funnel ───────────────────────────────────────────────────────────

const PipelineFunnel = ({ data }) => {
    const max = data?.[0]?.count || 1;
    const COLORS = ['#4f46e5', '#5d8c2c', '#f59e0b', '#10b981'];
    const ICONS = [FileText, BrainCircuit, UserCheck, Award];

    return (
        <div className="flex flex-col sm:flex-row items-stretch gap-0 w-full">
            {(data || []).map((stage, i) => {
                const pct = i === 0 ? 100 : Math.round((stage.count / max) * 100);
                const dropOff = i > 0 && data[i - 1].count > 0
                    ? Math.round((stage.count / data[i - 1].count) * 100)
                    : null;
                const Icon = ICONS[i];

                return (
                    <React.Fragment key={stage.stage}>
                        <div className="flex-1 flex flex-col items-center text-center p-4 relative">
                            <div
                                className="w-full rounded-xl p-4 flex flex-col items-center gap-2 border transition-all"
                                style={{
                                    background: `${COLORS[i]}12`,
                                    borderColor: `${COLORS[i]}30`,
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                                    style={{ background: `${COLORS[i]}20` }}
                                >
                                    <Icon size={18} style={{ color: COLORS[i] }} />
                                </div>
                                <div className="text-3xl font-black text-slate-800">{stage.count.toLocaleString()}</div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stage.stage}</div>
                                <div
                                    className="w-full h-1.5 rounded-full mt-1"
                                    style={{ background: `${COLORS[i]}20` }}
                                >
                                    <div
                                        className="h-1.5 rounded-full transition-all duration-700"
                                        style={{ width: `${pct}%`, background: COLORS[i] }}
                                    />
                                </div>
                                {dropOff !== null && (
                                    <div
                                        className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                        style={{ background: `${COLORS[i]}15`, color: COLORS[i] }}
                                    >
                                        {dropOff}% conversion
                                    </div>
                                )}
                            </div>
                        </div>
                        {i < data.length - 1 && (
                            <div className="hidden sm:flex items-center text-gray-300 self-center px-1">
                                <ArrowRight size={18} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// ── Recruiter Card ────────────────────────────────────────────────────────────

const RecruiterCard = ({ user, isExpanded, onToggle, onViewCandidate, onViewResume }) => {
    const status = getRecruiterStatus(user.last_active);
    const conversion = user.total_screened > 0
        ? ((user.total_selected / user.total_screened) * 100).toFixed(1)
        : '0.0';
    const initials = getInitials(user.email);
    const avatarColors = ['#4f46e5', '#5d8c2c', '#f59e0b', '#ef4444', '#8b5cf6', '#0891b2'];
    const avatarColor = avatarColors[user.id % avatarColors.length];

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Card Header */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                            style={{ background: avatarColor }}
                        >
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate max-w-[200px]" title={user.email}>
                                {user.email}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.badge}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                    {status.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {formatTimeAgo(user.last_active)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                        {user.batches?.length || 0} batches
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                    {[
                        { label: 'Uploaded', value: user.total_resumes, color: 'text-indigo-600' },
                        { label: 'Screened', value: user.total_screened, color: 'text-[#5d8c2c]' },
                        { label: 'Shortlisted', value: user.total_selected, color: 'text-amber-600' },
                        { label: 'Hired', value: user.total_hired || 0, color: 'text-emerald-600' },
                        { label: 'Rejected', value: user.total_rejected || 0, color: 'text-red-500' },
                        { label: 'Avg Score', value: `${user.avg_score || 0}%`, color: 'text-purple-600' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-2.5 text-center">
                            <div className={`text-base font-black ${color}`}>{value}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Conversion bar */}
                <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Conversion Rate</span>
                        <span className="text-[#5d8c2c]">{conversion}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full">
                        <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-[#5d8c2c] to-emerald-400 transition-all duration-500"
                            style={{ width: `${Math.min(parseFloat(conversion), 100)}%` }}
                        />
                    </div>
                </div>

                {/* Last Action + Keywords */}
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                    {user.last_action && user.last_action !== 'None' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                            <Zap size={8} />
                            {user.last_action}
                        </span>
                    )}
                    {(user.top_keywords_used || []).slice(0, 3).map((kw) => (
                        <span key={kw.keyword} className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                            {kw.keyword}
                        </span>
                    ))}
                </div>
            </div>

            {/* Expand Toggle */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 border-t border-gray-100 transition-colors text-xs font-bold text-slate-600"
            >
                <span>Screening Batches</span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Expanded Batches */}
            {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {(!user.batches || user.batches.length === 0) ? (
                        <p className="px-5 py-4 text-xs text-slate-400 italic">No batches run yet.</p>
                    ) : (
                        user.batches.map((batch) => (
                            <div key={batch.batch_id} className="p-4 space-y-3">
                                {/* Batch Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">{batch.batch_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{batch.batch_id}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200">
                                            {batch.total} candidates
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                            avg {batch.avg_score}%
                                        </span>
                                    </div>
                                </div>

                                {/* Parameters */}
                                {(batch.custom_prompt || batch.keywords) && (
                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        {batch.custom_prompt && (
                                            <div className="bg-violet-50/60 border border-violet-100 rounded-lg p-2.5">
                                                <div className="font-bold text-violet-700 mb-1 flex items-center gap-1">
                                                    <Sparkles size={10} /> Custom Criteria
                                                </div>
                                                <p className="text-slate-600 italic leading-snug">{batch.custom_prompt}</p>
                                            </div>
                                        )}
                                        {batch.keywords && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {batch.keywords.split(',').map((kw, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] border border-emerald-200">
                                                        {kw.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Candidates mini-table */}
                                {batch.candidates && batch.candidates.length > 0 && (
                                    <div className="rounded-lg overflow-hidden border border-slate-100">
                                        <table className="w-full text-[11px]">
                                            <tbody className="divide-y divide-slate-50">
                                                {batch.candidates.map((bc) => (
                                                    <tr key={bc.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="px-3 py-2.5">
                                                            <div className="font-bold text-slate-700">{bc.name}</div>
                                                            <div className="text-[9px] text-slate-400 font-mono">{bc.email}</div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-slate-500">{bc.role || '—'}</td>
                                                        <td className="px-3 py-2.5">
                                                            <span className={`px-2 py-0.5 rounded font-black text-[10px] border ${
                                                                (bc.score || 0) >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : (bc.score || 0) >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                                {bc.score != null ? `${bc.score.toFixed(1)}%` : '0.0%'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right space-x-1.5">
                                                            {hasResumeFile(bc.resume_file) && (
                                                                <button
                                                                    onClick={() => onViewResume(bc.resume_file)}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] transition-all"
                                                                >
                                                                    <ExternalLink size={9} /> Resume
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => onViewCandidate(bc)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] transition-all"
                                                            >
                                                                <Eye size={9} /> Eval
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────

const DarkTooltip = { contentStyle: { background: '#0f172a', color: '#fff', borderRadius: '10px', border: 'none', fontSize: '12px', padding: '8px 12px' } };

// ── Main Dashboard ────────────────────────────────────────────────────────────

const Dashboard = () => {
    const role = localStorage.getItem('role');
    const isAdmin = role === 'admin' || role === 'SUPER_ADMIN' || role === 'HR_ADMIN';

    const [timeRange, setTimeRange] = useState(7);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(isAdmin);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserEmail, setSelectedUserEmail] = useState('All Users');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [expandedRecruiterId, setExpandedRecruiterId] = useState(null);
    const [candidateTab, setCandidateTab] = useState('all');

    const handleViewResume = (resumeFile) => {
        if (!resumeFile) return;
        const url = resumeFile.startsWith('http') ? resumeFile : `${API_URL}/media/resumes/${resumeFile}`;
        window.open(url, '_blank');
    };

    // ── Export: Excel ──────────────────────────────────────────────────────────

    const handleExportExcel = () => {
        if (!data) return;
        const strip = (t) => t ? String(t).replace(/#+\s+/g, '').replace(/[*`~_]/g, '').replace(/^[ \t]*[-*+]\s+/gm, '• ').trim() : '';

        const wb = XLSX.utils.book_new();

        // Summary
        const summaryData = [
            { Metric: 'Total Resumes', Value: data.candidate_stats?.total_resumes ?? 0 },
            { Metric: 'Screened by AI', Value: data.candidate_stats?.total_screened ?? 0 },
            { Metric: 'Shortlisted', Value: data.candidate_stats?.total_selected ?? 0 },
            { Metric: 'Hired', Value: data.candidate_stats?.total_hired ?? 0 },
            { Metric: 'Avg AI Score', Value: `${data.candidate_stats?.avg_score ?? 0}%` },
            { Metric: 'Success Rate', Value: `${data.candidate_stats?.success_rate ?? 0}%` },
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');

        // Candidates
        const candData = (data.top_candidates || []).map((c, i) => ({
            Rank: i + 1, Name: c.name, Email: c.email, Role: c.role || '—',
            Score: c.score != null ? `${c.score.toFixed(1)}%` : '0%',
            Experience: c.experience || '—',
            Certifications: Array.isArray(c.certifications) ? c.certifications.join(', ') : '—',
            Summary: strip(c.candidate_summary),
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(candData), 'Candidates');

        // Missing Skills
        const missingData = (data.top_missing_skills || []).map(s => ({ Skill: s.skill, Count: s.count }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(missingData), 'Skills Gap');

        // Recruiter Workload
        const recData = (data.user_breakdown || []).map(u => ({
            Recruiter: u.email,
            Uploaded: u.total_resumes, Screened: u.total_screened,
            Shortlisted: u.total_selected, Hired: u.total_hired || 0,
            'Avg Score': `${u.avg_score}%`,
            Conversion: u.total_screened > 0 ? `${((u.total_selected / u.total_screened) * 100).toFixed(1)}%` : '0%',
            'Last Active': u.last_active ? new Date(u.last_active).toLocaleString() : 'Never',
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recData), 'Recruiters');

        // Batches
        const batchData = [];
        (data.user_breakdown || []).forEach(u =>
            (u.batches || []).forEach(b => batchData.push({
                Recruiter: u.email, Batch: b.batch_name, Role: b.role || '—',
                Date: b.created_at ? new Date(b.created_at).toLocaleDateString() : '—',
                Candidates: b.total, 'Avg Score': `${b.avg_score}%`,
                Keywords: b.keywords || 'None',
            }))
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(batchData), 'Batches');

        XLSX.writeFile(wb, `HiringAI_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        setShowExportDropdown(false);
    };

    // ── Export: PDF ────────────────────────────────────────────────────────────

    const handleExportPDF = () => {
        if (!data) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const BRAND = [93, 140, 44];

        doc.setFontSize(18); doc.setTextColor(...BRAND);
        doc.text('HiringAI — Admin Command Center', 14, 20);
        doc.setFontSize(9); doc.setTextColor(120, 120, 120);
        doc.text(`Generated: ${new Date().toLocaleString()} · Time Range: ${timeRange === 0 ? 'All Time' : `Last ${timeRange} days`}`, 14, 26);

        const stats = data.candidate_stats || {};
        autoTable(doc, {
            startY: 32,
            head: [['Metric', 'Value']],
            body: [
                ['Total Resumes', stats.total_resumes ?? 0],
                ['Screened by AI', stats.total_screened ?? 0],
                ['Shortlisted', stats.total_selected ?? 0],
                ['Hired', stats.total_hired ?? 0],
                ['Avg AI Score', `${stats.avg_score ?? 0}%`],
                ['Success Rate', `${stats.success_rate ?? 0}%`],
            ],
            theme: 'grid', headStyles: { fillColor: BRAND },
            styles: { fontSize: 9, cellPadding: 2.5 }, margin: { left: 14, right: 14 }
        });

        let y = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12); doc.setTextColor(17); doc.text('Candidates Overview', 14, y);
        autoTable(doc, {
            startY: y + 3,
            head: [['Rank', 'Name', 'Email', 'Role', 'Score', 'Experience']],
            body: (data.top_candidates || []).map((c, i) => [i + 1, c.name, c.email, c.role || '—', `${(c.score || 0).toFixed(1)}%`, c.experience || '—']),
            theme: 'striped', headStyles: { fillColor: BRAND },
            styles: { fontSize: 8, cellPadding: 2 }, margin: { left: 14, right: 14 }
        });

        y = doc.lastAutoTable.finalY + 10;
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setTextColor(17); doc.text('Recruiter Performance', 14, y);
        autoTable(doc, {
            startY: y + 3,
            head: [['Recruiter', 'Uploaded', 'Screened', 'Shortlisted', 'Hired', 'Avg Score', 'Last Active']],
            body: (data.user_breakdown || []).map(u => [
                u.email, u.total_resumes, u.total_screened, u.total_selected,
                u.total_hired || 0, `${u.avg_score}%`,
                u.last_active ? new Date(u.last_active).toLocaleDateString() : 'Never'
            ]),
            theme: 'striped', headStyles: { fillColor: BRAND },
            styles: { fontSize: 8, cellPadding: 2 }, margin: { left: 14, right: 14 }
        });

        doc.save(`HiringAI_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        setShowExportDropdown(false);
    };

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchStats = async (isBackground = false, userId = selectedUserId, range = timeRange) => {
        if (!isBackground) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_URL}/api/dashboard/admin/stats/?time_range=${range}`;
            if (userId !== null) url += `&user_id=${userId}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                setData(await res.json());
                setLastUpdated(new Date());
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Server returned ${res.status}`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (isAdmin) fetchStats(false, selectedUserId, timeRange);
    }, [isAdmin, selectedUserId, timeRange]);

    useEffect(() => {
        if (!isAdmin) return;
        const id = setInterval(() => fetchStats(true, selectedUserId, timeRange), 30000);
        return () => clearInterval(id);
    }, [isAdmin, selectedUserId, timeRange]);

    // ── Non-admin view ─────────────────────────────────────────────────────────

    if (!isAdmin) {
        return (
            <div className="space-y-8 w-full max-w-7xl mx-auto py-10 px-6 font-sans">
                <div className="space-y-2 mb-10 text-left">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hiring Workflows</h1>
                    <p className="text-sm text-gray-500 font-medium">Select a recruitment stage to manage candidates, trigger assessments, and configure screening criteria.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div onClick={() => window.location.href = '/resume-screening'} className="bg-white border border-gray-200/80 hover:border-[#5d8c2c]/40 hover:shadow-lg rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden h-64">
                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#5d8c2c] border border-green-100"><FileText size={18} /></div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">Resume Screening <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded border border-green-200 uppercase tracking-wide">Free</span></h3>
                                <p className="text-xs text-gray-500 leading-relaxed">Upload resumes to parse, evaluate, and rank candidate match percentages against requirements using deep contextual RAG.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5d8c2c] group-hover:translate-x-1.5 transition-transform mt-4">Open Resume Screening <ChevronRight size={14} /></div>
                    </div>
                    {[
                        { label: 'Aptitude Round', icon: BrainCircuit, desc: 'Assess candidate logic, math, and reasoning. Tailor MCQ assessments and grade responses in real-time.' },
                        { label: 'Coding Round', icon: Briefcase, desc: 'Provide isolated runtimes supporting multiple programming languages. Candidates write code against automated test cases.' },
                        { label: 'AI Interview', icon: Activity, desc: 'Conduct conversational AI voice interviews powered by advanced voice synthesis. Grade technical depth and communication.' },
                    ].map(({ label, icon: Icon, desc }) => (
                        <div key={label} className="bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden h-64">
                            <div className="space-y-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-50/75 flex items-center justify-center text-amber-600 border border-amber-100/60 relative">
                                    <Icon size={18} />
                                    <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white"><Lock size={8} /></div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">{label} <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200 uppercase tracking-wide">Locked</span></h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                            <div onClick={() => window.location.href = 'https://thirdeyedata.ai/contact-us/'} className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-4 cursor-pointer hover:underline w-fit">Upgrade to Unlock <ChevronRight size={14} /></div>
                        </div>
                    ))}
                </div>
                <div className="bg-white border border-gray-200/80 text-gray-900 rounded-3xl p-8 relative overflow-hidden mt-8 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#5d8c2c]/10 rounded-full blur-3xl" />
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">Contact Us <Sparkles size={18} className="text-amber-400 animate-pulse" /></h3>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">Ready to unlock premium MCQs, isolated coding rounds, and real-time voice assessments? Contact ThirdEye Data today.</p>
                        </div>
                        <a href="https://thirdeyedata.ai/contact-us/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5d8c2c] to-[#4a7a1f] text-white rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 shrink-0">Contact Us <ChevronRight size={16} /></a>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5d8c2c]" />
                <p className="text-gray-500 font-semibold tracking-wide animate-pulse">Loading dashboard statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[80vh] flex items-center justify-center p-6">
                <div className="bg-red-50 border border-red-200 p-8 rounded-2xl max-w-md text-center shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="text-red-600" size={24} /></div>
                    <h2 className="text-red-700 font-bold text-lg mb-2">Error Loading Dashboard</h2>
                    <p className="text-red-600 text-sm mb-6">{error}</p>
                    <button onClick={() => fetchStats()} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 mx-auto">
                        <RefreshCw size={16} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    const stats = data?.candidate_stats || {};
    const COLORS = ['#5d8c2c', '#ef4444', '#f59e0b'];

    const candidatesToShow = (data?.top_candidates || []).filter(c =>
        candidateTab === 'screened' ? c.score > 0 : true
    );

    const TIME_RANGES = [
        { label: '7D', value: 7 },
        { label: '30D', value: 30 },
        { label: '90D', value: 90 },
        { label: 'All', value: 0 },
    ];

    const kpiCards = [
        { title: 'Total Resumes', value: stats.total_resumes ?? 0, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', accent: '#4f46e5' },
        { title: 'Screened by AI', value: stats.total_screened ?? 0, icon: BrainCircuit, color: 'text-[#5d8c2c]', bg: 'bg-green-50', border: 'border-green-100', accent: '#5d8c2c' },
        { title: 'Shortlisted', value: stats.total_selected ?? 0, icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', accent: '#f59e0b' },
        { title: 'Hired', value: stats.total_hired ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', accent: '#10b981' },
        { title: 'Avg AI Score', value: `${stats.avg_score ?? 0}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', accent: '#8b5cf6' },
        { title: 'Success Rate', value: `${stats.success_rate ?? 0}%`, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', accent: '#f43f5e' },
    ];

    // Component scores for bar chart
    const componentScoreData = [
        { name: 'Skills', value: data?.avg_component_scores?.skills ?? 0, fill: '#4f46e5' },
        { name: 'Experience', value: data?.avg_component_scores?.experience ?? 0, fill: '#5d8c2c' },
        { name: 'Projects', value: data?.avg_component_scores?.projects ?? 0, fill: '#f59e0b' },
        { name: 'Education', value: data?.avg_component_scores?.education ?? 0, fill: '#8b5cf6' },
        { name: 'Bonus', value: data?.avg_component_scores?.bonus ?? 0, fill: '#10b981' },
    ];

    const hasCompScores = componentScoreData.some(d => d.value > 0);

    return (
        <div className="space-y-6 w-full pb-16">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Admin Command Center
                        <span className="text-xs font-bold px-2 py-0.5 bg-[#5d8c2c]/10 text-[#5d8c2c] rounded-full border border-[#5d8c2c]/20">LIVE</span>
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">
                        Real-time pipeline health · AI screening analytics · Recruiter tracking
                        {lastUpdated && (
                            <span className="ml-2 text-gray-300">· Updated {formatTimeAgo(lastUpdated.toISOString())}</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Time range tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5">
                        {TIME_RANGES.map(({ label, value }) => (
                            <button
                                key={value}
                                onClick={() => setTimeRange(value)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange === value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* User filter */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                        >
                            <Users size={13} className="text-gray-400" />
                            <span className="text-[#5d8c2c] max-w-[100px] truncate">{selectedUserEmail}</span>
                            <ChevronDown size={12} className="text-gray-400 shrink-0" />
                        </button>
                        {showUserDropdown && (
                            <>
                                <div className="fixed inset-0 z-[45]" onClick={() => setShowUserDropdown(false)} />
                                <div className="absolute left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 max-h-52 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={() => { setSelectedUserId(null); setSelectedUserEmail('All Users'); setShowUserDropdown(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${selectedUserId === null ? 'bg-green-50 text-green-700 border-l-2 border-green-500' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >All Users</button>
                                    {(data?.users || []).map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => { setSelectedUserId(u.id); setSelectedUserEmail(u.email); setShowUserDropdown(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors truncate ${selectedUserId === u.id ? 'bg-green-50 text-green-700 border-l-2 border-green-500' : 'text-gray-700 hover:bg-gray-50'}`}
                                            title={u.email}
                                        >{u.email}</button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Refreshing indicator */}
                    {refreshing && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <RefreshCw size={11} className="animate-spin" /> Live
                        </div>
                    )}

                    {/* Export */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                        >
                            <Download size={13} /> Export
                        </button>
                        {showExportDropdown && (
                            <>
                                <div className="fixed inset-0 z-[45]" onClick={() => setShowExportDropdown(false)} />
                                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2">
                                    <button onClick={handleExportExcel} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2">
                                        <FileSpreadsheet size={13} className="text-green-600" /> Export Excel (XLSX)
                                    </button>
                                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2">
                                        <FileText size={13} className="text-red-600" /> Export PDF Report
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpiCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={i}
                            whileHover={{ y: -3, scale: 1.01 }}
                            className={`bg-white rounded-2xl p-4 border ${card.border} relative overflow-hidden flex flex-col gap-3 transition-all duration-300 shadow-sm`}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: card.accent }} />
                            <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center shrink-0 mt-1`}>
                                <Icon size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{card.title}</div>
                                <div className="text-2xl font-black text-slate-800 mt-0.5">{card.value}</div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Pipeline Funnel ───────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <BarChart2 size={16} className="text-indigo-600" />
                            Hiring Pipeline Funnel
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">End-to-end conversion from upload to hire</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                        {timeRange === 0 ? 'All Time' : `Last ${timeRange} days`}
                    </span>
                </div>
                <PipelineFunnel data={data?.pipeline_funnel} />
            </div>

            {/* ── Charts Row 1: Trends + Selection Ratio ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                        <Activity size={16} className="text-indigo-600" /> Screening Activity Trends
                    </h3>
                    <p className="text-xs text-gray-400 mb-5">Uploads vs AI-screened over selected period</p>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.trends || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gSc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5d8c2c" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#5d8c2c" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip {...DarkTooltip} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Area name="Uploaded" type="monotone" dataKey="uploaded" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#gUp)" />
                                <Area name="Screened" type="monotone" dataKey="screened" stroke="#5d8c2c" strokeWidth={2.5} fillOpacity={1} fill="url(#gSc)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-[#5d8c2c]" /> Candidate Outcome
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">Selected vs rejected vs pending</p>
                    <div className="h-52 w-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data?.selection_ratio || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                                    {(data?.selection_ratio || []).map((e, i) => <Cell key={i} fill={e.color || COLORS[i]} />)}
                                </Pie>
                                <Tooltip {...DarkTooltip} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Screened</span>
                            <span className="text-2xl font-black text-gray-800">{stats.total_screened ?? 0}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                        {(data?.selection_ratio || []).map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color || COLORS[i] }} />
                                    {item.name}
                                </div>
                                <span className="font-black text-slate-800">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Charts Row 2: Score Dist + Missing Skills + Component Scores ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Score Distribution */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                        <Target size={16} className="text-purple-600" /> Score Distribution
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">Candidate count per AI score band</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.score_distribution || []} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="range" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip {...DarkTooltip} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                                    {(data?.score_distribution || []).map((entry, i) => (
                                        <Cell key={i} fill={entry.color || '#5d8c2c'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Missing Skills */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                        <XCircle size={16} className="text-red-500" /> Skills Gap
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">Most commonly missing skills across candidates</p>
                    {(!data?.top_missing_skills || data.top_missing_skills.length === 0) ? (
                        <p className="text-xs text-gray-400 italic mt-8">No skills gap data yet.</p>
                    ) : (
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={data.top_missing_skills.slice(0, 7)} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                    <YAxis type="category" dataKey="skill" stroke="#94a3b8" fontSize={8} width={80} tickLine={false} />
                                    <Tooltip {...DarkTooltip} />
                                    <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} maxBarSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Avg Component Scores */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                        <Zap size={16} className="text-amber-500" /> Avg Component Scores
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">AI scoring breakdown across screened pool</p>
                    {!hasCompScores ? (
                        <p className="text-xs text-gray-400 italic mt-8">No component score data yet.</p>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {componentScoreData.map((item) => (
                                <div key={item.name} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                                        <span>{item.name}</span>
                                        <span className="font-black" style={{ color: item.fill }}>{item.value}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full">
                                        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(item.value, 100)}%`, background: item.fill }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Charts Row 3: Experience + Certifications ─────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                        <Briefcase size={16} className="text-[#5d8c2c]" /> Experience Distribution
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">Candidate counts by years of experience</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.experience_distribution || []} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="range" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip {...DarkTooltip} />
                                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                        <Award size={16} className="text-amber-500" /> Top Matched Certifications
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">Most common certifications across screened pool</p>
                    {(!data?.most_matched_certifications || data.most_matched_certifications.length === 0) ? (
                        <p className="text-xs text-gray-400 italic mt-8">No certifications matched yet.</p>
                    ) : (
                        <div className="space-y-3 mt-2 max-h-[180px] overflow-y-auto">
                            {data.most_matched_certifications.slice(0, 6).map((cert, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                                        <span className="truncate pr-2">{cert.certification}</span>
                                        <span className="shrink-0 font-black text-amber-600">{cert.count}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full">
                                        <div className="bg-amber-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (cert.count / Math.max(stats.total_screened, 1)) * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recruiter Performance Tracker ─────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Users size={16} className="text-[#5d8c2c]" /> Recruiter Performance Tracker
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Lifetime metrics per recruiter · activity monitoring · batch drilldown</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                        {data?.user_breakdown?.length || 0} recruiters
                    </span>
                </div>
                {(!data?.user_breakdown || data.user_breakdown.length === 0) ? (
                    <div className="py-10 text-center text-xs text-gray-400 italic">No active recruiters found.</div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {data.user_breakdown.map((user) => (
                            <RecruiterCard
                                key={user.id}
                                user={user}
                                isExpanded={expandedRecruiterId === user.id}
                                onToggle={() => setExpandedRecruiterId(expandedRecruiterId === user.id ? null : user.id)}
                                onViewCandidate={setSelectedCandidate}
                                onViewResume={handleViewResume}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Candidate Database ─────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-5">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Sparkles size={16} className="text-[#5d8c2c]" /> Candidate Database
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Parsed profiles · AI scores · evaluation summaries</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                        <button
                            onClick={() => setCandidateTab('all')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${candidateTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            All ({data?.top_candidates?.length || 0})
                        </button>
                        <button
                            onClick={() => setCandidateTab('screened')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${candidateTab === 'screened' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Screened ({data?.top_candidates?.filter(c => c.score > 0).length || 0})
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-gray-100 text-gray-400 font-black uppercase tracking-wider text-[10px]">
                                <th className="py-3 pr-4">Candidate</th>
                                <th className="py-3 pr-4">Role</th>
                                <th className="py-3 pr-4 text-center">Score</th>
                                <th className="py-3 pr-4">Experience</th>
                                <th className="py-3 pr-4">Credentials</th>
                                <th className="py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-slate-700">
                            {candidatesToShow.length === 0 ? (
                                <tr><td colSpan={6} className="py-10 text-center text-xs text-gray-400 italic">No candidates in this view.</td></tr>
                            ) : (
                                candidatesToShow.map((cand, i) => (
                                    <tr key={cand.id || i} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 pr-4">
                                            <div className="font-bold text-slate-900">{cand.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cand.email}</div>
                                        </td>
                                        <td className="py-3.5 pr-4 text-slate-600 font-semibold">{cand.role || '—'}</td>
                                        <td className="py-3.5 pr-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg border font-black text-xs ${cand.score >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : cand.score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {(cand.score || 0).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="py-3.5 pr-4 text-slate-500">{cand.experience || '—'}</td>
                                        <td className="py-3.5 pr-4 text-slate-400 max-w-[180px] truncate text-[11px]">
                                            {Array.isArray(cand.certifications) ? cand.certifications.join(', ') : cand.certifications || '—'}
                                        </td>
                                        <td className="py-3.5 text-right space-x-2 shrink-0">
                                            {hasResumeFile(cand.resume_file) && (
                                                <button
                                                    onClick={() => handleViewResume(cand.resume_file)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-xl text-[11px] shadow-sm transition-all"
                                                >
                                                    <ExternalLink size={11} /> Resume
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedCandidate(cand)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-[11px] transition-all"
                                            >
                                                <Eye size={11} /> Evaluation
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Candidate Evaluation Modal ─────────────────────────────── */}
            {selectedCandidate && (
                <AnalyticsModal
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    onViewResume={handleViewResume}
                />
            )}
        </div>
    );
};

export default Dashboard;
