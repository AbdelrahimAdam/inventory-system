// src/utils/features.ts
import { ROLES } from "./constants/roles"; 
import { useAuth } from '../context/AuthContext';

export type FeatureFlag =
  | 'advanced-analytics'
  | 'user-management'
  | 'task-queue'
  | 'barcode-scanning'
  | 'supplier-portal'
  | 'purchase-orders'
  | 'inventory-management';

export const ROLE_FEATURES: Record<Role, FeatureFlag[]> = {
  [ROLES.MANAGER]: [
    'advanced-analytics',
    'user-management',
    'inventory-management',
  ],
  [ROLES.WORKER]: [
    'task-queue',
    'barcode-scanning',
    'inventory-management',
  ],
  [ROLES.BUYER]: [
    'purchase-orders',
    'supplier-portal',
  ],
  [ROLES.SUPPLIER]: [
    'supplier-portal',
  ],
};

/**
 * React hook to check if the current user's role has access to a given feature.
 */
export const useFeatureFlag = (feature: FeatureFlag): boolean => {
  const { role } = useAuth();
  if (!role) return false;
  return ROLE_FEATURES[role]?.includes(feature);
};

/**
 * Utility function to check feature availability for any role (not limited to current user).
 */
export const hasFeature = (role: Role, feature: FeatureFlag): boolean => {
  return ROLE_FEATURES[role]?.includes(feature);
};
