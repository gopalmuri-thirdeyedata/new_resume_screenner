import { SignIn, SignUp, useClerk } from '@clerk/clerk-react';
import { X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

export default function ClerkAuthModal({ isOpen, onClose, mode = 'sign-in' }) {
    const { user } = useClerk();
    const navigate = useNavigate();
    const wasSignedInRef = useRef(!!user);

    // Only redirect on NEW sign-in, not when modal opens with existing session
    useEffect(() => {
        if (user && !wasSignedInRef.current && isOpen) {
            // User just signed in (wasn't signed in before)
            onClose();
            navigate('/dashboard');
        }
        wasSignedInRef.current = !!user;
    }, [user, isOpen, onClose, navigate]);

    if (!isOpen) return null;

    // Custom appearance settings for Clerk
    const clerkAppearance = {
        variables: {
            colorPrimary: "#16A34A",
            borderRadius: "0px",
            colorText: "#000000",
            colorTextSecondary: "#555555"
        },
        elements: {
            rootBox: "mx-auto font-normal",
            card: "shadow-none rounded-none border border-green-100",
            formButtonPrimary: "rounded-none hover:bg-green-700 transition-all font-normal",
            formFieldInput: "rounded-none border-green-100 focus:border-green-500",
            socialButtonsBlockButton: "rounded-none border-green-100",
            footerActionLink: "text-green-600 font-normal hover:text-green-700",
            identityPreviewText: "font-normal",
            formFieldLabel: "font-normal text-black",
            headerTitle: "font-normal text-green-600 text-2xl",
            headerSubtitle: "font-normal text-black",
        }
    };

    // If user is already signed in, show a message instead of sign-in form
    if (user) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative z-10 w-full max-w-md mx-4">
                    <button
                        onClick={onClose}
                        className="absolute -top-12 right-0 text-white/90 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="bg-white rounded-none shadow-[0_0_60px_rgba(0,0,0,0.5)] p-8 text-center border border-green-200">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-normal text-green-600 mb-2">Already Signed In</h2>
                        <p className="text-black mb-6 font-normal">You're already authenticated as <span className="font-normal text-green-600">{user.primaryEmailAddress?.emailAddress}</span></p>
                        <button
                            onClick={() => {
                                onClose();
                                navigate('/dashboard');
                            }}
                            className="w-full px-6 py-3 bg-primary text-white font-normal rounded-none hover:bg-green-700 transition-colors shadow-lg shadow-green-600/10"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Lighter backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal content */}
            <div className="relative z-10 w-auto max-w-full">
                {/* Close button - Positioned more tightly */}
                <button
                    onClick={onClose}
                    className="absolute -top-10 -right-2 md:-right-10 p-2 text-white/80 hover:text-white transition-colors"
                    title="Close"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Card container with clean shadow */}
                <div className="rounded-none shadow-2xl bg-white">
                    {mode === 'sign-in' ? (
                        <SignIn
                            appearance={clerkAppearance}
                            routing="virtual"
                        />
                    ) : (
                        <SignUp
                            appearance={clerkAppearance}
                            routing="virtual"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
