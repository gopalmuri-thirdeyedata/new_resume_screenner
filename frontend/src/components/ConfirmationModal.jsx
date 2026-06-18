import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'info', confirmText = 'Confirm' }) => {
    if (!isOpen) return null;

    const isWarning = type === 'warning' || type === 'danger';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
                >
                    <div className={`p-6 ${isWarning ? 'bg-red-50/50' : 'bg-green-50/50'} border-b border-gray-100 flex items-start gap-4`}>
                        <div className={`p-3 rounded-full ${isWarning ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {isWarning ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-xl font-bold ${isWarning ? 'text-red-900' : 'text-green-900'}`}>
                                {title}
                            </h3>
                            <div className="mt-2 text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                {message}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 ${isWarning ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600' : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmationModal;
