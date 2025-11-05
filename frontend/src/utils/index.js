import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// This is the 'cn' utility for Tailwind
export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// This mimics the createPageUrl function
export const createPageUrl = (pageName, params = {}) => {
    let url;
    switch (pageName) {
        case 'Dashboard':
            url = '/dashboard';
            break;
        case 'CreateVideo':
            url = '/createvideo';
            break;
        case 'Templates':
            url = '/templates';
            break;
        case 'History':
            url = '/history';
            break;
        default:
            url = '/';
            break;
    }

    if (params && Object.keys(params).length > 0) {
        const query = new URLSearchParams(params).toString();
        url += `?${query}`;
    }

    return url;
};