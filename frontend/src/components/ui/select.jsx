import React from 'react';
import { cn } from '@/utils';
import { ChevronDown } from 'lucide-react';

// This is a very simple mock
export const Select = ({ children, ...props }) => <select {...props} className={cn("h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white", props.className)}>{children}</select>;
export const SelectValue = ({ placeholder }) => <option value="">{placeholder}</option>;
export const SelectTrigger = ({ children, className }) => <div>{children}</div>; // Simplified
export const SelectContent = ({ children }) => <div>{children}</div>; // Simplified
export const SelectItem = ({ children, ...props }) => <option {...props}>{children}</option>;
