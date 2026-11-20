// Shared data-only contract for Workshop and the new-community editor.
const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v, expected) => object(v) && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const text = (v, min, max, line = false) => typeof v === 'string' && v.trim().length >= min && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v) && (!line || !/[\r\n]/.test(v));

export function checkedInitialCommunityChannels(value) {
  if (!Array.isArray(value) || value.length > 8 || value.some(c => !keys(c, ['name', 'description']) || !text(c.name, 1, 32, true) || !text(c.description, 0, 160))) throw new Error('Use up to 8 channels, each with a name of 1–32 characters and a description of up to 160 characters.');
  const channels = value.map(c => ({name: c.name.trim(), description: c.description.trim()}));
  if (new Set(channels.map(c => c.name.toLowerCase())).size !== channels.length) throw new Error('Use distinct channel names.');
  return channels;
}

export function checkedCommunityTemplate(value) {
  if (!keys(value, ['name', 'description', 'visibility', 'tags', 'rules', 'channels'])) throw new Error('This community template contains missing or unsupported fields.');
  if (!text(value.name, 3, 64, true) || !text(value.description, 0, 180)) throw new Error('Use a community name of 3–64 characters and a description of up to 180 characters.');
  if (!['Public', 'Request only', 'Private'].includes(value.visibility)) throw new Error('Choose Public, Request only or Private community access.');
  if (!Array.isArray(value.tags) || value.tags.length > 3 || value.tags.some(t => !text(t, 1, 24, true) || t.includes(',')) || new Set(value.tags.map(t => t.trim().toLowerCase())).size !== value.tags.length) throw new Error('Use up to 3 different community tags of 24 characters each, without commas or line breaks.');
  if (!Array.isArray(value.rules) || !value.rules.length || value.rules.length > 8 || value.rules.some(r => !text(r, 1, 180, true))) throw new Error('Add 1–8 community rules, one line each, with up to 180 characters per rule.');
  return {name: value.name.trim(), description: value.description.trim(), visibility: value.visibility, tags: value.tags.map(t => t.trim()), rules: value.rules.map(r => r.trim()), channels: checkedInitialCommunityChannels(value.channels)};
}
