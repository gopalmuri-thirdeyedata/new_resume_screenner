import React, { useState, useEffect } from 'react';
import {
    Save, CheckCircle, AlertTriangle, X,
    Zap, Briefcase, FolderGit2, GraduationCap, Star
} from 'lucide-react';
import API_URL from '../apiConfig';

const WEIGHTS = [
    {
        key: 'skills',
        label: 'Skills Matching',
        description: 'Semantic and keyword alignment between resume technical profiles and Job Description demands.',
        icon: Zap,
        color: '#5d8c2c',
        light: '#f0f7e6',
        border: '#c6e2a0',
    },
    {
        key: 'experience',
        label: 'Experience Relevance',
        description: 'Years of experience match, seniority level comparison, and background progression checks.',
        icon: Briefcase,
        color: '#3b82f6',
        light: '#eff6ff',
        border: '#bfdbfe',
    },
    {
        key: 'projects',
        label: 'Project & Role Alignment',
        description: 'Technical complexity, scope of contributions, and product alignment detailed in projects.',
        icon: FolderGit2,
        color: '#8b5cf6',
        light: '#f5f3ff',
        border: '#ddd6fe',
    },
    {
        key: 'education',
        label: 'Education Match',
        description: 'Degrees, certifications, specializations, and institutional background verification.',
        icon: GraduationCap,
        color: '#f59e0b',
        light: '#fffbeb',
        border: '#fde68a',
    },
    {
        key: 'bonus',
        label: 'Preferred & Bonus Skills',
        description: 'Nice-to-have parameters, extra certificates, or extracurricular matches from the JD.',
        icon: Star,
        color: '#ec4899',
        light: '#fdf2f8',
        border: '#fbcfe8',
    },
];

const DEFAULT_SCORING = { skills: 40, experience: 25, projects: 20, education: 10, bonus: 5 };

const GlobalSettings = () => {
    const [scoring, setScoring] = useState(DEFAULT_SCORING);
    const [saveState, setSaveState] = useState('idle'); // idle | saving | success
    const [hasChanges, setHasChanges] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/api/settings/`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
            .then(res => res.json())
            .then(data => {
                if (data?.scoring) {
                    setScoring({ ...DEFAULT_SCORING, ...data.scoring });
                }
            })
            .catch(() => {});
    }, []);

    const scoringSum = WEIGHTS.reduce((s, w) => s + (scoring[w.key] || 0), 0);
    const isScoringValid = scoringSum === 100;
    const diff = 100 - scoringSum;

    const updateWeight = (key, rawVal) => {
        const num = Math.max(0, Math.min(100, parseInt(rawVal) || 0));
        const othersSum = WEIGHTS.filter(w => w.key !== key)
            .reduce((s, w) => s + (scoring[w.key] || 0), 0);
        const clamped = Math.min(num, 100 - othersSum);
        setScoring(prev => ({ ...prev, [key]: clamped }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!isScoringValid || !hasChanges) return;
        setSaveState('saving');
        try {
            const res = await fetch(`${API_URL}/api/settings/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ config: { scoring } })
            });
            if (res.ok) {
                setHasChanges(false);
                setSaveState('success');
                showToast('Scoring weights saved successfully.');
                setTimeout(() => setSaveState('idle'), 3000);
            } else {
                throw new Error();
            }
        } catch {
            setSaveState('idle');
            showToast('Failed to save settings. Please try again.', 'error');
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-16 px-1">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-semibold text-[#5d8c2c] tracking-tight">AI Scoring Weights</h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium max-w-lg">
                        Configure how the Groq AI engine weights each evaluation dimension when scoring resumes against a job description.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saveState === 'saving' || !isScoringValid || !hasChanges}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0 ${
                        saveState === 'saving' || !isScoringValid || !hasChanges
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#5d8c2c] text-white hover:bg-[#4a7023] shadow-md hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                >
                    {saveState === 'saving' && (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {saveState === 'success' && <CheckCircle size={16} />}
                    {saveState === 'idle' && <Save size={16} />}
                    {saveState === 'saving' ? 'Saving…' : saveState === 'success' ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            {/* ── Distribution Overview ── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <div>
                        <p className="text-sm font-bold text-gray-800">Weight Distribution</p>
                        <p className="text-xs text-gray-400 mt-0.5">All five weights must sum to exactly 100%</p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full border ${
                        isScoringValid
                            ? 'bg-green-50 text-[#5d8c2c] border-green-200'
                            : diff > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                        {scoringSum} / 100%
                    </span>
                </div>

                {/* Stacked fill bar */}
                <div className="h-5 rounded-full overflow-hidden bg-gray-100 flex gap-px">
                    {WEIGHTS.map(w => {
                        const pct = scoring[w.key] || 0;
                        if (pct === 0) return null;
                        return (
                            <div
                                key={w.key}
                                className="h-full transition-all duration-300 ease-out first:rounded-l-full last:rounded-r-full"
                                style={{ width: `${pct}%`, backgroundColor: w.color }}
                                title={`${w.label}: ${pct}%`}
                            />
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                    {WEIGHTS.map(w => (
                        <div key={w.key} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                            <span className="text-xs text-gray-500 font-medium">{w.label}</span>
                            <span className="text-xs font-bold" style={{ color: w.color }}>{scoring[w.key] || 0}%</span>
                        </div>
                    ))}
                </div>

                {/* Validation notice */}
                {!isScoringValid && (
                    <div className={`mt-5 flex items-center gap-2.5 text-sm font-medium px-4 py-3 rounded-xl border ${
                        diff > 0
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                        <AlertTriangle size={15} className="shrink-0" />
                        {diff > 0
                            ? `${diff}% unallocated — increase any weight below to reach 100%.`
                            : `${Math.abs(diff)}% over the limit — reduce a weight to reach exactly 100%.`}
                    </div>
                )}
                {isScoringValid && hasChanges && (
                    <div className="mt-5 flex items-center gap-2.5 text-sm font-medium px-4 py-3 rounded-xl border bg-green-50 border-green-200 text-[#5d8c2c]">
                        <CheckCircle size={15} className="shrink-0" />
                        Formula is balanced. Click Save Changes to apply.
                    </div>
                )}
            </div>

            {/* ── Weight Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WEIGHTS.map((w, idx) => {
                    const Icon = w.icon;
                    const value = scoring[w.key] || 0;
                    const othersSum = WEIGHTS.filter(x => x.key !== w.key)
                        .reduce((s, x) => s + (scoring[x.key] || 0), 0);
                    const maxAllowed = 100 - othersSum;

                    return (
                        <div
                            key={w.key}
                            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                            style={{ border: `1px solid ${w.border}` }}
                        >
                            {/* Card header */}
                            <div className="flex items-start justify-between mb-3 gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: w.light }}
                                    >
                                        <Icon size={18} style={{ color: w.color }} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            Weight {idx + 1}
                                        </p>
                                        <h3 className="text-sm font-bold text-gray-800 leading-tight truncate">
                                            {w.label}
                                        </h3>
                                    </div>
                                </div>
                                {/* Large percentage display */}
                                <div className="flex flex-col items-end shrink-0">
                                    <span
                                        className="text-4xl font-black leading-none tabular-nums"
                                        style={{ color: w.color }}
                                    >
                                        {value}
                                    </span>
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                                        percent
                                    </span>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
                                {w.description}
                            </p>

                            {/* Slider with colored fill track */}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={value}
                                onChange={(e) => updateWeight(w.key, e.target.value)}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer mb-3"
                                style={{
                                    accentColor: w.color,
                                    background: `linear-gradient(to right, ${w.color} ${value}%, #e5e7eb ${value}%)`,
                                }}
                            />

                            {/* Footer: number input + max info */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 font-medium">0%</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max={maxAllowed}
                                        value={value}
                                        onChange={(e) => updateWeight(w.key, e.target.value)}
                                        className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ color: w.color, '--tw-ring-color': `${w.color}33` }}
                                    />
                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                        max {maxAllowed}%
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">100%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Toast ── */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                    toast.type === 'success'
                        ? 'bg-green-50 border-green-200 text-[#5d8c2c]'
                        : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                    {toast.type === 'success'
                        ? <CheckCircle size={16} className="shrink-0" />
                        : <AlertTriangle size={16} className="shrink-0" />
                    }
                    {toast.message}
                    <button
                        onClick={() => setToast(null)}
                        className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default GlobalSettings;
