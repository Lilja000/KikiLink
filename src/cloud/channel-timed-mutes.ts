import type { KeyValueStorage } from '../core/settings';
import { ScopedTimedMutes } from './scoped-timed-mutes';

export interface ChannelMuteScope {
  communityId: string;
  channelId: string;
  recoveryGeneration?: string;
}

export class ChannelTimedMutes extends ScopedTimedMutes<ChannelMuteScope> {
  constructor(storage: KeyValueStorage, owner: number, origin: string, changed: () => void) {
    super(storage, `kikilink:channel-mute:${owner}:${encodeURIComponent(origin)}:`,
      row => `${row.recoveryGeneration ?? 'legacy'}:${encodeURIComponent(row.communityId)}:${encodeURIComponent(row.channelId)}`,
      'Channel', changed);
  }
}
