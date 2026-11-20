import { MATCH_INTERESTS, type MatchSignal } from '../../../cloud/shared/matching.mjs';
import { element } from '../../cloud/dom';
import { bindClockText } from '../../core/time-format';
import type { MatchExpiry } from './matching-signal-editor';

export const matchingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export function matchingSignalTimeZone(offset: number): string {
  return `UTC${offset >= 0 ? '+' : ''}${offset}`;
}

export function signalWindowHint({ from, to, days, utcOffset }: MatchSignal): string {
  if (!from || !to) return 'Enter a valid start and end time.';
  if (from === to) return 'Choose a different end time to define the window.';
  if (!days.length) return 'Select at least one day for this time window.';
  const window = from > to ? 'This overnight window continues into the following day.'
    : 'The same time window applies to each selected day.';
  return `${window} Times use the fixed ${matchingSignalTimeZone(utcOffset)} offset.`;
}

export function renderSignalExpiry(hint: HTMLElement, expiry: MatchExpiry, expiresAt: number | null, serverNow: number): void {
  if (expiry === '1' || expiry === '4') {
    hint.textContent = `A new ${expiry === '1' ? '1 hour' : '4 hours'} window starts from save. Your signal is visible only when available.`;
  } else if (expiry === 'none' || expiresAt === null) {
    hint.textContent = expiry === 'none' ? 'No expiry. You can pause your signal at any time.'
      : 'There is no current expiry. Keeping it leaves the signal without a time limit.';
  } else {
    const time = bindClockText(element('time'), expiresAt, 'medium-date-time');
    if (expiresAt <= serverNow) {
      hint.replaceChildren('The previous window expired at ', time, '. Choose a new expiry to make your signal available.');
    } else {
      hint.replaceChildren('Current expiry: ', time, '. Saving other details keeps this expiry.');
    }
  }
}
const compatibility = {
  Details: 'Compatibility details may be shared when profile preferences allow it.',
  'Score only': 'Only a compatibility score may be shared.',
  Off: 'Compatibility not shared.',
};

export function renderSignalPreview(card: HTMLElement, signal: MatchSignal): void {
  const { share } = signal;
  const zone = matchingSignalTimeZone(signal.utcOffset);
  const interests = share.interests ? MATCH_INTERESTS.filter(interest => signal.interests.includes(interest.id)) : [];
  card.replaceChildren(
    element('header', {}, element('strong', { text: 'Matching signal' }), element('span', { text: signal.audience })),
    ...(signal.note.trim() ? [element('p', { className: 'kl-match-signal-preview-note', text: signal.note })] : []),
    element('ul', { className: 'kl-match-signal-preview-tags', ariaLabel: 'Looking for' },
      ...signal.intents.map(text => element('li', { text }))),
    element('div', { className: 'kl-match-signal-preview-meta' },
      element('span', { text: signal.languages.join(' · ') || 'No languages selected' }),
      element('span', { text: signal.size }),
      share.availability ? element('span', { text: `${signal.duration} min` }) : undefined,
      share.availability ? element('span', { text: `${signal.availability} · ${signal.days.map(day => matchingDays[day]?.slice(0, 3)).join(', ')}` }) : undefined,
      element('span', { text: share.availability
        ? `${signal.from}–${signal.to} ${zone}${signal.from > signal.to ? ' · overnight' : ''}`
        : 'Availability not shared' })),
    interests.length ? element('ul', { className: 'kl-match-signal-preview-tags', ariaLabel: 'Shared interests' },
      ...interests.slice(0, 3).map(interest => element('li', { text: interest.label })),
      interests.length > 3 ? element('li', { text: `+${interests.length - 3} interests` }) : undefined)
      : element('p', { className: 'kl-match-meta', text: share.interests ? 'No interests selected' : 'Interests not shared' }),
    element('p', { className: 'kl-match-meta', text: compatibility[share.compatibility] }),
    element('p', { className: 'kl-match-meta', text: share.connections
      ? 'Mutual connections may be compared. Community visibility follows your profile privacy.' : 'Connections not shared.' }),
  );
}

export function renderSignalPublication(summary: HTMLElement, signal: MatchSignal, expiry: MatchExpiry,
  serverNow: number, canPublish: boolean): void {
  if (!signal.published) {
    summary.textContent = 'Your signal will be saved paused.';
    return;
  }
  if (!canPublish || signal.availability === 'Not looking') {
    summary.textContent = !canPublish ? 'Enable profile discovery before publishing your signal.'
      : 'Choose a different availability before publishing your signal.';
    return;
  }
  if (expiry === 'keep' && signal.expiresAt !== null && signal.expiresAt <= serverNow) {
    summary.textContent = 'Your signal has expired. Choose a new expiry to make it available.';
    return;
  }
  const until = expiry === 'keep' && signal.expiresAt !== null
    ? element('span', {}, 'until ', bindClockText(element('time'), signal.expiresAt, 'medium-date-time'))
    : expiry === '1' ? '1 hour from save' : expiry === '4' ? '4 hours from save' : 'until paused';
  summary.replaceChildren(`Available to ${signal.audience === 'Friends' ? 'friends' : 'everyone'} · `, until);
}
