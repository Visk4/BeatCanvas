import React from 'react';
import { cn } from '@/utils'; // Import the cn utility

export const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
    // Simple styling to make them look like buttons
    const baseStyle = "px-4 py-2 rounded-md font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500";
    const variantStyles = {
        default: "bg-blue-600 hover:bg-blue-700",
        destructive: "bg-red-600 hover:bg-red-700",
        outline: "border border-slate-700 hover:bg-slate-800",
        ghost: "hover:bg-slate-800",
    };
    const sizeStyles = {
        default: "h-10",
        sm: "h-9 px-3",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={cn(baseStyle, variantStyles[variant], sizeStyles[size], className)}
            ref={ref}
            {...props}
        />
    );
});
