import { expect, it } from "vitest";
import catalog from "../cloud/shared/preferences-catalog.json";
import { configuredPreferenceGroups, preferenceMatchesSearch } from "../src/cloud/preference-model";

it("ships a unique, versioned, categorized adult catalog with accountable sources", () => {
  expect(catalog.version).toMatch(/^\d{4}\.\d{2}\.\d{2}-\d+$/);
  const ids = catalog.items.map(i => i.id), labels = catalog.items.map(i => i.label.toLocaleLowerCase());
  expect(new Set(ids).size).toBe(ids.length); expect(new Set(labels).size).toBe(labels.length);
  const sources = new Set(catalog.sources.map(s => s.id));
  const categories = [
    "Dynamics", "Bondage & Restraints", "Impact & Pain", "Control", "Psychological",
    "Roleplay", "Sensory", "Fetishes", "Physical / Sexual", "Exhibition / Attention", "Edge / Taboo",
  ];
  for (const item of catalog.items) {
    expect(item.id).toMatch(/^[a-z][a-z0-9.-]{1,79}$/); expect(categories).toContain(item.category);
    expect(item.sources.length).toBeGreaterThan(0); for (const ref of item.sources) expect(sources.has(ref.split(":")[0]!)).toBe(true);
    expect(new Set(item.aliases).size).toBe(item.aliases.length); expect(catalog.retiredIds).not.toContain(item.id);
  }
  expect(new Set(catalog.items.map(item => item.category))).toEqual(new Set(categories));
  expect(catalog.items.filter(item => item.popular).length).toBeGreaterThanOrEqual(20);
  expect(catalog.items.filter(item => item.popular).length).toBeLessThanOrEqual(30);
  expect(catalog.items.filter(item => item.category === "Edge / Taboo").every(item => item.edge)).toBe(true);
  expect(catalog.audience).toBe("Consenting adults only");
  expect(catalog.items.filter(i => i.sources.some(s => s.startsWith("bc-fetishes:")))).toHaveLength(19);
  for (const activity of catalog.items.filter(i => i.id.endsWith(".giving"))) expect(ids).toContain(activity.id.replace(/\.giving$/, ".receiving"));
});

it("places the requested additions in their categories and beside related entries", () => {
  const additions = {
    "Maledom": "Dynamics", "Femdom": "Dynamics", "Lezdom": "Dynamics", "Futanari": "Fetishes",
    "ABDL": "Roleplay", "Foxy Play": "Roleplay", "Transformation": "Roleplay", "Magic": "Roleplay", "Sci-fi": "Roleplay",
    "Stuffing Gags": "Bondage & Restraints", "Nose Hooks": "Bondage & Restraints",
    "Smell Play": "Sensory", "Sweat": "Sensory",
    "Body Modification": "Fetishes", "Socks": "Fetishes",
    "Milking": "Physical / Sexual", "Spitting": "Physical / Sexual",
    "Watersports": "Edge / Taboo", "Scat": "Edge / Taboo", "Race Play": "Edge / Taboo",
  };
  for (const [label, category] of Object.entries(additions)) {
    const items = catalog.items.filter(item => item.label === label);
    expect(items).toHaveLength(1);
    expect(items[0]!.category).toBe(category);
    expect(items[0]!.popular).not.toBe(true);
  }
  const labels = catalog.items.map(item => item.label);
  for (const group of [
    ["Dominance", "Maledom", "Femdom", "Lezdom", "Submission"],
    ["Puppy Play", "Kitty Play", "Foxy Play", "Pony Play"],
    ["Panel gags", "Stuffing Gags", "Muzzles", "Nose Hooks"],
    ["Magic", "Sci-fi", "Transformation", "Dollification"],
    ["Smell Play", "Sweat"], ["Stockings / Tights", "Socks"],
    ["Breast Play", "Milking"], ["Watersports", "Scat"],
  ]) expect(labels.slice(labels.indexOf(group[0]!), labels.indexOf(group[0]!) + group.length)).toEqual(group);
});

it("finds the new preferences by common names without conflating Femdom and Lezdom", () => {
  for (const [id, alias] of [["dynamics.maledom", "male dominance"], ["dynamics.femdom", "female dominance"],
    ["dynamics.lezdom", "lesbian dominance"], ["fetish.futanari", "futa"]]) {
    const item = catalog.items.find(item => item.id === id)!;
    expect(preferenceMatchesSearch(item, alias!)).toBe(true);
    expect(configuredPreferenceGroups({ [id!]: "love" })[0]!.items[0]!.id).toBe(id);
  }
});

it("renames display labels without losing saved ratings or searches for the previous names", () => {
  const changes = [
    ["roleplay.kidnap-fantasy", "Kidnapping", "Kidnap Fantasy"],
    ["interest.hypnosis", "Hypnosis", "Consensual Hypnosis Roleplay"],
    ["edge.cnc-fantasy", "CNC", "CNC Fantasy"],
    ["edge.forced-fantasy", "Forced Play", "Forced Fantasy"],
    ["edge.somnophilia-fantasy", "Somnophilia", "Somnophilia Fantasy"],
  ] as const;
  for (const [id, label, previous] of changes) {
    const item = catalog.items.find(item => item.id === id)!;
    expect(item.label).toBe(label);
    expect(preferenceMatchesSearch(item, previous)).toBe(true);
    expect(configuredPreferenceGroups({ [id]: "love" })[0]!.items[0]!.label).toBe(label);
  }
  expect(catalog.items.some(item => /fantasy/i.test(item.label))).toBe(false);
});
