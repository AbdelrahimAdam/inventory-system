// src/utils/constants/roles.ts

export const ROLES = {
  MANAGER: 'manager',
  WORKER: 'worker',
  BUYER: 'buyer',
  SUPPLIER: 'supplier',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export interface RoleConfig {
  title: string;        // English title (e.g., "Manager")
  titleAr: string;      // Arabic title (e.g., "لوحة المدير")
  color: string;        // Tailwind color class
  icon: string;         // Emoji/icon string
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  [ROLES.MANAGER]: {
    title: 'Manager',
    titleAr: 'لوحة المدير',
    color: 'bg-blue-500',
    icon: '👔',
  },
  [ROLES.WORKER]: {
    title: 'Worker',
    titleAr: 'لوحة العامل',
    color: 'bg-green-500',
    icon: '👷',
  },
  [ROLES.BUYER]: {
    title: 'Buyer',
    titleAr: 'لوحة المشتري',
    color: 'bg-purple-500',
    icon: '🛒',
  },
  [ROLES.SUPPLIER]: {
    title: 'Supplier',
    titleAr: 'لوحة المورد',
    color: 'bg-orange-500',
    icon: '🏭',
  },
};

// Optional: General app-level constant
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
