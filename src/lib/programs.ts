import type { Locale } from "@/i18n/config";

/**
 * Show programs ("necklaces"): the group's own program PDFs, displayed page by
 * page (pre-rendered WebP in public/programs/<slug>/) so they read on any phone,
 * plus the few facts the page needs to explain the program's idea.
 * Titles and song names are written exactly as in the PDF.
 */
export type ProgramIcon =
  | "train" | "boat" | "nile" | "window" | "dome"
  | "speech" | "heart" | "rings" | "river" | "bird" | "medina" | "dune" | "coffee" | "village" | "lantern" | "drum";

/** Who sings, as marked in the PDF (فردي, كورال الذكور, كورال الفتيات, جماعي). */
export type Voice = "solo" | "men" | "women" | "all";

export type ProgramSong = {
  n: number;
  title: string;
  page: number;
  /** Rhythm named in the PDF, in Arabic (برول تونسي, دويك, غيطة…). */
  rhythm?: string;
  voices?: Voice[];
};

type L = Record<Locale, string>;

/** Where a tableau sits on the journey map, and the leg that leaves it (waypoints as [longitude, latitude]). */
export type ProgramStop = {
  name: Record<Locale, string>;
  lon: number;
  lat: number;
  label: "left" | "right" | "below";
  /** `of`: the tableau this leg belongs to (its colour). */
  leg: { style: "rails" | "river" | "sea" | "path" | "onward"; of: number; via: [number, number][] };
};

export type ProgramTableau = {
  n: number;
  title: Record<Locale, string>;
  /** Mood colour of the tableau, used for its bead arc and markers. */
  color: string;
  icon: ProgramIcon;
  page: number;
  songs: ProgramSong[];
  /** What happens in the tableau, in one or two sentences (from the PDF's stage notes). */
  mood?: L;
  /** Place on the journey map (programs whose scene is a map). */
  stop?: ProgramStop;
};

/**
 * The second picture of a program page, chosen for its idea:
 * - map: a journey through places (the tableaux' stops);
 * - quarrel: two sides drawing closer act by act (one entry per tableau);
 * - flight: a rise from the ground to the sky and back (stations in singing order);
 * - majlis: a gathering that lights up song by song (one moment per song).
 */
export type ProgramScene =
  | { kind: "map" }
  | { kind: "quarrel"; acts: { gap: number; line: "jagged" | "wave" | "smooth" }[] }
  | { kind: "flight"; stations: { song: number; page: number; height: number; place: L; dance: L; rhythm?: string }[] }
  | { kind: "majlis"; moments: { song: number; lit: number; clap?: boolean; ululation?: boolean; note: L }[] };

export type ProgramPage = {
  n: number;
  /** Tableau shown on this page (0 for the cover). */
  tableau: number;
  /** The tableau starts on this page (otherwise it continues from the page before). */
  starts: boolean;
  /** Page carries a large illustration (dimmed rather than inverted in dark rooms). */
  illustrated: boolean;
};

export type Program = {
  slug: string;
  series: Record<Locale, string>;
  title: Record<Locale, string>;
  orbit: Record<Locale, string>;
  /** Note at the centre of the necklace. */
  centre: Record<Locale, string>;
  summary: Record<Locale, string>;
  /** The idea in four plain steps, one per stage of the animated necklace. */
  steps: Record<Locale, [string, string, string, string]>;
  scene: ProgramScene;
  tableaux: ProgramTableau[];
  pages: ProgramPage[];
  pdfBytes: number;
  next?: Record<Locale, string>;
};

const JAHAR_FA = { ar: "المدار المقامي: جهارفا — Fa", fr: "Orbite modale : Jahar-Fa", en: "Modal orbit: Jahar–Fa" };
const HUSAYNI = { ar: "المدار المقامي: حسيني يماني", fr: "Orbite modale : Husseini yéménite", en: "Modal orbit: Yemeni Husseini" };
const FA = { ar: "فا", fr: "Fa", en: "F" };
const HUSAYNI_CENTRE = { ar: "حسيني", fr: "Husseini", en: "Ḥusaynī" };

/** Pages of a program: `starts` lists the first page of each tableau, `illustrated` the pages with a large picture. */
function pagesOf(total: number, starts: number[], illustrated: number[]): ProgramPage[] {
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    const tableau = starts.filter((p) => p <= n).length;
    return { n, tableau, starts: n === 1 || starts.includes(n), illustrated: illustrated.includes(n) };
  });
}

/** Necklaces two to five, from their PDFs (titles, songs, rhythms and voices as written there). */
const SERIES_REST: Program[] = [
  {
    slug: "al-illa",
    series: { ar: "العقد الثاني", fr: "Deuxième collier", en: "The Second Necklace" },
    title: { ar: "العلّة", fr: "Le Grief", en: "The Grievance" },
    orbit: JAHAR_FA,
    centre: FA,
    summary: {
      ar: "خصام مغنّى بين المغنّي وكورال الفتيات في ثلاث لوحات: ردح، فمدح، فصلح. ستّ أغانٍ يتبادل فيها الطرفان الكلام حتى يلتقيا.",
      fr: "Une querelle chantée entre le chanteur et le chœur des jeunes femmes, en trois tableaux : raillerie, éloge, réconciliation. Six chansons où les deux camps se répondent jusqu’à se retrouver.",
      en: "A sung quarrel between the singer and the women’s chorus in three tableaux: mockery, praise, reconciliation. Six songs in which the two sides answer each other until they meet.",
    },
    steps: {
      ar: [
        "ستّ أغانٍ، وكلّ أغنية حبّة.",
        "والخيط هنا حوار: المغنّي يقول، والكورال يردّ، والفتيات يقاطعن ويتهكّمن.",
        "والعقد خصام في ثلاث لوحات: ردح، فمدح، فصلح؛ في كلّ لوحة يقترب الطرفان أكثر.",
        "وكلّه يدور حول فا، حتى ينغّم النّاي في الختام نحو الجهاركة: باب «التحرير».",
      ],
      fr: [
        "Six chansons : chacune est une perle.",
        "Ici le fil est un dialogue : le chanteur dit, le chœur répond, les jeunes femmes interrompent et se moquent.",
        "Et le collier est une querelle en trois tableaux : raillerie, éloge, réconciliation ; à chaque tableau, les deux camps se rapprochent.",
        "Tout tourne autour de fa, jusqu’à ce que le nay module vers le jaharka : la porte de « La Libération ».",
      ],
      en: [
        "Six songs, each one a bead.",
        "Here the thread is a dialogue: the singer speaks, the chorus answers, the women interrupt and tease.",
        "And the necklace is a quarrel in three tableaux: mockery, praise, reconciliation; with each one the two sides come closer.",
        "It all circles F, until the nay modulates toward jaharka at the end: the door to “Liberation”.",
      ],
    },
    scene: { kind: "quarrel", acts: [{ gap: 1, line: "jagged" }, { gap: 0.55, line: "wave" }, { gap: 0.1, line: "smooth" }] },
    tableaux: [
      { n: 1, title: { ar: "ردح", fr: "La raillerie", en: "Mockery" }, color: "#e0614f", icon: "speech", page: 2,
        mood: {
          ar: "يشكو المغنّي ويسخر في موّال عروبي، ويجيبه الكورال؛ ثم تتهكّم الفتيات: «روح اسأل قبلها أنا مين».",
          fr: "Le chanteur se plaint et raille dans un mawwal ʿaroubi, le chœur lui répond ; puis les jeunes femmes se moquent : « va d’abord demander qui je suis ».",
          en: "The singer complains and mocks in an ʿaroubi mawwal, the chorus answers; then the women tease him: “go and ask first who I am”.",
        },
        songs: [
          { n: 1, title: "قلقت و مليت", page: 2, rhythm: "برول تونسي", voices: ["solo", "all"] },
          { n: 2, title: "حارة السقايين", page: 3, rhythm: "دويك", voices: ["women", "men"] },
        ] },
      { n: 2, title: { ar: "مدح", fr: "L’éloge", en: "Praise" }, color: "#e8b04a", icon: "heart", page: 4,
        mood: {
          ar: "يتغزّل المغنّي مع كورال الذكور وتردّد الفتيات بتهكّم، ثم ينفردن بأغنية غربية على لحن السمفونية التاسعة.",
          fr: "Le chanteur fait l’éloge avec le chœur des hommes, les jeunes femmes reprennent en se moquant, puis chantent seules une chanson occidentale sur la Neuvième Symphonie.",
          en: "The singer sings praise with the men’s chorus while the women echo him mockingly, then they sing a Western song alone, on the Ninth Symphony.",
        },
        songs: [
          { n: 3, title: "علا لا و لا لا و لا لا", page: 4, rhythm: "دويك", voices: ["solo", "men", "women", "all"] },
          { n: 4, title: "السمفونية التاسعة", page: 5, rhythm: "غربي", voices: ["women"] },
        ] },
      { n: 3, title: { ar: "صلح", fr: "La réconciliation", en: "Reconciliation" }, color: "#6fc3a0", icon: "rings", page: 6,
        mood: {
          ar: "غناء جماعي يعيده الجمهور، تقاطعه الفتيات مرّة أخيرة، ثم يعود المغنّي إلى أغنية المصالحة وقفلة جماعية متباطئة.",
          fr: "Un chant collectif repris par le public, une dernière interruption des jeunes femmes, puis le chanteur revient à la chanson de la réconciliation et à une cadence collective ralentie.",
          en: "A group song taken up by the audience, one last interruption from the women, then the singer returns to the reconciliation song and a slow shared close.",
        },
        songs: [
          { n: 5, title: "طلعت يا محلا نورها", page: 6, rhythm: "دويك", voices: ["all"] },
          { n: 6, title: "قاعد عالساقية", page: 7, voices: ["solo", "all"] },
        ] },
    ],
    pages: pagesOf(7, [2, 4, 6], [2, 4, 6]),
    pdfBytes: 1073866,
    next: { ar: "التحرير", fr: "La Libération", en: "Liberation" },
  },
  {
    slug: "al-tahrir",
    series: { ar: "العقد الثالث", fr: "Troisième collier", en: "The Third Necklace" },
    title: { ar: "التحرير", fr: "La Libération", en: "Liberation" },
    orbit: JAHAR_FA,
    centre: FA,
    summary: {
      ar: "من ضفاف الفراتين إلى السماء: أربع أغانٍ تُرقص دبكةً من العراق إلى سوريا فلبنان، حتى تصير رقصة صوفية مغربية، ثم تعود إلى الأرض أخفّ.",
      fr: "Des rives des deux fleuves jusqu’au ciel : quatre chansons dansées en dabké, d’Irak en Syrie puis au Liban, jusqu’à devenir une danse soufie marocaine, avant de revenir à terre, plus légères.",
      en: "From the banks of the two rivers to the sky: four songs danced as dabke from Iraq to Syria and Lebanon, until they become a Moroccan Sufi dance, then come back to earth lighter.",
    },
    steps: {
      ar: [
        "أربع أغانٍ، وكلّ أغنية حبّة.",
        "والخيط هنا رقصة تتبدّل: دبكة الجوبي العراقية، فدبكة العرب السورية، فالدبكة اللبنانية، فرقصة صوفية.",
        "والعقد صعود في لوحتين: من حديث الفراتين على الأرض، إلى الانتماء إلى السماء، كطيران الحجل.",
        "وكلّه يدور حول فا، ثم ينزل إلى الأرض أخفّ وأكثر انسيابًا حتى القفلة.",
      ],
      fr: [
        "Quatre chansons : chacune est une perle.",
        "Ici le fil est une danse qui change : dabké jobi irakienne, dabké arabe syrienne, dabké libanaise, puis danse soufie.",
        "Et le collier est une ascension en deux tableaux : du dialogue des deux fleuves, sur terre, à l’appartenance au ciel, comme le vol de la perdrix.",
        "Tout tourne autour de fa, puis redescend à terre, plus léger et plus fluide, jusqu’à la cadence finale.",
      ],
      en: [
        "Four songs, each one a bead.",
        "Here the thread is a dance that changes: Iraqi jobi dabke, Syrian Arab dabke, Lebanese dabke, then a Sufi dance.",
        "And the necklace is a rise in two tableaux: from the talk of the two rivers, on the ground, to belonging to the sky, like a partridge’s flight.",
        "It all circles F, then comes back down lighter and more flowing, until the final close.",
      ],
    },
    scene: {
      kind: "flight",
      stations: [
        { song: 1, page: 2, height: 0.08, place: { ar: "العراق", fr: "Irak", en: "Iraq" }, dance: { ar: "دبكة الجوبي", fr: "Dabké jobi", en: "Jobi dabke" }, rhythm: "جوبي" },
        { song: 2, page: 3, height: 0.18, place: { ar: "سوريا", fr: "Syrie", en: "Syria" }, dance: { ar: "دبكة العرب", fr: "Dabké arabe", en: "Arab dabke" } },
        { song: 3, page: 4, height: 0.5, place: { ar: "لبنان · صنين", fr: "Liban · Sannine", en: "Lebanon · Sannine" }, dance: { ar: "دبكة لبنانية سريعة", fr: "Dabké libanaise rapide", en: "Fast Lebanese dabke" }, rhythm: "ملفوف" },
        { song: 4, page: 5, height: 0.94, place: { ar: "المغرب", fr: "Maroc", en: "Morocco" }, dance: { ar: "رقصة صوفية", fr: "Danse soufie", en: "Sufi dance" }, rhythm: "مغربي" },
        { song: 3, page: 5, height: 0.3, place: { ar: "لبنان", fr: "Liban", en: "Lebanon" }, dance: { ar: "عودة إلى الدبكة، أخفّ وأكثر انسيابًا", fr: "Retour à la dabké, plus légère et fluide", en: "Back to dabke, lighter and more flowing" }, rhythm: "ملفوف" },
      ],
    },
    tableaux: [
      { n: 1, title: { ar: "حديث الفراتين", fr: "Le dialogue des deux fleuves", en: "The Talk of the Two Rivers" }, color: "#5aa9d6", icon: "river", page: 2,
        mood: {
          ar: "تقسيم جهاركه على الناي وموّال عراقي، ثم دبكة الجوبي العراقية بتصفيقتها الثلاثية، فدبكة العرب السورية.",
          fr: "Un taqsim jaharka au nay et un mawwal irakien, puis la dabké jobi irakienne et son claquement à trois, et la dabké arabe syrienne.",
          en: "A jaharka taqsim on the nay and an Iraqi mawwal, then Iraqi jobi dabke with its triple clap, and Syrian Arab dabke.",
        },
        songs: [
          { n: 1, title: "طالعة من بيت أبوها", page: 2, rhythm: "جوبي", voices: ["all", "solo"] },
          { n: 2, title: "عالمايا عالمايا", page: 3, voices: ["solo", "all"] },
        ] },
      { n: 2, title: { ar: "الانتماء إلى السماء", fr: "Appartenir au ciel", en: "Belonging to the Sky" }, color: "#b38ce6", icon: "bird", page: 4,
        mood: {
          ar: "دبكة لبنانية سريعة، ثم يتحوّل الإيقاع من الملفوف إلى المغربي والدبكة إلى رقصة صوفية، قبل العودة إلى الدبكة بخفّة وانسياب.",
          fr: "Une dabké libanaise rapide, puis le rythme passe du malfouf au marocain et la dabké devient danse soufie, avant le retour à la dabké, léger et fluide.",
          en: "Fast Lebanese dabke, then the rhythm turns from malfuf to Moroccan and the dabke into a Sufi dance, before a light, flowing return to dabke.",
        },
        songs: [
          { n: 3, title: "يا حجل صنين", page: 4, rhythm: "ملفوف", voices: ["solo", "all"] },
          { n: 4, title: "الله يا مولانا", page: 5, rhythm: "مغربي", voices: ["solo", "all"] },
        ] },
    ],
    pages: pagesOf(5, [2, 4], [2, 4]),
    pdfBytes: 855202,
    next: { ar: "العُرْبة", fr: "L’Arabité", en: "Arabness" },
  },
  {
    slug: "al-urba",
    series: { ar: "العقد الرابع", fr: "Quatrième collier", en: "The Fourth Necklace" },
    title: { ar: "العُرْبة", fr: "L’Arabité", en: "Arabness" },
    orbit: HUSAYNI,
    centre: HUSAYNI_CENTRE,
    summary: {
      ar: "رحلة نسب من مدينة تونسية إلى بوح الرمال، ثم إلى بنّ اليمن وقراه: ستّ أغانٍ على مدار الحسيني اليماني، تعود في ختامها إلى إيقاع الاستفتاح التونسي.",
      fr: "Un voyage de parenté, d’une médina tunisienne aux confidences des sables, puis au café et aux villages du Yémen : six chansons sur l’orbite du husseini yéménite, qui reviennent à la fin au rythme istiftah tunisien.",
      en: "A journey of kinship from a Tunisian medina to what the sands confide, then to Yemen’s coffee and villages: six songs on the Yemeni Husseini orbit that return at the end to the Tunisian istiftah rhythm.",
    },
    steps: {
      ar: [
        "ستّ أغانٍ، وكلّ أغنية حبّة.",
        "والخيط تنغيم ينتقل بين الطبوع: من الحسيني اليماني إلى المحيّر عراق، ثم إلى الراست النايلي، ثم عودة إلى الحسيني.",
        "والعقد رحلة نسب في أربع لوحات: مدينة تونسية، فرمال الجنوب، فبنّ اليمن، فقرى اليمن.",
        "وكلّه يدور حول الحسيني اليماني، ويعود في الختام إلى إيقاع الاستفتاح التونسي: من حيث بدأت الرحلة.",
      ],
      fr: [
        "Six chansons : chacune est une perle.",
        "Le fil est une modulation qui passe d’un mode à l’autre : du husseini yéménite au mhayyer ʿiraq, puis au rast nayli, et retour au husseini.",
        "Et le collier est un voyage de parenté en quatre tableaux : une médina tunisienne, les sables du Sud, le café du Yémen, les villages du Yémen.",
        "Tout tourne autour du husseini yéménite, et revient à la fin au rythme istiftah tunisien : là où le voyage a commencé.",
      ],
      en: [
        "Six songs, each one a bead.",
        "The thread is a modulation moving between modes: from Yemeni Husseini to mhayyer ʿiraq, then to rast nayli, and back to Husseini.",
        "And the necklace is a journey of kinship in four tableaux: a Tunisian medina, the sands of the south, Yemen’s coffee, Yemen’s villages.",
        "It all circles the Yemeni Husseini, and returns at the end to the Tunisian istiftah rhythm: where the journey began.",
      ],
    },
    scene: { kind: "map" },
    tableaux: [
      { n: 1, title: { ar: "خاطرة المدينة", fr: "Pensée de la médina", en: "A Medina Musing" }, color: "#d98b4a", icon: "medina", page: 2,
        mood: {
          ar: "غيرة عاشق في أزقّة مدينة تونسية: تنغيم من الحسيني اليماني إلى المحيّر عراق، وعروبي، ثم المذهب جماعيًّا.",
          fr: "La jalousie d’un amoureux dans les ruelles d’une médina tunisienne : modulation du husseini yéménite au mhayyer ʿiraq, un ʿaroubi, puis le refrain en chœur.",
          en: "A jealous lover in the alleys of a Tunisian medina: a modulation from Yemeni Husseini to mhayyer ʿiraq, an ʿaroubi, then the refrain together.",
        },
        stop: { name: { ar: "تونس", fr: "Tunis", en: "Tunis" }, lon: 10.17, lat: 36.8, label: "left",
          leg: { style: "path", of: 2, via: [[9.9, 35.1]] } },
        songs: [{ n: 1, title: "مغيار", page: 2, voices: ["solo", "all"] }] },
      { n: 2, title: { ar: "من بوح الرمال", fr: "Confidences des sables", en: "What the Sands Confide" }, color: "#e3c06b", icon: "dune", page: 3,
        mood: {
          ar: "عودة إلى الحسيني ثم تنغيم إلى الراست النايلي والصالحي: فراق الأحبّة وحنين الجنوب، بلازمة إيقاعية بين الجمل.",
          fr: "Retour au husseini puis modulation vers le rast nayli et salhi : la séparation et la nostalgie du Sud, avec une ritournelle rythmique entre les phrases.",
          en: "Back to Husseini, then a modulation to rast nayli and salhi: parting and longing for the south, with a rhythmic refrain between phrases.",
        },
        stop: { name: { ar: "الجنوب التونسي", fr: "Sud tunisien", en: "Southern Tunisia" }, lon: 9.02, lat: 33.46, label: "left",
          leg: { style: "path", of: 3, via: [[15, 30.6], [24, 28.6], [31, 26.4], [35.6, 22.6], [39.6, 18], [42.4, 14.6]] } },
        songs: [{ n: 2, title: "وين الرقراقي", page: 3, voices: ["solo", "all"] }] },
      { n: 3, title: { ar: "ثمار السُّمّار", fr: "Les fruits de la veillée", en: "Fruits of the Evening Gathering" }, color: "#b0603e", icon: "coffee", page: 6,
        mood: {
          ar: "سهرة في حقول البنّ اليمنية على إيقاع الوقف الكبير، بزخرفة العود والكمان والناي، وصوت فردي يردّ عليه الجميع.",
          fr: "Une veillée dans les champs de café du Yémen sur le rythme waqf kabir, ornée d’oud, de violon et de nay, une voix seule à laquelle tous répondent.",
          en: "An evening in Yemen’s coffee fields on the waqf kabir rhythm, ornamented by oud, violin and nay, one voice that everyone answers.",
        },
        stop: { name: { ar: "المخا", fr: "Moka", en: "Mocha" }, lon: 43.25, lat: 13.32, label: "left",
          leg: { style: "path", of: 4, via: [[43.5, 14.5]] } },
        songs: [{ n: 3, title: "الحب و البنّ", page: 6, rhythm: "وقف كبير", voices: ["solo", "all"] }] },
      { n: 4, title: { ar: "قرى للقرى", fr: "De village en village", en: "Village to Village" }, color: "#7fb069", icon: "village", page: 8,
        mood: {
          ar: "رقصة تمزج الدبكة الشامية برقصتَي الكوكباني والسارع الصنعانيّتين، وتعود الأغنية الأخيرة إلى إيقاع الاستفتاح التونسي.",
          fr: "Une danse qui mêle la dabké du Levant aux danses kawkabani et sareʿ de Sanaa ; la dernière chanson revient au rythme istiftah tunisien.",
          en: "A dance blending Levantine dabke with Sanaa’s kawkabani and sareʿ dances; the last song returns to the Tunisian istiftah rhythm.",
        },
        stop: { name: { ar: "كوكبان", fr: "Kawkaban", en: "Kawkaban" }, lon: 43.9, lat: 15.5, label: "right",
          leg: { style: "onward", of: 4, via: [[40.5, 20.5], [35, 27], [28, 30.6], [21, 31.4]] } },
        songs: [
          { n: 4, title: "لاني بنايم و لاني بصاحي", page: 8, rhythm: "سارع", voices: ["solo", "all"] },
          { n: 5, title: "يا قادحة", page: 8, rhythm: "الوسطى", voices: ["solo", "all"] },
          { n: 6, title: "محبوبي لطيف", page: 10, rhythm: "سارع", voices: ["solo", "all"] },
        ] },
    ],
    pages: pagesOf(11, [2, 3, 6, 8], [2, 3, 6, 8]),
    pdfBytes: 1446584,
    next: { ar: "التحريرين", fr: "Les Deux Libérations", en: "The Two Liberations" },
  },
  {
    slug: "al-tahrirayn",
    series: { ar: "العقد الخامس", fr: "Cinquième collier", en: "The Fifth Necklace" },
    title: { ar: "التحريرين", fr: "Les Deux Libérations", en: "The Two Liberations" },
    orbit: HUSAYNI,
    centre: HUSAYNI_CENTRE,
    summary: {
      ar: "حكاية تُروى ثم فرح يعمّ: خمس أغانٍ في لوحتين، أساجيل وأهاليل، من صوت راوٍ واحد إلى غناء الجميع وتصفيقهم وزغاريدهم، حتى القفلة الأخيرة.",
      fr: "Un récit, puis une joie qui gagne tout le monde : cinq chansons en deux tableaux, récits et chants de joie, de la voix d’un seul conteur au chant, aux claquements de mains et aux youyous de tous, jusqu’à la cadence finale.",
      en: "A tale told, then joy for everyone: five songs in two tableaux, tales and songs of joy, from one storyteller’s voice to everyone singing, clapping and ululating, until the final close.",
    },
    steps: {
      ar: [
        "خمس أغانٍ، وكلّ أغنية حبّة.",
        "والخيط صوت ينتقل من واحد إلى الجميع: راوٍ يحكي، ثم ردود، ثم تصفيق وزغاريد.",
        "والعقد تحريران في لوحتين: أساجيل تحرّر الذاكرة بالحكاية، وأهاليل تحرّر الفرح بالغناء.",
        "وكلّه يدور حول الحسيني اليماني، حتى القفلة الأخيرة.",
      ],
      fr: [
        "Cinq chansons : chacune est une perle.",
        "Le fil est une voix qui passe d’un seul à tous : un conteur raconte, puis viennent les réponses, puis les claquements de mains et les youyous.",
        "Et le collier est deux libérations en deux tableaux : les récits libèrent la mémoire par le conte, les chants de joie libèrent la joie par le chant.",
        "Tout tourne autour du husseini yéménite, jusqu’à la dernière cadence.",
      ],
      en: [
        "Five songs, each one a bead.",
        "The thread is a voice passing from one to all: a storyteller tells, then come the answers, then clapping and ululation.",
        "And the necklace is two liberations in two tableaux: the tales free memory through storytelling, the songs of joy free joy through singing.",
        "It all circles the Yemeni Husseini, until the final close.",
      ],
    },
    scene: {
      kind: "majlis",
      moments: [
        { song: 1, lit: 3, note: { ar: "راوٍ يحكي غرائب الفراق، والجماعة تغنّي معه مرّتين", fr: "Un conteur dit les étrangetés de la séparation, le groupe chante avec lui deux fois", en: "A storyteller tells of parting’s strange ways, the group sings with him twice" } },
        { song: 2, lit: 6, ululation: true, note: { ar: "فردي ثم جماعي، مع الزغاريد وتهاليل الفرحة", fr: "En solo puis en chœur, avec youyous et cris de joie", en: "Solo then together, with ululation and cries of joy" } },
        { song: 3, lit: 8, note: { ar: "الكورال يردّ على الصوت الفردي", fr: "Le chœur répond à la voix seule", en: "The chorus answers the single voice" } },
        { song: 4, lit: 10, clap: true, note: { ar: "الكورال مع التصفيق", fr: "Le chœur avec les claquements de mains", en: "The chorus with clapping" } },
        { song: 5, lit: 12, clap: true, ululation: true, note: { ar: "الجميع: تصفيق أحادي ثم تصفيق يمني حماسي، حتى القفلة", fr: "Tout le monde : claquement simple puis claquement yéménite enflammé, jusqu’à la cadence", en: "Everyone: single claps, then fiery Yemeni clapping, until the close" } },
      ],
    },
    tableaux: [
      { n: 1, title: { ar: "أساجيل", fr: "Récits", en: "Tales" }, color: "#6f8fd8", icon: "lantern", page: 2,
        mood: {
          ar: "راوٍ يحكي غرائب الفراق، فيتحوّل الختام إلى النهوند السلتي بكمان «Legend»، ثم يلبس المغنّي الشاشية التونسية وتنطلق الزغاريد.",
          fr: "Un conteur dit les étrangetés de la séparation ; la fin glisse vers le nahawand celtique avec le violon de « Legend », puis le chanteur remet la chéchia tunisienne et les youyous s’élèvent.",
          en: "A storyteller tells of parting; the end slides into Celtic nahawand with the violin of “Legend”, then the singer puts the Tunisian chechia back on and the ululation begins.",
        },
        songs: [
          { n: 1, title: "يا ناس جراتلي غرايب", page: 2, voices: ["all", "solo"] },
          { n: 2, title: "بعدك يا البية", page: 3, rhythm: "غيطة", voices: ["solo", "all"] },
        ] },
      { n: 2, title: { ar: "أهاليل", fr: "Chants de joie", en: "Songs of Joy" }, color: "#f0a43a", icon: "drum", page: 4,
        mood: {
          ar: "أغانٍ على إيقاع الغيطة يردّدها الكورال مع التصفيق، حتى «يا نهار البارح» وتصفيقها اليمني الحماسي والقفلة.",
          fr: "Des chansons sur le rythme ghayta reprises par le chœur en frappant des mains, jusqu’à « Ya nhar el-bareh », son claquement yéménite enflammé et la cadence.",
          en: "Songs on the ghayta rhythm taken up by the chorus with clapping, up to “Ya nhar el-bareh”, its fiery Yemeni clapping and the close.",
        },
        songs: [
          { n: 3, title: "عشيري لول", page: 4, rhythm: "غيطة", voices: ["all", "solo"] },
          { n: 4, title: "خاتم حبيبتي", page: 5, rhythm: "غيطة", voices: ["all"] },
          { n: 5, title: "يا نهار البارح", page: 5, rhythm: "شرح / غيطة", voices: ["solo", "all"] },
        ] },
    ],
    pages: pagesOf(5, [2, 4], [2, 4]),
    pdfBytes: 853486,
  },
];

export const PROGRAMS: Program[] = [
  {
    slug: "al-aqd-al-khalis",
    series: { ar: "العقد الأوّل", fr: "Premier collier", en: "The First Necklace" },
    title: { ar: "العقد الخالص", fr: "Le Collier pur", en: "The Pure Necklace" },
    orbit: { ar: "المدار المقامي: جهارفا — Fa", fr: "Orbite modale : Jahar-Fa", en: "Modal orbit: Jahar–Fa" },
    centre: { ar: "فا", fr: "Fa", en: "F" },
    summary: {
      ar: "سبع أغانٍ تُغنّى كرحلة واحدة، من قطار في نورماندي إلى مقامٍ في المنستير، في خمس لوحات.",
      fr: "Sept chansons chantées comme un seul voyage, d’un train en Normandie à un sanctuaire de Monastir, en cinq tableaux.",
      en: "Seven songs sung as one journey, from a train in Normandy to a shrine in Monastir, in five tableaux.",
    },
    steps: {
      ar: [
        "سبع أغانٍ، وكلّ أغنية حبّة.",
        "لا صمت بينها: تنغيمٌ قصير يربط كلّ أغنية بالتي بعدها، كخيط العقد.",
        "والعقد رحلة: قطار، فزورق على النيل، فمصر، فنافذة على البحر، فمقام.",
        "والرحلة كلّها تدور حول نغمة واحدة: فا.",
      ],
      fr: [
        "Sept chansons : chacune est une perle.",
        "Aucun silence entre elles : un court fredonnement relie chaque chanson à la suivante, comme le fil d’un collier.",
        "Et le collier est un voyage : un train, une barque sur le Nil, l’Égypte, une fenêtre sur la mer, un sanctuaire.",
        "Et tout le voyage tourne autour d’une seule note : fa.",
      ],
      en: [
        "Seven songs, each one a bead.",
        "No silence between them: a short hum ties each song to the next, like the thread of a necklace.",
        "And the necklace is a journey: a train, a boat on the Nile, Egypt, a window on the sea, a shrine.",
        "And the whole journey circles a single note: F.",
      ],
    },
    scene: { kind: "map" },
    tableaux: [
      { n: 1, title: { ar: "قطار في نورماندي", fr: "Un train en Normandie", en: "A Train in Normandy" }, color: "#9db4d3", icon: "train", page: 2,
        stop: { name: { ar: "نورماندي", fr: "Normandie", en: "Normandy" }, lon: 0.21, lat: 49.71, label: "right",
          leg: { style: "rails", of: 1, via: [[-1.5, 43.5], [0.5, 35], [6, 26], [15, 19.5], [24, 16.5]] } },
        songs: [{ n: 1, title: "القطار", page: 2 }] },
      { n: 2, title: { ar: "زورق على النيل الأزرق", fr: "Une barque sur le Nil Bleu", en: "A Boat on the Blue Nile" }, color: "#4f93d8", icon: "boat", page: 4,
        stop: { name: { ar: "الخرطوم", fr: "Khartoum", en: "Khartoum" }, lon: 32.53, lat: 15.59, label: "below",
          leg: { style: "river", of: 2, via: [[33.33, 19.53], [31.8, 18.47], [30.48, 19.18], [31.33, 21.8], [32.9, 24.09], [32.64, 25.69], [31.18, 27.18]] } },
        songs: [{ n: 2, title: "نعناع الجنينة السودانية", page: 4 }] },
      { n: 3, title: { ar: "هبة النيل", fr: "Le Don du Nil", en: "The Gift of the Nile" }, color: "#d4a43f", icon: "nile", page: 5,
        stop: { name: { ar: "القاهرة", fr: "Le Caire", en: "Cairo" }, lon: 31.24, lat: 30.04, label: "left",
          leg: { style: "sea", of: 4, via: [[32.55, 29.97], [34.6, 27.4], [38.6, 21.4], [42.1, 15.2], [43.4, 12.6]] } },
        songs: [{ n: 3, title: "نعناع الجنينة المصريّة", page: 5 }] },
      { n: 4, title: { ar: "نافذة على الهنديّ", fr: "Une fenêtre sur l’océan Indien", en: "A Window on the Indian Ocean" }, color: "#e8846f", icon: "window", page: 7,
        stop: { name: { ar: "عدن", fr: "Aden", en: "Aden" }, lon: 45.03, lat: 12.79, label: "right",
          leg: { style: "path", of: 5, via: [[44.5, 16], [41, 22.5], [37.5, 28.2], [33.5, 31.8], [27, 32.6], [20, 32.6], [14, 33.6]] } },
        songs: [{ n: 4, title: "حرام الشك ما بينك و بيني", page: 7 }] },
      { n: 5, title: { ar: "مقام إلى عشق", fr: "Un maqâm vers l’amour", en: "A Maqam toward Love" }, color: "#c9774b", icon: "dome", page: 8,
        stop: { name: { ar: "المنستير", fr: "Monastir", en: "Monastir" }, lon: 10.83, lat: 35.77, label: "left",
          leg: { style: "onward", of: 5, via: [[5, 33.2], [-1, 30.6], [-6.5, 29.6]] } },
        songs: [{ n: 5, title: "يا ذروة المعالي", page: 8 }, { n: 6, title: "يا مازري", page: 9 }, { n: 7, title: "مرض الهوى", page: 10 }] },
    ],
    pages: [
      { n: 1, tableau: 0, starts: true, illustrated: false },
      { n: 2, tableau: 1, starts: true, illustrated: true },
      { n: 3, tableau: 1, starts: false, illustrated: false },
      { n: 4, tableau: 2, starts: true, illustrated: true },
      { n: 5, tableau: 3, starts: true, illustrated: true },
      { n: 6, tableau: 3, starts: false, illustrated: false },
      { n: 7, tableau: 4, starts: true, illustrated: true },
      { n: 8, tableau: 5, starts: true, illustrated: true },
      { n: 9, tableau: 5, starts: false, illustrated: false },
      { n: 10, tableau: 5, starts: false, illustrated: false },
    ],
    pdfBytes: 1981653,
    next: { ar: "العلّة", fr: "Le Grief", en: "The Grievance" },
  },
  ...SERIES_REST,
];

export const getProgram = (slug: string) => PROGRAMS.find((p) => p.slug === slug) ?? null;

/** Public files of a program (rendered pages and the original PDF). */
export const programAsset = {
  pdf: (slug: string) => `/programs/${slug}/program.pdf`,
  tableau: (slug: string, n: number) => `/programs/${slug}/lawha-${n}.jpg`,
  page: (slug: string, n: number, size: "sm" | "lg" = "lg") => `/programs/${slug}/page-${String(n).padStart(2, "0")}${size === "sm" ? "-sm" : ""}.webp`,
};

/** Every rendered page is 1600×2263 (A4); the small set is half that. */
export const PAGE_SIZE = { width: 1600, height: 2263 } as const;

/** What a page shows, for its caption and alt text ("continued" carries a {title} slot). */
export function pageSubject(program: Program, page: ProgramPage, locale: Locale, t: { cover: string; continued: string }) {
  if (page.tableau === 0) return t.cover;
  const title = program.tableaux[page.tableau - 1].title[locale];
  return page.starts ? title : t.continued.replace("{title}", title);
}

/** Songs in order, with the tableau each belongs to. */
export const programSongs = (p: Program) => p.tableaux.flatMap((t) => t.songs.map((s) => ({ ...s, tableau: t })));
