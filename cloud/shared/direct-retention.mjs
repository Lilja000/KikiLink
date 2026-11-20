export const DIRECT_RETENTION_DAYS = Object.freeze([30, 90, 365]);
export const directRetentionDays = value => DIRECT_RETENTION_DAYS.includes(value);
export function checkedDirectRetention(value, owner) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'days,memberNumber,revision' ||
    !Number.isSafeInteger(owner) || owner < 1 || value.memberNumber !== owner ||
    !directRetentionDays(value.days) || !Number.isSafeInteger(value.revision) || value.revision < 0)
    throw new Error('Invalid Direct history setting');
  return { memberNumber: owner, days: value.days, revision: value.revision };
}
