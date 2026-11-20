import {checkedWorkshopSource} from './workshop-source.mjs';
// Incomplete editor snapshots shared by local autosave and private Cloud sync.
const WORKSHOP_TYPES = ["Activity pack", "Profile theme", "Status & emoji", "Room preset", "Background", "UI theme", "Community template"];
const workshopId = (value) => typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const workshopVersion = (value) => typeof value === "string" && /^(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})\.(0|[1-9]\d{0,2})$/.test(value);
function newWorkshopDraft(type = "Activity pack") {
  if (!WORKSHOP_TYPES.includes(type)) throw new Error("This creation type is no longer supported.");
  return { type, title: "", summary: "", description: "", visibility: "public", tags: [], version: "1.0.0", changelog: "", payload: type === "Community template" ? { name: "", description: "", visibility: "Public", tags: [], rules: [""], channels: [{ name: "General", description: "" }] } : type === "Room preset" ? { name: "", description: "", background: "Lounge", capacity: 12 } : type === "Background" ? { background: "Garden", primary: "#193c2c", secondary: "#101d17" } : type === "UI theme" ? { primary: "#111113", secondary: "#19191c", accent: "#d71932", density: "Compact" } : type === "Activity pack" ? { activities: [{ id: crypto.randomUUID(), title: "", text: "", target: "Other" }] } : type === "Profile theme" ? { profileStyle: "classic", gradient: { primary: "#d2a6ba", secondary: "#8d9ac4", angle: 135 }, decoration: { mode: "none", preset: "blossom", primary: "#d2a6ba", secondary: "#8d9ac4", angle: 135 } } : { statuses: [{ text: "", icon: "heart" }], emojis: [] } };
}
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v, allowed) => Object.keys(v).every((k) => allowed.includes(k));
const string = (v, max = 4e3) => typeof v === "string" && v.length <= max;
const exact = (v, allowed) => object(v) && Object.keys(v).length === allowed.length && keys(v, allowed);
const finite = (v) => typeof v === "number" && Number.isFinite(v);
function shape(value, sample, depth = 0) {
  if (depth > 12) return false;
  if (typeof sample === "string") return string(value);
  if (typeof sample === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof sample === "boolean") return typeof value === "boolean";
  if (sample === null) return value === null;
  if (Array.isArray(sample)) return Array.isArray(value) && value.length <= 32 && value.every((v) => shape(v, sample[0], depth + 1));
  if (!object(value) || !object(sample) || Object.keys(value).length !== Object.keys(sample).length) return false;
  return Object.keys(sample).every((k) => Object.hasOwn(value, k) && shape(value[k], sample[k], depth + 1));
}
function payload(type, value) {
  const sample = newWorkshopDraft(type).payload;
  if (type === "Community template") sample.tags = [""];
  if (type === "Status & emoji") sample.emojis = [{ label: "", symbol: "" }];
  if (type === 'Room preset' && object(value) && Object.hasOwn(value, 'restoreOnOpen')) sample.restoreOnOpen = true;
  if (!shape(value, sample)) throw new Error();
}
function checkedLocalWorkshopDraft(value) {
  try {
    if (!object(value) || !keys(value, ["id", "context", "draft", "variants", "step"]) || !workshopId(value.id) || ![1, 2, 3].includes(value.step) || !object(value.context) || !keys(value.context, ["fixedType", "packageId", "revision", "remix", "source"])) throw new Error();
    const c = value.context;
    if(c.source!==undefined)checkedWorkshopSource(c.source);
    if (typeof c.fixedType !== "boolean") throw new Error();
    if (c.packageId !== null && (!workshopId(c.packageId) || !Number.isSafeInteger(c.revision) || c.revision <= 0) || c.packageId === null && c.revision !== null) throw new Error();
    if (c.remix !== null && (!object(c.remix) || !keys(c.remix, ["id", "version"]) || !workshopId(c.remix.id) || !workshopVersion(c.remix.version) || c.packageId !== null)) throw new Error();
    const d = value.draft;
    if (!object(d) || !keys(d, ["type", "title", "summary", "description", "visibility", "tags", "version", "changelog", "payload", "deps"]) || !WORKSHOP_TYPES.includes(d.type) || !string(d.title, 80) || !string(d.summary, 180) || !string(d.description, 1200) || !string(d.version, 11) || !string(d.changelog, 600) || !["public", "unlisted"].includes(d.visibility) || !Array.isArray(d.tags) || d.tags.length > 180 || d.tags.some((t) => !string(t, 180))) throw new Error();
    if (d.deps !== void 0 && (!Array.isArray(d.deps) || d.deps.length > 4 || d.deps.some((dep) => !object(dep) || !keys(dep, ["id", "minVersion"]) || !string(dep.id, 36) || !string(dep.minVersion, 11)))) throw new Error();
    payload(d.type, d.payload);
    if (!object(value.variants) || Object.keys(value.variants).length > 9) throw new Error();
    for (const [type, p] of Object.entries(value.variants)) {
      if (["Scene pack", "Automation preset"].includes(type)) continue;
      if (!WORKSHOP_TYPES.includes(type)) throw new Error();
      payload(type, p);
    }
    if (JSON.stringify(value).length > 262144) throw new Error();
    return structuredClone(value);
  } catch {
    throw new Error("This local draft contains unsupported or oversized data. It has been kept unchanged.");
  }
}
const workshopDraftValue = (value) => JSON.stringify(value, (_key, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v);
export {
  WORKSHOP_TYPES,
  checkedLocalWorkshopDraft,
  newWorkshopDraft,
  workshopDraftValue,
  workshopId,
  workshopVersion
};
