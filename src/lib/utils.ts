import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper function to check if a user is an admin
 * Matches the PostgreSQL is_admin() function's logic
 */
function isAdmin(userData?: { user_role?: string }) {
  return userData?.user_role === 'admin';
}