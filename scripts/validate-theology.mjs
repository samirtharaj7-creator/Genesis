// Doctrinal, attribution, and public-language safeguards for this study.
// Usage: node scripts/validate-theology.mjs [--allow-pending-review] [--only "1 Peter 3"]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const site = JSON.parse(readFileSync(join(root, "scripts", "site.json"), "utf8"));
const allowPending = process.argv.includes("--allow-pending-review");
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex > -1 ? process.argv[onlyIndex + 1] : null;
const errors = [];
const verses = new Map();
const assert = (condition, message) => { if (!condition) errors.push(message); };

const prohibitedPublicPatterns = [
  { label: "URL", pattern: /https?:\/\/|\bwww\./iu },
  { label: "research-process language", pattern: /\b(?:uploaded|research corpus|research library|source audit|source trail|bibliograph(?:y|ic)|footnotes?|endnotes?|search results?)\b/iu },
  { label: "editorial-process language", pattern: /\b(?:humanization|public prose|sounds? human|machine[- ]generated|formulaic|editorial (?:pass|note|language)|drafting process|as an AI|language model)\b/iu },
  { label: "source attribution", pattern: /\baccording to (?:the )?(?:commentator|scholar|author|researcher)s?\b|\b(?:one|some|many|most) (?:commentators?|scholars?) (?:say|says|note|notes|argue|argues|suggest|suggests)\b/iu },
  { label: "denominational self-label", pattern: /\b(?:Seventh[- ]day Adventist|Adventists?|SDA)\b/iu },
  { label: "page locator", pattern: /\bpp?\.\s*\d+/iu }
];

const privateNames = new Set(["Weima", "Beale", "Stott", "Malherbe", "Knight", "Guthrie", "Plummer", "Perkins", "Kostenberger", "Köstenberger", "Moo", "Witherington", "Jobes", "Samra", "Bauckham", "deSilva", "Painter", "McKnight", "Akin", "Howell", "Marshall", "Wright", "Mbuvi", "Chester", "Davids", "Webb", "Nystrom", "Reapsome", "Bird", "Merida", "Wilder", "Doukhan", "Waltke", "Fredricks", "Hamilton", "Wenham", "Collins", "Kaiser", "Hays", "Morales", "Gane", "Houston", "Greidanus", "Holbrook", "Davidson", "Budd", "Rogerson", "Millar", "Walton", "Enns", "Sailhamer", "Brueggemann", "Provan", "Fretheim", "Johnstone", "Ouro", "Treiyer"]);

function auditText(label, value) {
  const text = String(value ?? "");
  for (const { label: name, pattern } of prohibitedPublicPatterns) assert(!pattern.test(text), `${label} contains prohibited ${name}.`);
  for (const name of privateNames) assert(!new RegExp(`\\b${name}(?:['’]s)?\\b`, "u").test(text), `${label} exposes a private source name (${name}).`);
}
function auditValue(label, value) {
  if (typeof value === "string") return auditText(label, value);
  if (Array.isArray(value)) return value.forEach((entry, index) => auditValue(`${label}[${index}]`, entry));
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "sources" || key === "sourceAudit" || key === "bibleText" || key === "verse") continue;
    auditValue(`${label}.${key}`, entry);
  }
}

let expected = 0;
for (const book of site.books) {
  expected += book.verseCounts.reduce((a, b) => a + b, 0);
  const dir = join(root, "content", book.slug);
  for (const file of readdirSync(dir).filter((entry) => entry.endsWith(".json")).sort()) {
    const chapter = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const chapterLabel = `${book.name} ${chapter.chapterNumber}`;
    if (only && only !== chapterLabel) continue;
    auditValue(chapterLabel, chapter);
    for (const verse of chapter.verses ?? []) {
      const text = [verse.commentary?.detailedExplanation ?? "", ...(verse.wordNotes ?? []).map((n) => n.explanation)].join("\n");
      verses.set(verse.verse, text);
      assert((verse.commentary?.detailedExplanation ?? "").trim().length > 0, `${verse.verse} is missing detailed commentary.`);
      if (!allowPending) assert(verse.reviewStatus === "verified-seed", `${verse.verse} has not completed the theological review.`);
      assert(Array.isArray(verse.sources) && verse.sources.length === 0, `${verse.verse} must not expose sources.`);
      for (const [field, entries] of Object.entries(verse.sourceAudit ?? {})) assert(Array.isArray(entries) && entries.length === 0, `${verse.verse}.sourceAudit.${field} must remain empty.`);
      assert((verse.wordNotes ?? []).length <= 2, `${verse.verse} has more than two word notes.`);
    }
  }
}
if (!only) {
  if (existsSync(join(root, "content", "background.json"))) auditValue("Introduction", JSON.parse(readFileSync(join(root, "content", "background.json"), "utf8")));
  assert(verses.size === expected, `Expected ${expected} verses; found ${verses.size}.`);
}

function requirePatterns(reference, requirements) {
  if (!verses.has(reference)) return;
  const text = verses.get(reference);
  for (const { label, pattern } of requirements) assert(pattern.test(text), `${reference} is missing the required ${label} safeguard.`);
}
function forbid(reference, label, pattern) {
  if (!verses.has(reference)) return;
  assert(!pattern.test(verses.get(reference)), `${reference} ${label}.`);
}

const NEG = String.raw`\b(?:not|no|never|nor|neither|does not|doesn['’]t|cannot|rather than|instead of|without)\b`;
const near = (a, b, span = 160) => new RegExp(`${a}[^.]{0,${span}}${b}|${b}[^.]{0,${span}}${a}`, "iu");

const deathSleep = [
  { label: "death as sleep", pattern: /\b(?:sleep|asleep|sleeping|unconscious)\b/iu },
  { label: "resurrection hope", pattern: /\bresurrection\b|\braised?\b|\brise\b/iu },
  { label: "rejection of conscious disembodied survival", pattern: near(NEG, String.raw`(?:conscious|immortal soul|disembodied|innate immortality|already in heaven|ascend(?:ed|s)? to heaven at death)`) }
];
const visibleReturn = [
  { label: "literal, visible return", pattern: /\b(?:visible|audible|literal|personal|bodily|every eye|public|seen)\b/iu },
  { label: "no secret rapture", pattern: /\bsecret\b|\bsilent\b|\bunseen\b|\binvisible\b/iu }
];

// ---- Thessalonians ----
for (const ref of ["1 Thessalonians 4:13", "1 Thessalonians 4:14", "1 Thessalonians 4:15"]) requirePatterns(ref, deathSleep);
for (const ref of ["1 Thessalonians 4:16", "1 Thessalonians 4:17"]) requirePatterns(ref, visibleReturn);
requirePatterns("1 Thessalonians 4:16", [{ label: "resurrection at the coming", pattern: /\bresurrection\b|\brise\b|\braised\b/iu }]);
requirePatterns("1 Thessalonians 5:2", [{ label: "thief image as unexpectedness, not secrecy", pattern: /\b(?:unexpected|suddenly|sudden|unprepared|surprise)\w*/iu }]);
requirePatterns("1 Thessalonians 5:23", [{ label: "whole-person unity", pattern: /\b(?:whole person|whole being|entire person|unity|integrated|not (?:three )?separ\w+|holistic)\b/iu }]);
requirePatterns("2 Thessalonians 1:9", [{ label: "final destruction rather than endless torment", pattern: /\b(?:destruction|destroyed|ruin|cease|end)\b/iu }]);
requirePatterns("2 Thessalonians 2:3", [
  { label: "apostasy within the church", pattern: /\b(?:apostasy|falling away|departure|rebellion)\b/iu }
]);
requirePatterns("2 Thessalonians 2:4", [
  { label: "historicist identification", pattern: /\bpap(?:al|acy)\b/iu },
  { label: "system rather than individuals", pattern: /\b(?:system|power|institution)\b/iu },
  { label: "charity toward individuals", pattern: near(NEG, String.raw`(?:individual|sincere|believers|members|people|Catholic)`, 220) }
]);
requirePatterns("2 Thessalonians 2:8", [{ label: "destruction at Christ's coming", pattern: /\b(?:coming|appearing|return|brightness)\b/iu }]);

// ---- Timothy, Titus, Philemon ----
requirePatterns("1 Timothy 2:12", [
  { label: "situational context", pattern: /\b(?:context|situation|Ephesus|false teach\w*|disrupt\w*)\b/iu },
  { label: "measured application", pattern: near(NEG, String.raw`(?:universal|absolute|all women|every woman|silent|all ministry)`, 200) }
]);
for (const ref of ["1 Timothy 4:3", "1 Timothy 4:4", "1 Timothy 4:5"]) requirePatterns(ref, [
  { label: "clean-and-unclean distinction", pattern: /\bclean\b|\bunclean\b|Leviticus 11/iu }
]);
requirePatterns("1 Timothy 4:5", [{ label: "sanctified by God's word", pattern: /\bword of God\b|\bScripture\b/iu }]);
requirePatterns("1 Timothy 6:16", [{ label: "conditional immortality", pattern: /\b(?:immortality|deathless)\b[^.]{0,200}\b(?:God alone|only God|gift|not (?:natural|innate|inherent))\b|\b(?:innate|inherent|natural)\b[^.]{0,120}\bimmortal/iu }]);
requirePatterns("2 Timothy 3:16", [{ label: "divine inspiration of all Scripture", pattern: /\b(?:inspir\w+|God-breathed|breathed out by God|theopneustos)\b/iu }]);
requirePatterns("2 Timothy 4:8", [{ label: "reward at Christ's appearing", pattern: /\b(?:appearing|return|second coming|that day)\b/iu }]);
requirePatterns("2 Timothy 4:6", [{ label: "death awaiting resurrection", pattern: /\b(?:resurrection|appearing|that day|rest|sleep)\b/iu }]);
requirePatterns("Titus 2:13", [{ label: "blessed hope as visible return", pattern: /\b(?:visible|glorious|appearing|personal|literal)\b/iu }]);
requirePatterns("Titus 3:5", [{ label: "grace and new birth", pattern: /\bmercy\b|\bgrace\b/iu }, { label: "baptism safeguard", pattern: near(NEG, String.raw`(?:mechanical|automatic|ritual|ceremony|water itself|by itself)`, 200) }]);
requirePatterns("Philemon 1:16", [{ label: "gospel reshaping slavery", pattern: /\bbrother\b/iu }]);

// ---- Peter ----
requirePatterns("1 Peter 1:2", [{ label: "foreknowledge without arbitrary decree", pattern: /\bforeknow\w*/iu }]);
for (const ref of ["1 Peter 3:19", "1 Peter 3:20"]) requirePatterns(ref, [
  { label: "preaching through Noah", pattern: /\bNoah\b/iu },
  { label: "no descent to conscious spirits", pattern: near(NEG, String.raw`(?:descen\w+|hell|underworld|Hades|disembodied|second chance|after death)`, 220) }
]);
requirePatterns("1 Peter 4:6", [{ label: "gospel preached to those now dead while they lived", pattern: /\b(?:while (?:they )?(?:were )?(?:living|alive)|during (?:their|this) life|now dead|had died|before (?:their|they) died)\b/iu }]);
requirePatterns("1 Peter 3:21", [{ label: "baptism as response, not mechanism", pattern: /\b(?:conscience|answer|pledge|appeal|response)\b/iu }]);
requirePatterns("2 Peter 1:19", [{ label: "prophetic certainty", pattern: /\bprophe\w+/iu }]);
requirePatterns("2 Peter 1:21", [{ label: "Spirit-carried inspiration", pattern: /\b(?:Holy Spirit|Holy Ghost|Spirit)\b/iu }]);
requirePatterns("2 Peter 2:4", [{ label: "angels reserved unto judgment", pattern: /\bjudgment\b/iu }]);
requirePatterns("2 Peter 2:9", [{ label: "punishment at the judgment, not now", pattern: /\b(?:reserve\w*|kept|held|day of judgment|future)\b/iu }]);
requirePatterns("2 Peter 2:6", [{ label: "fire as complete destruction", pattern: /\b(?:ashes|destroy\w*|ruin|consum\w+)\b/iu }]);
requirePatterns("2 Peter 3:8", [{ label: "no date-setting", pattern: /\b(?:date|timetable|calculat\w*|formula|schedule)\b/iu }]);
for (const ref of ["2 Peter 3:10", "2 Peter 3:12", "2 Peter 3:13"]) requirePatterns(ref, [{ label: "new earth hope", pattern: /\bnew (?:heaven|earth|creation)\w*/iu }]);

// ---- John ----
requirePatterns("1 John 1:9", [{ label: "confession and cleansing", pattern: /\bconfess\w*/iu }]);
requirePatterns("1 John 2:1", [{ label: "Christ's heavenly advocacy", pattern: /\b(?:advocate|intercess\w+|intercede\w*|heavenly|High Priest|Father)\b/iu }]);
requirePatterns("1 John 2:2", [{ label: "atonement for the whole world", pattern: /\bwhole world\b|\bevery\w*\b|\ball (?:people|humanity)\b/iu }]);
requirePatterns("1 John 3:4", [
  { label: "law as continuing standard", pattern: /\blaw\b/iu },
  { label: "law not abolished", pattern: near(NEG, String.raw`(?:abolish\w*|obsolete|set aside|cancel\w*|irrelevant)`, 200) }
]);
requirePatterns("1 John 3:9", [{ label: "habitual sin, not sinless perfection claims", pattern: /\b(?:habitual|practice|pattern|continue\w*|go on)\b/iu }]);
requirePatterns("1 John 5:7", [
  { label: "textual note", pattern: /\bmanuscripts?\b/iu },
  { label: "Trinity grounded elsewhere", pattern: /\b(?:Matthew 28:19|2 Corinthians 13:14|Trinity|Godhead|Father, Son, and Holy Spirit)\b/iu }
]);
requirePatterns("1 John 5:13", [{ label: "present assurance", pattern: /\b(?:assurance|know|certain\w*|confidence)\b/iu }]);
requirePatterns("1 John 5:16", [{ label: "sin unto death explained pastorally", pattern: /\b(?:persistent|deliberate|reject\w*|refus\w*|hardened)\b/iu }]);
requirePatterns("2 John 1:7", [{ label: "incarnation confession", pattern: /\bflesh\b/iu }]);
requirePatterns("2 John 1:10", [{ label: "hospitality to teachers, not general courtesy", pattern: /\b(?:teacher|teaching|platform|endorse\w*|sponsor\w*|support\w*)\b/iu }]);

// ---- Jude ----
requirePatterns("Jude 1:7", [
  { label: "eternal fire as lasting result", pattern: /\b(?:result|consequence|effect|permanent|irreversible|ashes|destroy\w*)\b/iu },
  { label: "no unending conscious torment", pattern: near(NEG, String.raw`(?:still burning|burning (?:today|forever|now)|endless (?:torment|burning)|conscious torment|unending)`, 220) }
]);
requirePatterns("Jude 1:9", [{ label: "Moses's body and resurrection", pattern: /\b(?:resurrect\w*|raised?)\b/iu }, { label: "Michael identified with Christ", pattern: /\b(?:Christ|Son of God|Jesus)\b/iu }]);
requirePatterns("Jude 1:14", [{ label: "Enoch quotation handled carefully", pattern: /\b(?:Enoch|book of Enoch|1 Enoch|tradition)\b/iu }, { label: "no endorsement of the whole book", pattern: near(NEG, String.raw`(?:Scripture|canon\w*|inspired|endorse\w*|whole book|everything)`, 220) }]);
requirePatterns("Jude 1:24", [{ label: "God's keeping power", pattern: /\bkeep\w*|\bable\b/iu }]);

// ---- Genesis ----
requirePatterns("Genesis 1:5", [{ label: "literal evening-morning day", pattern: /\b(?:literal|24-hour|twenty-four-hour|ordinary|evening and (?:the )?morning)\b/iu }]);
requirePatterns("Genesis 1:31", [{ label: "six-day creation week", pattern: /\b(?:six(?:th)? days?|sixth day|creation week|seven-day week)\b/iu }]);
for (const ref of ["Genesis 2:2", "Genesis 2:3"]) requirePatterns(ref, [
  { label: "seventh-day Sabbath", pattern: /\bSabbath\b|\bseventh day\b/iu },
  { label: "Sabbath for all humanity from creation", pattern: /\b(?:all (?:humanity|people|mankind|human beings)|human race|humankind|before (?:Israel|Sinai|sin|the fall)|Mark 2:27|universal)\b/iu }
]);
requirePatterns("Genesis 2:7", [
  { label: "dust and breath", pattern: /\bdust\b[^]*\bbreath\b|\bbreath\b[^]*\bdust\b/iu },
  { label: "no innate immortal soul", pattern: near(NEG, String.raw`(?:immortal soul|immortal|separate (?:entity|being|soul)|inner soul|disembodied|innate)`, 220) }
]);
requirePatterns("Genesis 3:4", [{ label: "the serpent's lie about death", pattern: /\b(?:lie|lying|falsehood|immortal\w*|deceiv\w*|deception)\b/iu }]);
requirePatterns("Genesis 3:15", [
  { label: "Seed fulfilled in Christ", pattern: /\b(?:Christ|Messiah|Jesus)\b/iu },
  { label: "serpent as Satan", pattern: /\bSatan\b|\bdevil\b|Revelation 12:9/iu },
  { label: "conflict or enmity", pattern: /\b(?:enmity|conflict|controversy|war)\b/iu }
]);
requirePatterns("Genesis 7:2", [{ label: "clean and unclean before Sinai", pattern: /\bclean\b[^]*\bunclean\b|\bunclean\b[^]*\bclean\b/iu }]);
for (const ref of ["Genesis 7:19", "Genesis 7:20"]) requirePatterns(ref, [{ label: "worldwide flood", pattern: /\b(?:global|worldwide|world-wide|universal|whole (?:earth|world)|entire (?:earth|globe)|all the high hills)\b/iu }]);
requirePatterns("Genesis 14:20", [{ label: "tithe before Levi", pattern: /\btithe\w*|\btenth\b/iu }]);
requirePatterns("Genesis 22:8", [{ label: "lamb pointing to Christ", pattern: /\b(?:Christ|Lamb of God|Jesus|Calvary|substitut\w*)\b/iu }]);
requirePatterns("Genesis 26:5", [{ label: "law before Sinai", pattern: /\b(?:before Sinai|before the law was|centuries before|prior to Sinai|already)\b/iu }]);
requirePatterns("Genesis 35:18", [{ label: "soul as life departing", pattern: /\b(?:life|breath)\b/iu }, { label: "no conscious departure", pattern: near(NEG, String.raw`(?:conscious|immortal|ghost|disembodied|spirit (?:being|entity)|separate (?:entity|being))`, 220) }]);
requirePatterns("Genesis 49:10", [{ label: "messianic Shiloh", pattern: /\b(?:Messiah|messianic|Christ|Jesus)\b/iu }]);

// ---- Exodus ----
requirePatterns("Exodus 3:14", [{ label: "I AM and Christ", pattern: /John 8:58|\bChrist\b|\bJesus\b/iu }]);
for (const ref of ["Exodus 12:5", "Exodus 12:13"]) requirePatterns(ref, [{ label: "Passover lamb as Christ", pattern: /\b(?:Christ|Lamb of God|Jesus|1 Corinthians 5:7)\b/iu }]);
requirePatterns("Exodus 16:23", [{ label: "Sabbath before Sinai", pattern: /\b(?:before Sinai|before the law|already|creation|Genesis 2)\b/iu }]);
requirePatterns("Exodus 20:8", [
  { label: "seventh-day Sabbath", pattern: /\bseventh\b/iu },
  { label: "Sabbath not transferred or abolished", pattern: near(NEG, String.raw`(?:Sunday|first day|abolish\w*|transfer\w*|changed|set aside)`, 220) }
]);
requirePatterns("Exodus 20:11", [{ label: "creation memorial", pattern: /\bcreat\w*|Genesis 2/iu }]);
requirePatterns("Exodus 20:3", [{ label: "law grounded in redemption", pattern: /\b(?:redeem\w*|redemption|deliver\w*|grace|brought (?:thee|you|them) out)\b/iu }]);
for (const ref of ["Exodus 25:9", "Exodus 25:40"]) requirePatterns(ref, [{ label: "heavenly pattern", pattern: /\bheaven\w*|Hebrews 8/iu }]);
requirePatterns("Exodus 31:13", [{ label: "Sabbath as sign", pattern: /\bsign\b/iu }]);
requirePatterns("Exodus 31:18", [{ label: "tables written by God", pattern: /\bfinger\b|\bwritten by God\b|\bGod (?:himself|Himself) wrote\b/iu }]);

// ---- Leviticus ----
for (const ref of ["Leviticus 11:2", "Leviticus 11:3"]) requirePatterns(ref, [{ label: "continuing clean and unclean distinction", pattern: near(NEG, String.raw`(?:abolish\w*|obsolete|cancel\w*|set aside|no longer (?:apply|matter|binding))`, 220) }]);
requirePatterns("Leviticus 11:44", [{ label: "holiness", pattern: /\bholy\b|\bholiness\b/iu }]);
requirePatterns("Leviticus 16:8", [
  { label: "scapegoat as Satan", pattern: /\bSatan\b|\bdevil\b/iu },
  { label: "scapegoat is not Christ", pattern: near(NEG, String.raw`(?:Christ|Jesus|Savio(?:u)?r|atone\w*|substitut\w*)`, 220) }
]);
requirePatterns("Leviticus 16:16", [{ label: "cleansing of the sanctuary", pattern: /\bsanctuary\b/iu }, { label: "heavenly antitype", pattern: /\b(?:heavenly|Hebrews 9|Daniel 8:14|High Priest|judgment)\b/iu }]);
requirePatterns("Leviticus 16:30", [{ label: "Christ's ministry and judgment", pattern: /\b(?:Christ|Jesus|heavenly|judgment|High Priest)\b/iu }]);
requirePatterns("Leviticus 17:11", [{ label: "atonement by life given", pattern: /\batone\w*|\bblood\b/iu }]);
requirePatterns("Leviticus 23:3", [{ label: "weekly Sabbath", pattern: /\bweekly\b|\bseventh day\b/iu }]);
requirePatterns("Leviticus 23:38", [{ label: "ceremonial sabbaths distinct from the weekly Sabbath", pattern: /\b(?:ceremonial|annual|yearly)\b/iu }]);

// ---- Numbers ----
requirePatterns("Numbers 14:34", [{ label: "day-for-a-year principle", pattern: /\b(?:day for (?:a|each|every) year|year-day|day-year|each day for a year)\b/iu }, { label: "no date-setting", pattern: /\b(?:date[- ]setting|set dates|calculat\w*|speculat\w*)\b/iu }]);
requirePatterns("Numbers 18:21", [{ label: "tithe", pattern: /\btithe\w*/iu }]);
requirePatterns("Numbers 21:9", [{ label: "serpent lifted up and Christ", pattern: /John 3:14|\bChrist\b|\bJesus\b/iu }]);
requirePatterns("Numbers 24:17", [{ label: "messianic star", pattern: /\b(?:Messiah|messianic|Christ|Jesus)\b/iu }]);
requirePatterns("Numbers 16:33", [{ label: "no conscious underworld", pattern: near(NEG, String.raw`(?:conscious|underworld|hell|immortal|souls? (?:went|descend\w*))`, 220) }]);

// ---- Deuteronomy ----
requirePatterns("Deuteronomy 5:12", [{ label: "Sabbath kept holy", pattern: /\bSabbath\b/iu }]);
requirePatterns("Deuteronomy 5:15", [{ label: "redemption from slavery", pattern: /\b(?:redeem\w*|redemption|deliver\w*|slave\w*|bondage|Egypt)\b/iu }, { label: "complements creation", pattern: /\bcreat\w*|Exodus 20:11/iu }]);
requirePatterns("Deuteronomy 6:4", [{ label: "unity compatible with the Godhead", pattern: /\b(?:Godhead|Trinity|triune|plural|Matthew 28:19|Father, Son)\b/iu }]);
requirePatterns("Deuteronomy 10:2", [{ label: "tables in the ark", pattern: /\bark\b/iu }]);
requirePatterns("Deuteronomy 31:26", [{ label: "book beside the ark, distinct from the tables", pattern: /\b(?:beside|side of the ark)\b/iu }, { label: "moral and ceremonial distinction", pattern: /\b(?:Ten Commandments|tables|ceremonial|inside the ark|within the ark)\b/iu }]);
requirePatterns("Deuteronomy 14:3", [{ label: "clean and unclean continue", pattern: /\bclean\b|\bunclean\b/iu }]);
requirePatterns("Deuteronomy 18:11", [
  { label: "the dead know nothing", pattern: /Ecclesiastes 9:5|\b(?:unconscious|know nothing|knoweth not|sleep)\b/iu },
  { label: "spiritualism as deception", pattern: /\b(?:decepti\w*|deceiv\w*|spiritualism|demon\w*|evil spirits?|impersonat\w*)\b/iu }
]);
requirePatterns("Deuteronomy 18:15", [{ label: "Prophet like Moses is Christ", pattern: /Acts 3:22|\bChrist\b|\bJesus\b/iu }]);
requirePatterns("Deuteronomy 30:19", [{ label: "choose life", pattern: /\bchoose\b|\bchoice\b/iu }]);
requirePatterns("Deuteronomy 34:6", [{ label: "Moses's later resurrection", pattern: /\b(?:resurrect\w*|raised|Jude 1?:?9|transfiguration|Matthew 17)\b/iu }]);

if (errors.length) {
  console.error(`Theology validation failed with ${errors.length} issue(s):`);
  errors.slice(0, 200).forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`${site.title} theology validation passed${allowPending ? " (draft mode)" : ""}${only ? ` for ${only}` : ""}.`);
