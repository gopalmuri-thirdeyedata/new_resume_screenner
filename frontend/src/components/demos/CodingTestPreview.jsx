import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Play, CheckCircle, XCircle, Loader } from 'lucide-react';

const CodingTestPreview = () => {
    const [stage, setStage] = useState('typing');
    const [code, setCode] = useState('');
    const [testResults, setTestResults] = useState([]);

    const fullCode = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
}`;

    const tests = [
        { id: 1, name: 'Test Case 1', input: '[2,7,11,15], 9', expected: '[0,1]' },
        { id: 2, name: 'Test Case 2', input: '[3,2,4], 6', expected: '[1,2]' },
        { id: 3, name: 'Test Case 3', input: '[3,3], 6', expected: '[0,1]' },
    ];

    useEffect(() => {
        const runAnimation = async () => {
            // Reset
            setCode('');
            setStage('typing');
            setTestResults([]);

            // Type code character by character
            for (let i = 0; i <= fullCode.length; i++) {
                setCode(fullCode.slice(0, i));
                await delay(30);
            }

            await delay(800);
            setStage('running');

            await delay(1500);
            setStage('testing');

            // Show test results one by one
            for (const test of tests) {
                await delay(600);
                setTestResults(prev => [...prev, { ...test, passed: true }]);
            }

            await delay(1000);
            setStage('success');

            // Loop
            await delay(3000);
            runAnimation();
        };

        runAnimation();
    }, []);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    return (
        <div className="relative w-full max-w-4xl mx-auto py-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="inline-flex items-center gap-2 mb-4">
                    <Code className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">Live Coding Assessment</span>
                </div>
                <h3 className="text-3xl font-semibold text-black mb-2">Real-Time Code Execution</h3>
                <p className="text-black font-medium">Candidates code, we test automatically</p>
            </motion.div>

            {/* Demo Container */}
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-none border border-green-500/20 overflow-hidden shadow-2xl shadow-green-500/10">
                {/* Editor Header */}
                <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-none bg-red-500/80" />
                            <div className="w-3 h-3 rounded-none bg-green-500/80" />
                            <div className="w-3 h-3 rounded-none bg-green-500/80" />
                        </div>
                        <span className="ml-4 text-sm text-gray-400 font-mono">solution.js</span>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-none font-normal text-sm transition-all ${stage === 'running' || stage === 'testing'
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20'
                            }`}
                    >
                        {stage === 'running' || stage === 'testing' ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                Run Code
                            </>
                        )}
                    </motion.button>
                </div>

                {/* Code Editor */}
                <div className="p-6 font-mono text-sm min-h-[280px]">
                    <pre className="text-gray-300 leading-relaxed">
                        <code>
                            {code.split('\n').map((line, i) => (
                                <div key={i} className="flex">
                                    <span className="text-gray-600 mr-4 select-none w-6 text-right">{i + 1}</span>
                                    <span>{line}</span>
                                </div>
                            ))}
                        </code>
                    </pre>
                    {stage === 'typing' && (
                        <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="inline-block w-2 h-5 bg-green-500 ml-1"
                        />
                    )}
                </div>

                {/* Test Results Panel */}
                <AnimatePresence>
                    {(stage === 'testing' || stage === 'success') && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-700 bg-gray-900"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-white font-normal flex items-center gap-2 text-lg">
                                        Test Results
                                        {stage === 'success' && (
                                            <span className="text-green-400 text-sm font-normal">
                                                ({testResults.length}/{tests.length} passed)
                                            </span>
                                        )}
                                    </h4>
                                </div>
                                <div className="space-y-2">
                                    {tests.map((test, index) => {
                                        const result = testResults.find(r => r.id === test.id);
                                        return (
                                            <motion.div
                                                key={test.id}
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={`p-3 rounded-none border ${result
                                                    ? 'bg-green-900/20 border-green-700/50'
                                                    : 'bg-gray-800 border-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {result ? (
                                                            <motion.div
                                                                initial={{ scale: 0, rotate: -180 }}
                                                                animate={{ scale: 1, rotate: 0 }}
                                                                transition={{ type: 'spring', stiffness: 200 }}
                                                            >
                                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                                            </motion.div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-none border-2 border-gray-600" />
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-normal text-white">{test.name}</p>
                                                            <p className="text-xs text-white/80">Input: {test.input}</p>
                                                        </div>
                                                    </div>
                                                    {result && (
                                                        <span className="text-xs text-green-400 font-mono tracking-wider">✓ PASSED</span>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Success Confetti Effect (Square) */}
                <AnimatePresence>
                    {stage === 'success' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none"
                        >
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -20, x: Math.random() * 100 + '%', opacity: 1 }}
                                    animate={{
                                        y: '100vh',
                                        rotate: Math.random() * 360,
                                        opacity: 0
                                    }}
                                    transition={{ duration: 2, delay: i * 0.05 }}
                                    className="absolute w-2 h-2 bg-green-400/80 rounded-none shadow-sm"
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CodingTestPreview;
