import React from 'react';
import { cn } from '@/utils';

export const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("relative overflow-y-auto", className)}
        {...props}
    >
        {children}
    </div>
));
