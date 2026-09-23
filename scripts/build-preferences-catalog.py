#!/usr/bin/env python3
"""Build KikiLink's bundled, stable-ID preference catalogue.

The generated JSON deliberately keeps every ID from the first private prototype so
saved profiles continue to load without a data migration. New labels and aliases
are presentation/search metadata; user records only store the stable IDs.
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "cloud/shared/preferences-catalog.json"


def main() -> None:
    previous = json.loads(CATALOG.read_text())
    old = {item["id"]: item for item in previous["items"]}
    items: list[dict] = []
    seen: set[str] = set()

    def add(
        category: str,
        preference_id: str,
        label: str,
        aliases: tuple[str, ...] = (),
        *,
        popular: bool = False,
        edge: bool = False,
    ) -> None:
        if preference_id in seen:
            raise ValueError(f"duplicate preference id: {preference_id}")
        seen.add(preference_id)
        prior = old.get(preference_id, {})
        previous_label = (prior["label"],) if prior.get("label") and prior["label"] != label else ()
        merged_aliases = list(dict.fromkeys([*aliases, *prior.get("aliases", []), *previous_label]))
        item = {
            "id": preference_id,
            "label": label,
            "category": category,
            "aliases": merged_aliases,
            "sources": prior.get("sources", ["kikilink-curated"]),
        }
        if popular:
            item["popular"] = True
        if edge:
            item["edge"] = True
        items.append(item)

    # Fast setup: common preferences are marked popular, while all categories stay
    # available through the advanced browser.
    for args in [
        ("dynamics.dominance", "Dominance", ("dominant", "dom"), True),
        ("dynamics.maledom", "Maledom", ("male dominance", "male dom", "maledom"), False),
        ("dynamics.femdom", "Femdom", ("female dominance", "female dom", "femdom"), False),
        ("dynamics.lezdom", "Lezdom", ("lesbian dominance", "lesbian dom", "lezdom"), False),
        ("dynamics.submission", "Submission", ("submissive", "sub"), True),
        ("dynamics.switching", "Switching", ("switch",), True),
        ("dynamics.power-exchange", "Power Exchange", ("D/s", "power dynamic"), False),
        ("dynamics.service-submission", "Service Submission", ("service sub",), False),
        ("dynamics.ownership", "Ownership", ("owned",), False),
        ("dynamics.master-slave", "Master / Slave Dynamic", ("M/s", "master slave"), False),
        ("dynamics.owner-pet", "Owner / Pet Dynamic", ("owner pet",), False),
        ("dynamics.rules-protocol", "Rules / Protocol", ("protocol", "rules"), False),
        ("dynamics.obedience", "Obedience", (), False),
        ("dynamics.brat-taming", "Brat / Brat Taming", ("brat", "brat tamer"), False),
        ("dynamics.total-power-exchange", "Total Power Exchange", ("TPE",), False),
        ("interest.aftercare", "Aftercare", ("scene care",), False),
        ("role.leading", "Leading a Consensual Scene", ("taking the lead",), False),
        ("role.following", "Following in a Consensual Scene", ("following",), False),
    ]:
        add("Dynamics", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("interest.bondage", "Bondage", ("restraint",), True),
        ("interest.rope", "Rope Bondage", ("rope play", "rope restraint"), True),
        ("restraint.shibari", "Shibari", ("Japanese rope", "kinbaku"), False),
        ("restraint.cuffs", "Cuffs", ("wrist cuffs", "leather cuffs"), True),
        ("restraint.handcuffs", "Handcuffs", ("metal cuffs",), False),
        ("restraint.ankle-cuffs", "Ankle Cuffs", ("ankle restraints",), False),
        ("restraint.elbow-cuffs", "Elbow Cuffs", ("elbow restraints",), False),
        ("restraint.chains", "Chains", (), False),
        ("restraint.shackles", "Shackles", ("leg irons",), False),
        ("restraint.collar", "Collars", ("collaring",), True),
        ("restraint.leash", "Leashes", (), False),
        ("interest.blindfold", "Blindfolds", ("eye covering",), True),
        ("interest.gagged", "Gags", ("being gagged", "mouth restraint"), True),
        ("restraint.ball-gag", "Ball gags", (), False),
        ("restraint.bit-gag", "Bit gags", (), False),
        ("restraint.ring-gag", "Ring gags", (), False),
        ("restraint.panel-gag", "Panel gags", (), False),
        ("restraint.stuffing-gags", "Stuffing Gags", ("stuffing gag", "mouth stuffing"), False),
        ("restraint.muzzle", "Muzzles", (), False),
        ("restraint.nose-hooks", "Nose Hooks", ("nose hook",), False),
        ("restraint.hood", "Hoods", ("bondage hood",), False),
        ("restraint.harness", "Harnesses", ("body harness",), False),
        ("restraint.spreader", "Spreader Bars", ("spreader bar",), False),
        ("restraint.armbinder", "Armbinders", ("arm binder",), False),
        ("restraint.monoglove", "Monogloves", ("monoglove",), False),
        ("restraint.mittens", "Bondage Mittens", ("restraint mittens",), False),
        ("restraint.straitjacket", "Straitjackets", ("straightjacket",), False),
        ("restraint.stocks", "Stocks", (), False),
        ("restraint.yoke", "Yokes", ("bondage yoke",), False),
        ("restraint.tethering", "Tethering", ("tied to a point",), False),
        ("restraint.immobilization", "Immobilization", ("immobile",), False),
        ("restraint.hogtie", "Hogtie", ("hog tie",), False),
        ("restraint.frogtie", "Frogtie", ("frog tie",), False),
        ("restraint.mummification", "Mummification", ("wrap bondage",), False),
        ("restraint.confinement", "Confinement", ("confined",), False),
        ("restraint.cages", "Cage", ("confinement cage",), False),
        ("interest.suspension", "Suspension", ("rope suspension",), False),
        ("restraint.predicament", "Predicament Bondage", ("predicament rope",), False),
        ("restraint.full-body", "Full-body Bondage", ("full body restraint",), False),
        ("restraint.full-body-rope", "Full-body Rope", ("rope body harness",), False),
    ]:
        add("Bondage & Restraints", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("impact.spanking", "Spanking", ("spank",), True),
        ("impact.general", "Impact Play", ("impact",), True),
        ("impact.caning", "Caning", ("cane",), False),
        ("impact.whipping", "Whipping", ("whip",), False),
        ("interest.flogging", "Flogging", ("flogger",), False),
        ("impact.pain", "Pain Play", ("pain",), False),
        ("impact.biting", "Biting", ("bite",), False),
        ("impact.scratching", "Scratching", ("scratch",), False),
        ("impact.pinching", "Pinching", ("pinch",), False),
        ("interest.sadism", "Sadism", ("giving consensual pain",), False),
        ("interest.masochism", "Masochism", ("receiving consensual pain",), False),
    ]:
        add("Impact & Pain", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("interest.orgasm-control", "Orgasm Control", ("climax control",), True),
        ("control.orgasm-denial", "Orgasm Denial", ("denial",), False),
        ("control.edging", "Edging", ("edge",), True),
        ("interest.chastity", "Chastity", ("chastity devices",), True),
        ("control.permission", "Permission Control", ("asking permission",), False),
        ("interest.speech", "Speech Control", ("speech rules",), False),
        ("control.clothing", "Clothing Control", ("outfit control",), False),
        ("control.posture", "Posture Control", ("position control",), False),
        ("control.commands", "Commands", ("orders",), False),
        ("control.reward-punishment", "Reward / Punishment", ("rewards", "punishment"), False),
    ]:
        add("Control", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("interest.praise", "Praise", ("positive reinforcement",), True),
        ("psych.humiliation", "Humiliation", ("humiliation play",), True),
        ("psych.degradation", "Degradation", ("degrading language",), True),
        ("psych.objectification", "Objectification", ("object play",), False),
        ("interest.begging", "Begging", ("begging roleplay",), False),
        ("psych.fear", "Fear Play", ("scare play",), False),
        ("psych.mind-games", "Mind Games", ("psychological play",), False),
        ("psych.ritual", "Ritual / Ceremony", ("ceremony",), False),
        ("interest.discipline", "Consensual Discipline", ("discipline",), False),
        ("interest.hypnosis", "Hypnosis", ("consensual hypnosis roleplay",), False),
    ]:
        add("Psychological", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("roleplay.general", "Roleplay", ("role play",), True),
        ("interest.pet-role", "Pet Play", ("petplay", "pet roleplay"), True),
        ("roleplay.puppy", "Puppy Play", ("puppyplay",), False),
        ("roleplay.kitty", "Kitty Play", ("cat play", "kittyplay"), False),
        ("roleplay.foxy", "Foxy Play", ("fox play", "fox roleplay", "foxyplay"), False),
        ("interest.pony-role", "Pony Play", ("ponyplay", "pony roleplay"), False),
        ("roleplay.abdl", "ABDL", ("adult baby diaper lover", "adult-only roleplay", "diaper lover"), False),
        ("roleplay.captor-prisoner", "Captor / Prisoner", ("prisoner roleplay",), False),
        ("roleplay.kidnap-fantasy", "Kidnapping", ("consensual kidnap roleplay", "kidnap"), False),
        ("roleplay.interrogation", "Interrogation", ("interrogation roleplay",), False),
        ("roleplay.medical", "Medical Roleplay", ("doctor roleplay",), False),
        ("roleplay.maid-servant", "Maid / Servant", ("maid roleplay", "servant roleplay"), False),
        ("roleplay.authority", "Authority Roleplay", ("authority figure",), False),
        ("roleplay.magic", "Magic", ("magical roleplay", "spell roleplay"), False),
        ("roleplay.sci-fi", "Sci-fi", ("science fiction", "sci fi", "scifi"), False),
        ("roleplay.transformation", "Transformation", ("transformation roleplay", "shapeshifting"), False),
        ("roleplay.dollification", "Dollification", ("doll play",), False),
        ("interest.furniture", "Human Furniture", ("human furniture roleplay", "forniphilia"), False),
        ("interest.object-role", "Object Roleplay", ("object play",), False),
        ("interest.story", "Story-focused Roleplay", ("story roleplay",), False),
        ("interest.nonsexual", "Nonsexual Roleplay", ("non-sexual roleplay",), False),
    ]:
        add("Roleplay", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("interest.sensory", "Sensory Play", ("sensation play",), True),
        ("sensory.smell", "Smell Play", ("scent play", "olfactophilia", "odour", "odor"), False),
        ("sensory.sweat", "Sweat", ("sweat fetish", "body scent"), False),
        ("sensory.deprivation", "Sensory Deprivation", ("sensory restriction",), False),
        ("sensory.blindfold", "Blindfold Play", ("blindfold scene",), False),
        ("interest.wax", "Wax Play", ("candle wax",), False),
        ("interest.ice", "Ice / Cold Play", ("ice play", "cold play"), False),
        ("sensory.temperature", "Temperature Play", ("hot and cold",), False),
        ("sensory.tickling", "Tickling", ("tickle",), False),
        ("interest.hearing", "Hearing Restriction", ("earplugs", "deafness play"), False),
        ("interest.electric", "Electrical Sensation", ("electrostimulation",), False),
    ]:
        add("Sensory", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("fetish.futanari", "Futanari", ("futa", "futas"), False),
        ("fetish.feet", "Foot Fetish", ("feet",), True),
        ("fetish.foot-worship", "Foot Worship", ("feet worship",), False),
        ("fetish.body-worship", "Body Worship", ("worship",), False),
        ("fetish.body-modification", "Body Modification", ("body mods", "piercings", "tattoos"), False),
        ("fetish.boots", "Boot Fetish", ("boots",), False),
        ("fetish.high-heels", "High Heels", ("heels",), False),
        ("interest.leather", "Leather", ("leather fetish",), True),
        ("interest.latex", "Latex", ("latex fetish",), True),
        ("fetish.rubber", "Rubber", ("rubber fetish",), False),
        ("fetish.pvc", "PVC", ("vinyl fetish",), False),
        ("interest.nylon", "Stockings / Tights", ("nylon", "stockings", "tights"), False),
        ("fetish.socks", "Socks", ("sock fetish",), False),
        ("interest.lingerie", "Lingerie", ("underwear",), False),
        ("interest.uniforms", "Uniforms", ("uniform fetish",), False),
        ("fetish.gloves", "Gloves", ("glove fetish",), False),
        ("restraint.corset", "Corsets", ("corset fetish",), False),
        ("restraint.masks", "Masks", ("mask fetish",), False),
    ]:
        add("Fetishes", args[0], args[1], args[2], popular=args[3])

    for args in [
        ("physical.rough", "Rough Play", ("rough sex",), False),
        ("physical.primal", "Primal Play", ("primal",), True),
        ("physical.wrestling", "Wrestling / Grappling", ("wrestling", "grappling"), False),
        ("physical.spitting", "Spitting", ("spit play",), False),
        ("physical.facesitting", "Facesitting", ("face sitting",), False),
        ("physical.nipple", "Nipple Play", ("nipple stimulation",), False),
        ("physical.breast", "Breast Play", ("breasts",), False),
        ("physical.milking", "Milking", ("milking play",), False),
        ("physical.ass-worship", "Ass Worship", ("butt worship",), False),
        ("physical.toys", "Toys", ("sex toys",), False),
        ("physical.vibrators", "Vibrators", ("vibrator",), False),
        ("physical.remote-toys", "Remote-controlled Toys", ("remote toys", "app controlled toys"), False),
    ]:
        add("Physical / Sexual", args[0], args[1], args[2], popular=args[3])

    add("Exhibition / Attention", "interest.exhibition", "Exhibitionism", ("consensual exhibition", "being seen"))
    add("Exhibition / Attention", "attention.voyeurism", "Voyeurism", ("consensual watching",))

    for preference_id, label, aliases in [
        ("edge.cnc-fantasy", "CNC", ("consensual non-consent", "consensual non-consent fantasy")),
        ("edge.resistance", "Resistance Play", ("consensual resistance",)),
        ("edge.forced-fantasy", "Forced Play", ("consensual forced roleplay",)),
        ("edge.somnophilia-fantasy", "Somnophilia", ("pre-negotiated sleep roleplay",)),
        ("edge.race-play", "Race Play", ("consensual racial roleplay",)),
        ("edge.watersports", "Watersports", ("water sports", "urine play", "golden showers")),
        ("edge.scat", "Scat", ("scat play",)),
        ("edge.knife", "Knife Play", ("blades",)),
        ("edge.blood", "Blood Play", ("blood",)),
        ("edge.needle", "Needle Play", ("needles",)),
        ("edge.fire", "Fire Play", ("flame play",)),
        ("edge.breath", "Breath Play", ("breath control",)),
        ("edge.extreme-impact", "Extreme Impact", ("heavy impact",)),
        ("edge.torture-roleplay", "Torture Roleplay", ("consensual torture fantasy",)),
        ("edge.extreme-humiliation", "Extreme Humiliation", ("heavy humiliation",)),
        ("edge.extreme-immobilization", "Extreme Immobilization", ("heavy immobilization",)),
        ("edge.heavy-sensory-deprivation", "Heavy Sensory Deprivation", ("extreme sensory deprivation",)),
    ]:
        add("Edge / Taboo", preference_id, label, aliases, edge=True)

    # Keep the more specific first-catalogue entries as advanced options. They are
    # directional or equipment-specific rather than duplicate names.
    category_for_old = {
        "Fetishes": "Fetishes",
        "Restraints": "Bondage & Restraints",
        "Kinks": "Physical / Sexual",
    }
    labels = {item["label"].casefold() for item in items}
    for prior in previous["items"]:
        if prior["id"] in seen or prior["label"].casefold() in labels:
            continue
        copy = dict(prior)
        copy["category"] = category_for_old.get(copy["category"], copy["category"])
        items.append(copy)
        seen.add(copy["id"])
        labels.add(copy["label"].casefold())

    missing = set(old) - seen
    if missing:
        raise ValueError(f"saved catalogue IDs were lost: {sorted(missing)}")

    sources = previous["sources"]
    if not any(source.get("id") == "kikilink-curated" for source in sources):
        sources.append({
            "id": "kikilink-curated",
            "description": "KikiLink consenting-adult preference taxonomy",
            "checked": "2026-09-19",
        })
    output = {
        "version": "2026.09.23-1",
        "audience": "Consenting adults only",
        "sources": sources,
        "retiredIds": previous["retiredIds"],
        "items": items,
    }
    CATALOG.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(items)} preferences; preserved {len(old)} original IDs")


if __name__ == "__main__":
    main()
