import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthLayout = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark to-darkLight relative overflow-hidden">
            {/* Background Shapes */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px]"
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[100px]"
            />

            <div className="z-10 w-full max-w-md p-6">
                <Outlet />
            </div>
        </div>
    );
};

export default AuthLayout;
