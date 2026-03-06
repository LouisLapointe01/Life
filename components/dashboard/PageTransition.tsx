"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
        >
            {children}
        </motion.div>
    );
}
