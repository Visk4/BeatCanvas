import React from 'react';
import { cn } from '@/utils';

export const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}
        {...props}
    >
        <div
            className="h-full w-full flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
            style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
    </div>
));
