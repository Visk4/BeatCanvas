import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// This is the 'cn' utility for Tailwind
export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// This mimics the createPageUrl function
export const createPageUrl = (pageName) => {
    switch (pageName) {
        case 'Dashboard':
            return '/dashboard';
        case 'CreateVideo':
            return '/createvideo';
        case 'Templates':
            return '/templates';
        case 'History':
            return '/history';
        default:
            return '/';
    }
};