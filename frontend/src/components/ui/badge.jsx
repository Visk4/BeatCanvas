import React from 'react';
import { cn } from '@/utils';

export function Badge({ className, variant, ...props }) {
    const baseStyle = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors";
    const variantStyles = {
        default: "border-transparent bg-slate-700 text-white",
        outline: "text-white border-slate-700",
    };

    return (
        <div className={cn(baseStyle, variantStyles[variant], className)} {...props} />
    );
}
