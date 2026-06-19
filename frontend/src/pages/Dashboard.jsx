import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, Users, FileText, CheckCircle, BrainCircuit, Activity, 
    Clock, Award, Sparkles, AlertCircle, RefreshCw, ChevronRight, Briefcase, Lock,
    Download, FileSpreadsheet, Trash2, ChevronDown
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    Legend, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import API_URL from '../apiConfig';

const Dashboard = () => {
    const role = localStorage.getItem('role');
    const isAdmin = role === 'admin' || role === 'SUPER_ADMIN' || role === 'HR_ADMIN';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(isAdmin);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUserEmail, setSelectedUserEmail] = useState('All Users');
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    const handleResetData = async () => {
        setResetting(true);
        setShowResetConfirm(false);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/resume/reset-screened/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                alert("Dashboard candidate records and vectors have been successfully reset.");
                setSelectedUserId(null);
                setSelectedUserEmail('All Users');
                fetchStats(false, null);
            } else {
                const errData = await response.json();
                alert(`Reset failed: ${errData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Failed to reset candidates", error);
            alert("Connection error.");
        } finally {
            setResetting(false);
        }
    };

    const handleExportExcel = () => {
        if (!data) return;
        
        // 1. Summary Sheet
        const summaryData = [
            { "Metric": "Total Resumes", "Value": data.candidate_stats?.total_resumes ?? 0 },
            { "Metric": "Screened by AI", "Value": data.candidate_stats?.total_screened ?? 0 },
            { "Metric": "Selected Pool", "Value": data.candidate_stats?.total_selected ?? 0 },
            { "Metric": "Success Rate", "Value": `${data.candidate_stats?.success_rate ?? 0}%` },
            { "Metric": "", "Value": "" },
            { "Metric": "Experience Distribution", "Value": "" }
        ];
        
        (data.experience_distribution || []).forEach(item => {
            summaryData.push({ "Metric": `  ${item.range}`, "Value": item.count });
        });
        
        summaryData.push({ "Metric": "", "Value": "" });
        summaryData.push({ "Metric": "Keyword Match Distribution", "Value": "" });
        
        (data.keyword_match_distribution || []).forEach(item => {
            summaryData.push({ "Metric": `  ${item.range}`, "Value": item.count });
        });

        const wsSummary = XLSX.utils.json_to_sheet(summaryData);

        // 2. Candidates Overview Sheet
        const topCandidatesData = (data.top_candidates || []).map((c, idx) => ({
            "Rank": idx + 1,
            "Name": c.name,
            "Email": c.email,
            "Role": c.role || '—',
            "Score": c.score != null ? `${c.score.toFixed(1)}%` : '0%',
            "Experience": c.experience || '—',
            "Certifications": Array.isArray(c.certifications) ? c.certifications.join(', ') : (c.certifications || '—')
        }));
        const wsTopCandidates = XLSX.utils.json_to_sheet(topCandidatesData);

        // 2b. Screened Candidates Sheet (score > 0)
        const screenedCandidatesData = (data.top_candidates || [])
            .filter(c => c.score > 0)
            .map((c, idx) => ({
                "Rank": idx + 1,
                "Name": c.name,
                "Email": c.email,
                "Role": c.role || '—',
                "Score": c.score != null ? `${c.score.toFixed(1)}%` : '0%',
                "Experience": c.experience || '—',
                "Certifications": Array.isArray(c.certifications) ? c.certifications.join(', ') : (c.certifications || '—')
            }));
        const wsScreenedCandidates = XLSX.utils.json_to_sheet(screenedCandidatesData);

        // 3. Keyword Demands Sheet
        const keywordData = (data.most_used_keywords || []).map(item => ({
            "Keyword": item.keyword,
            "Candidate Count": item.count
        }));
        const wsKeywords = XLSX.utils.json_to_sheet(keywordData);

        // 4. Activity Logs Sheet
        const activityData = (data.recent_activity || []).map(log => ({
            "Timestamp": log.timestamp ? new Date(log.timestamp).toLocaleString() : '—',
            "Action": log.action,
            "Target": log.target,
            "Details": log.details || '—'
        }));
        const wsActivity = XLSX.utils.json_to_sheet(activityData);

        // Create Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary Report");
        XLSX.utils.book_append_sheet(wb, wsTopCandidates, "Candidates Overview");
        XLSX.utils.book_append_sheet(wb, wsScreenedCandidates, "Screened Candidates");
        XLSX.utils.book_append_sheet(wb, wsKeywords, "Keyword Demands");
        XLSX.utils.book_append_sheet(wb, wsActivity, "Activity Logs");

        // Auto-fit column widths helper
        const autofitColumns = (ws) => {
            if (!ws['!ref']) return;
            const range = XLSX.utils.decode_range(ws['!ref']);
            const cols = [];
            for (let C = range.s.c; C <= range.e.c; ++C) {
                let maxLen = 10;
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                    if (cell && cell.v) {
                        maxLen = Math.max(maxLen, String(cell.v).length);
                    }
                }
                cols.push({ wch: maxLen + 3 });
            }
            ws['!cols'] = cols;
        };

        autofitColumns(wsSummary);
        autofitColumns(wsTopCandidates);
        autofitColumns(wsScreenedCandidates);
        autofitColumns(wsKeywords);
        autofitColumns(wsActivity);

        XLSX.writeFile(wb, `HiringAI_Dashboard_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
        setShowExportDropdown(false);
    };

    const handleExportPDF = () => {
        if (!data) return;

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 1. Title Header
        doc.setFontSize(18);
        doc.setTextColor(93, 140, 44); // Brand Color #5d8c2c
        doc.text("HiringAI - Command Center Report", 14, 20);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Scope: ADMIN DASHBOARD`, 14, 26);

        // 2. Core Metrics Summary table
        const statsHeaders = [["Metric", "Value"]];
        const statsBody = [
            ["Total Resumes", data.candidate_stats?.total_resumes ?? 0],
            ["Screened by AI", data.candidate_stats?.total_screened ?? 0],
            ["Selected Pool", data.candidate_stats?.total_selected ?? 0],
            ["Success Rate", `${data.candidate_stats?.success_rate ?? 0}%`]
        ];

        autoTable(doc, {
            startY: 32,
            head: statsHeaders,
            body: statsBody,
            theme: 'grid',
            headStyles: { fillColor: [93, 140, 44] }, // #5d8c2c
            styles: { fontSize: 9, cellPadding: 2.5 },
            margin: { left: 14, right: 14 }
        });

        // 3. Section Title: Candidates Overview
        let currentY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(17);
        doc.text("Candidates Overview", 14, currentY);

        const candidatesHeaders = [["Rank", "Name", "Email", "Applied Role", "Score", "Experience"]];
        const candidatesBody = (data.top_candidates || []).map((c, idx) => [
            idx + 1,
            c.name,
            c.email,
            c.role || '—',
            c.score != null ? `${c.score.toFixed(1)}%` : '0%',
            c.experience || '—'
        ]);

        autoTable(doc, {
            startY: currentY + 3,
            head: candidatesHeaders,
            body: candidatesBody,
            theme: 'striped',
            headStyles: { fillColor: [93, 140, 44] }, // #5d8c2c
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
        });

        // 3b. Section Title: Screened Candidates (score > 0)
        currentY = doc.lastAutoTable.finalY + 10;
        
        // Page break if necessary
        if (currentY > 240) {
            doc.addPage();
            currentY = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(17);
        doc.text("Screened Candidates", 14, currentY);

        const screenedHeaders = [["Rank", "Name", "Email", "Applied Role", "Score", "Experience"]];
        const screenedBody = (data.top_candidates || [])
            .filter(c => c.score > 0)
            .map((c, idx) => [
                idx + 1,
                c.name,
                c.email,
                c.role || '—',
                c.score != null ? `${c.score.toFixed(1)}%` : '0%',
                c.experience || '—'
            ]);

        autoTable(doc, {
            startY: currentY + 3,
            head: screenedHeaders,
            body: screenedBody,
            theme: 'striped',
            headStyles: { fillColor: [93, 140, 44] }, // #5d8c2c
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
        });

        // 4. Section Title: Top Keyword Demands
        currentY = doc.lastAutoTable.finalY + 10;
        
        // Page break if necessary
        if (currentY > 240) {
            doc.addPage();
            currentY = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(17);
        doc.text("Top Keyword Demands", 14, currentY);

        const keywordsHeaders = [["Keyword", "Candidate Count"]];
        const keywordsBody = (data.most_used_keywords || []).map(item => [
            item.keyword,
            item.count
        ]);

        autoTable(doc, {
            startY: currentY + 3,
            head: keywordsHeaders,
            body: keywordsBody,
            theme: 'striped',
            headStyles: { fillColor: [93, 140, 44] }, // #5d8c2c
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
        });

        doc.save(`HiringAI_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        setShowExportDropdown(false);
    };

    const fetchStats = async (isBackground = false, userId = selectedUserId) => {
        if (!isBackground) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        setError(null);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_URL}/api/dashboard/admin/stats/`;
            if (userId !== null) {
                url += `?user_id=${userId}`;
            }
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const json = await response.json();
                setData(json);
            } else {
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.detail || `Server returned ${response.status}`);
            }
        } catch (err) {
            console.error("Dashboard data fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchStats(false, selectedUserId);
        }
    }, [isAdmin, selectedUserId]);

    useEffect(() => {
        if (isAdmin) {
            const interval = setInterval(() => fetchStats(true, selectedUserId), 15000);
            return () => clearInterval(interval);
        }
    }, [isAdmin, selectedUserId]);

    if (!isAdmin) {
        return (
            <div className="space-y-8 w-full max-w-7xl mx-auto py-10 px-6 font-sans">
                {/* Header matching HiringAI workflows style */}
                <div className="space-y-2 mb-10 text-left">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hiring Workflows</h1>
                    <p className="text-sm text-gray-500 font-medium">
                        Select a recruitment stage to manage candidates, trigger assessments, and configure screening criteria.
                    </p>
                </div>

                {/* Grid of Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* 1. Resume Screening (Unlocked) */}
                    <div 
                        onClick={() => window.location.href = '/resume-screening'}
                        className="bg-white border border-gray-200/80 hover:border-[#5d8c2c]/40 hover:shadow-lg rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden h-64"
                    >
                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#5d8c2c] border border-green-100">
                                <FileText size={18} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    Resume Screening
                                    <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded border border-green-200 uppercase tracking-wide">
                                        Free
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Upload resumes to parse, evaluate, and rank candidate match percentages against requirements using deep contextual RAG.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5d8c2c] group-hover:translate-x-1.5 transition-transform mt-4">
                            Open Resume Screening
                            <ChevronRight size={14} />
                        </div>
                    </div>

                    {/* 2. Aptitude Round (Locked) */}
                    <div 
                        className="bg-white border border-gray-200/80 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-64"
                    >
                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-50/75 flex items-center justify-center text-amber-600 border border-amber-100/60 relative">
                                <BrainCircuit size={18} />
                                <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white">
                                    <Lock size={8} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    Aptitude Round
                                    <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200 uppercase tracking-wide flex items-center gap-1">
                                        Locked
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Assess candidate logic, math, and reason capabilities. Tailor MCQ assessments and grade responses in real-time.
                                </p>
                            </div>
                        </div>
                        <div 
                            onClick={() => window.location.href = 'https://thirdeyedata.ai/contact-us/'}
                            className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-4 cursor-pointer hover:underline w-fit"
                        >
                            Upgrade to Unlock Feature
                            <ChevronRight size={14} />
                        </div>
                    </div>

                    {/* 3. Coding Round (Locked) */}
                    <div 
                        className="bg-white border border-gray-200/80 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-64"
                    >
                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-50/75 flex items-center justify-center text-amber-600 border border-amber-100/60 relative">
                                <Briefcase size={18} />
                                <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white">
                                    <Lock size={8} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    Coding Round
                                    <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200 uppercase tracking-wide">
                                        Locked
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Provide isolated runtimes supporting multiple programming languages. Candidates write code against automated test cases.
                                </p>
                            </div>
                        </div>
                        <div 
                            onClick={() => window.location.href = 'https://thirdeyedata.ai/contact-us/'}
                            className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-4 cursor-pointer hover:underline w-fit"
                        >
                            Upgrade to Unlock Feature
                            <ChevronRight size={14} />
                        </div>
                    </div>

                    {/* 4. AI Interview (Locked) */}
                    <div 
                        className="bg-white border border-gray-200/80 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-64"
                    >
                        <div className="space-y-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-50/75 flex items-center justify-center text-amber-600 border border-amber-100/60 relative">
                                <Activity size={18} />
                                <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border border-white">
                                    <Lock size={8} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    AI Interview
                                    <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded border border-amber-200 uppercase tracking-wide">
                                        Locked
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Conduct conversational AI voice interviews powered by advanced voice synthesis. Grade technical depth and communication.
                                </p>
                            </div>
                        </div>
                        <div 
                            onClick={() => window.location.href = 'https://thirdeyedata.ai/contact-us/'}
                            className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-4 cursor-pointer hover:underline w-fit"
                        >
                            Upgrade to Unlock Feature
                            <ChevronRight size={14} />
                        </div>
                    </div>
                </div>

                {/* Contact Us Box */}
                <div className="bg-white border border-gray-200/80 text-gray-900 rounded-3xl p-8 relative overflow-hidden mt-8 shadow-md hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#5d8c2c]/10 rounded-full blur-3xl" />
                    <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
                    
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                                Contact Us
                                <Sparkles size={18} className="text-amber-400 animate-pulse" />
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                                Ready to unlock premium MCQs, isolated coding compile rounds, and real-time voice assessments? Contact ThirdEye Data today to upgrade your pipeline.
                            </p>
                        </div>
                        <a
                            href="https://thirdeyedata.ai/contact-us/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#5d8c2c] to-[#4a7a1f] text-white hover:shadow-lg hover:shadow-green-500/20 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 shrink-0 self-start md:self-center"
                        >
                            Contact Us
                            <ChevronRight size={16} />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5d8c2c]"></div>
                <p className="text-gray-500 font-semibold tracking-wide animate-pulse">Loading dashboard statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[80vh] flex items-center justify-center p-6">
                <div className="bg-red-50 border border-red-200 p-8 rounded-2xl max-w-md text-center shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-600" size={24} />
                    </div>
                    <h2 className="text-red-700 font-bold text-lg mb-2">Error Loading Dashboard</h2>
                    <p className="text-red-650 text-sm mb-6 leading-relaxed">{error}</p>
                    <button 
                        onClick={() => fetchStats()} 
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all text-sm font-bold shadow-md flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={16} />
                        Retry Load
                    </button>
                </div>
            </div>
        );
    }

    const stats = data?.candidate_stats || {
        total_resumes: 0,
        total_screened: 0,
        total_selected: 0,
        total_rejected: 0,
        success_rate: 0
    };

    const statCards = [
        { title: 'Total Resumes', value: stats.total_resumes, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        { title: 'Screened by AI', value: stats.total_screened, icon: BrainCircuit, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
        { title: 'Selected Pool', value: stats.total_selected, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
        { title: 'Success Rate', value: `${stats.success_rate}%`, icon: TrendingUp, color: 'text-[#5d8c2c]', bg: 'bg-[#5d8c2c]/10', border: 'border-[#5d8c2c]/20' }
    ];

    const COLORS = ['#5d8c2c', '#ef4444', '#f59e0b'];

    return (
        <div className="space-y-8 w-full pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-[#5d8c2c] tracking-tight flex items-center gap-2">
                        Command Center
                        <Sparkles size={24} className="text-amber-500 animate-pulse" />
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Real-time candidate statistics, AI screening match trends, and pipeline health.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Premium User Filter Dropdown Button */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                            title="Filter by Screener"
                        >
                            <Users size={14} className="text-gray-400" />
                            <span>
                                Screened By: <span className="text-[#5d8c2c] ml-0.5">{selectedUserEmail}</span>
                            </span>
                            <ChevronDown size={13} className="text-gray-400 ml-1 shrink-0" />
                        </button>
                        {showUserDropdown && (
                            <>
                                <div className="fixed inset-0 z-[45]" onClick={() => setShowUserDropdown(false)} />
                                <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                                    <button
                                        onClick={() => {
                                            setSelectedUserId(null);
                                            setSelectedUserEmail('All Users');
                                            setShowUserDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${selectedUserId === null ? 'bg-green-50 text-green-700 border-l-2 border-green-500' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        All Users
                                    </button>
                                    {(data?.users || []).map((u) => (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedUserId(u.id);
                                                setSelectedUserEmail(u.email);
                                                setShowUserDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors truncate ${selectedUserId === u.id ? 'bg-green-50 text-green-700 border-l-2 border-green-500' : 'text-gray-700 hover:bg-gray-50'}`}
                                            title={u.email}
                                        >
                                            {u.email}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {refreshing && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <RefreshCw size={12} className="animate-spin" />
                            Updating...
                        </div>
                    )}
                    
                    <div className="relative">
                        <button 
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                            title="Export Report"
                        >
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                        {showExportDropdown && (
                            <>
                                <div className="fixed inset-0 z-[45]" onClick={() => setShowExportDropdown(false)} />
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={handleExportExcel}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-2"
                                    >
                                        <FileSpreadsheet size={14} className="text-green-600" />
                                        Export as Excel (XLSX)
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2"
                                    >
                                        <FileText size={14} className="text-red-600" />
                                        Export PDF Report
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={() => setShowResetConfirm(true)}
                        disabled={resetting}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition-all shadow-sm disabled:opacity-50"
                        title="Reset Candidates Data"
                    >
                        <Trash2 size={14} className="text-red-500" />
                        <span>{resetting ? 'Resetting...' : 'Reset Data'}</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div 
                            key={index} 
                            whileHover={{ y: -4 }}
                            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 rotate-12">
                                <Icon size={64} className={stat.color} />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`p-3.5 rounded-xl ${stat.bg} ${stat.color} border border-white/50 shadow-sm`}>
                                    <Icon size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.title}</p>
                                    <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.value}</h3>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Section Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Resume Screening Trends Area Chart */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Activity size={18} className="text-indigo-600" />
                            Screening Activity & Upload Trends
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Resume uploads and AI screens completed over the last 7 days</p>
                    </div>
                    <div className="h-72 w-full mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUploaded" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorScreened" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5d8c2c" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#5d8c2c" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" fontSize={12} />
                                <Area name="Resumes Uploaded" type="monotone" dataKey="uploaded" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUploaded)" />
                                <Area name="Successfully Screened" type="monotone" dataKey="screened" stroke="#5d8c2c" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScreened)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Selection Ratio Donut Chart */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <CheckCircle size={18} className="text-[#5d8c2c]" />
                            Candidate Selection Ratio
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Ratio of selected vs rejected vs pending candidates</p>
                    </div>
                    <div className="h-56 w-full relative mt-4 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.selection_ratio || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={85}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {(data?.selection_ratio || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs font-bold text-gray-400 uppercase">Screened</span>
                            <span className="text-2xl font-black text-gray-800">{stats.total_screened}</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex justify-center gap-5 mt-2">
                        {(data?.selection_ratio || []).map((item, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || COLORS[index] }} />
                                <span className="text-xs font-bold text-gray-600">{item.name} ({item.value})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Section Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Experience Distribution */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase size={16} className="text-[#5d8c2c]" />
                        Experience Distribution
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Candidate counts grouped by years of experience</p>
                    <div className="h-56 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.experience_distribution || []} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="range" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Top Certifications Match (Horizontal Bar Chart) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Award size={16} className="text-amber-500" />
                        Certification Matches
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Frequency of matched certifications in screening</p>
                    <div className="h-56 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                layout="vertical" 
                                data={data?.certification_match_distribution?.slice(0, 5) || []} 
                                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <YAxis type="category" dataKey="certification" stroke="#94a3b8" fontSize={8} width={80} tickLine={false} />
                                <Tooltip contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Details Section: Lists & Reports */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Column Left: Insights lists */}
                <div className="space-y-6">
                    {/* Top Certifications Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Award size={18} className="text-amber-500" />
                            Most Popular Certifications
                        </h3>
                        <div className="space-y-4">
                            {(!data?.most_matched_certifications || data.most_matched_certifications.length === 0) ? (
                                <p className="text-xs text-gray-400 italic">No certifications matched yet.</p>
                            ) : (
                                data.most_matched_certifications.map((cert, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold text-gray-700">
                                            <span>{cert.certification}</span>
                                            <span>{cert.count} matches</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div 
                                                className="bg-amber-500 h-1.5 rounded-full" 
                                                style={{ width: `${Math.min(100, (cert.count / (stats.total_screened || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Column Right: Top Candidates & Recent Logs */}
                <div className="space-y-6">
                    {/* Candidates Overview Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-indigo-600 animate-pulse" />
                            Candidates Overview
                        </h3>
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                                        <th className="py-2.5">Candidate</th>
                                        <th className="py-2.5">Applied Role</th>
                                        <th className="py-2.5 text-center">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {(!data?.top_candidates || data.top_candidates.length === 0) ? (
                                        <tr>
                                            <td colSpan={3} className="py-4 text-center text-xs text-gray-400 italic">No candidates found.</td>
                                        </tr>
                                    ) : (
                                        data.top_candidates.map((cand, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="py-3">
                                                    <div className="font-bold text-gray-900">{cand.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{cand.email}</div>
                                                </td>
                                                <td className="py-3 text-gray-600">{cand.role || '—'}</td>
                                                <td className="py-3 text-center">
                                                    <span className="px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded-lg border border-green-200">
                                                        {cand.score?.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Screened Candidates Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle size={18} className="text-green-600 animate-pulse" />
                            Screened Candidates
                        </h3>
                        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                                        <th className="py-2.5">Candidate</th>
                                        <th className="py-2.5">Applied Role</th>
                                        <th className="py-2.5 text-center">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {(!data?.top_candidates || data.top_candidates.filter(c => c.score > 0).length === 0) ? (
                                        <tr>
                                            <td colSpan={3} className="py-4 text-center text-xs text-gray-400 italic">No screened candidates found.</td>
                                        </tr>
                                    ) : (
                                        data.top_candidates.filter(c => c.score > 0).map((cand, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                <td className="py-3">
                                                    <div className="font-bold text-gray-900">{cand.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{cand.email}</div>
                                                </td>
                                                <td className="py-3 text-gray-600">{cand.role || '—'}</td>
                                                <td className="py-3 text-center">
                                                    <span className="px-2 py-0.5 bg-green-50 text-green-700 font-bold rounded-lg border border-green-200">
                                                        {cand.score?.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {showResetConfirm && (
                <ConfirmModal 
                    title="Reset All Candidates & Data?"
                    message="Are you sure you want to permanently delete all candidate profiles, clear history, and reset the dashboard data? This cannot be undone."
                    confirmLabel="Reset All"
                    danger={true}
                    onConfirm={handleResetData}
                    onCancel={() => setShowResetConfirm(false)}
                />
            )}
        </div>
    );
};

const ConfirmModal = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onCancel}>
        <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <AlertCircle size={24} className={danger ? 'text-red-600' : 'text-yellow-600'} />
                </div>
                <h3 className="text-base font-bold text-gray-900 text-center mb-2">{title}</h3>
                <p className="text-sm text-gray-500 text-center leading-relaxed">{message}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors ${danger ? 'bg-red-650 hover:bg-red-700' : 'bg-[#5d8c2c] hover:bg-[#4a7023]'}`}
                >
                    {confirmLabel}
                </button>
            </div>
        </div>
    </div>
);

export default Dashboard;
