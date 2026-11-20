import type { CloudClient } from './client';
import { OwnerSettingsGenerationError, ownerSettingsSource, requireOwnerSettingsSource, type OwnerSettingsSource } from '../../cloud/shared/owner-settings-source.mjs';
export * from '../../cloud/shared/owner-settings-source.mjs';

type Client = Pick<CloudClient, 'memberNumber' | 'origin' | 'connected' | 'request'>;
export interface OwnerSettingsReview<T> { value: T; source: OwnerSettingsSource; }
export function ownerSettingsGuard(client: Client, owner: number, origin: string, valid: () => boolean): void {
  if (!valid() || client.memberNumber !== owner || client.origin !== origin) throw new Error('Your account or settings view changed. Your original choices are kept.');
}
export async function ownerSettingsMetadata(client: Client, valid: () => boolean): Promise<OwnerSettingsSource> {
  const owner = client.memberNumber, origin = client.origin;
  ownerSettingsGuard(client, owner, origin, valid);
  if (!client.connected) throw new Error('Reconnect to review Cloud settings.');
  const me = await client.request<{memberNumber: number}>('GET', '/v1/me');
  ownerSettingsGuard(client, owner, origin, valid);
  if (!me || me.memberNumber !== owner || !Number.isSafeInteger(owner) || owner < 1) throw new Error('Cloud account changed.');
  return ownerSettingsSource(me);
}
export const ownerSettingsPath = (path: string, source: OwnerSettingsSource): string => source.required ? path + '?recoveryGeneration=' + source.generation : path;
export function ownerSettingsRead(value: unknown, source: OwnerSettingsSource): unknown {
  if (!source.required) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as Record<string, unknown>).recoveryGeneration !== source.generation) throw new OwnerSettingsGenerationError();
  const {recoveryGeneration, ...rest} = value as Record<string, unknown>; return rest;
}
export async function reviewOwnerSettings<T>(client: Client, path: string, valid: () => boolean, original?: OwnerSettingsSource): Promise<OwnerSettingsReview<T>> {
  const owner = client.memberNumber, origin = client.origin, source = await ownerSettingsMetadata(client, valid);
  if (original) requireOwnerSettingsSource(original, source);
  const value = await client.request('GET', ownerSettingsPath(path, source));
  ownerSettingsGuard(client, owner, origin, valid);
  return {value: ownerSettingsRead(value, source) as T, source};
}
export function ownerSettingsBody(body: Record<string, unknown>, source: OwnerSettingsSource | undefined, operationId: string): Record<string, unknown> {
  return {...body, ...source?.required ? {operationId, recoveryGeneration: source.generation} : {}};
}
export function ownerSettingsReceipt(value: unknown, source: OwnerSettingsSource | undefined, owner: number, operationId: string, action: string, hasOwner = true): unknown {
  if (!source?.required) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unconfirmed Cloud settings result.');
  const {recoveryGeneration, memberNumber, operationId: op, action: resultAction, applied, ...rest} = value as Record<string, unknown>;
  if (recoveryGeneration !== source.generation || memberNumber !== owner || op !== operationId || resultAction !== action || applied !== true) throw new Error('Unconfirmed Cloud settings result.');
  return hasOwner ? {memberNumber, ...rest} : rest;
}
export async function writeOwnerSettings<T>(client: Client, method: 'PUT' | 'PATCH' | 'DELETE', path: string, body: Record<string, unknown>, source: OwnerSettingsSource | undefined, action: string, valid: () => boolean, hasOwner = true, acknowledged: () => boolean = valid): Promise<T> {
  const owner = client.memberNumber, origin = client.origin, operationId = crypto.randomUUID();
  const fresh = await ownerSettingsMetadata(client, valid); requireOwnerSettingsSource(source, fresh);
  ownerSettingsGuard(client, owner, origin, valid);
  try {
    const value = await client.request(method, path, ownerSettingsBody(body, source, operationId));
    ownerSettingsGuard(client, owner, origin, acknowledged);
    return ownerSettingsReceipt(value, source, owner, operationId, action, hasOwner) as T;
  } catch (error) {
    if ((error as {code?: string})?.code === 'recovery_generation_required') throw new OwnerSettingsGenerationError();
    throw error;
  }
}
