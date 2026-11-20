import type { KikiLinkSettings, NotificationSoundChoice, NotificationSoundPreset } from './types';
import { SETTINGS_SOURCE_LIMIT } from './settings-persistence';

export type SoundSettings = KikiLinkSettings['linkReactions']['sounds'];
export const SOUND_EVENTS = ['chat','friendOnline','roomJoin'] as const;
export const SOUND_EVENT_LABELS = {chat:'Chat messages',friendOnline:'Friend online',roomJoin:'Room joins'} as const;
const object = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function isNotificationSoundPreset(value: unknown): value is NotificationSoundPreset {
  return value === 'kiki' || value === 'chime' || value === 'sparkle' || value === 'pop';
}
const choice = (value: unknown): value is NotificationSoundChoice => isNotificationSoundPreset(value) ||
  typeof value === 'string' && value.startsWith('custom:') && /^[a-z0-9_-]{1,64}$/i.test(value.slice(7));

/** Restore the complete known sound section; never fill missing or invalid fields with defaults. */
export function importedSoundSettings(raw: string, schema: number): Readonly<SoundSettings> {
  if (raw.length > SETTINGS_SOURCE_LIMIT || new TextEncoder().encode(raw).length > SETTINGS_SOURCE_LIMIT)
    throw new Error('These sound settings are too large to preserve.');
  let source: unknown;
  try { source = JSON.parse(raw); } catch { throw new Error('The archived settings are unreadable.'); }
  if (!object(source) || (source.schemaVersion !== undefined &&
    (!Number.isSafeInteger(source.schemaVersion) || Number(source.schemaVersion) < 1 || Number(source.schemaVersion) > schema)))
    throw new Error('The archived settings version is unsupported.');
  const sounds = object(source.linkReactions) ? source.linkReactions.sounds : undefined;
  if (!object(sounds) || typeof sounds.enabled !== 'boolean' || !Number.isInteger(sounds.volume) ||
    Number(sounds.volume) < 0 || Number(sounds.volume) > 100 || SOUND_EVENTS.some(key => !choice(sounds[key])))
    throw new Error('This archive does not contain complete, supported sound choices, volume and on/off settings.');
  return Object.freeze({enabled:sounds.enabled,volume:Number(sounds.volume),chat:sounds.chat as NotificationSoundChoice,
    friendOnline:sounds.friendOnline as NotificationSoundChoice,roomJoin:sounds.roomJoin as NotificationSoundChoice});
}
