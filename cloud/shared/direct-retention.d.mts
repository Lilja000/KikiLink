export type DirectRetentionDays = 30 | 90 | 365;
export interface DirectRetention { memberNumber: number; days: DirectRetentionDays; revision: number; }
export const DIRECT_RETENTION_DAYS: readonly DirectRetentionDays[];
export function directRetentionDays(value: unknown): value is DirectRetentionDays;
export function checkedDirectRetention(value: unknown, owner: number): DirectRetention;
