import { renderSine } from "./01-sine.ts";
import sineSource from "./01-sine.ts?raw";
import { renderEnvelopedTone } from "./03-envelope.ts";
import envelopeSource from "./03-envelope.ts?raw";
import { renderAdditive } from "./04-additive-synthesis.ts";
import additiveSource from "./04-additive-synthesis.ts?raw";
import fourier1 from "./04/triangle_fourier_n_01.png";
import fourier3 from "./04/triangle_fourier_n_03.png";
import fourier9 from "./04/triangle_fourier_n_09.png";
import fourier39 from "./04/triangle_fourier_n_39.png";
import { renderPartialDecays } from "./05-partial-decays.ts";
import partialDecaysSource from "./05-partial-decays.ts?raw";
import { renderHammered } from "./06-hammer-and-velocity.ts";
import hammerSource from "./06-hammer-and-velocity.ts?raw";
import { renderInharmonic } from "./07-inharmonicity.ts";
import inharmonicitySource from "./07-inharmonicity.ts?raw";
import { renderStrings } from "./08-multiple-strings.ts";
import stringsSource from "./08-multiple-strings.ts?raw";
import { renderPiano } from "./09-piano.ts";
import pianoSource from "./09-piano.ts?raw";
import { renderFurElisePiano } from "./10-fur-elise.ts";
import furEliseSource from "./10-fur-elise.ts?raw";
import { renderFurEliseChords } from "./11-fur-elise-chords.ts";
import furEliseChordsSource from "./11-fur-elise-chords.ts?raw";
import { pianoGalleries } from "../visualizations/piano-galleries.ts";
import type { StageParameter, SynthStage } from "./types.ts";

/**
 * Parameters are keyed by id and the app keeps one value per id, so a slider
 * that survives from one stage to the next (attack, partials, ...) keeps the
 * value the presenter chose.
 */
const ATTACK: StageParameter = {
  id: "attack",
  label: "Attacco",
  min: 1,
  max: 200,
  step: 1,
  defaultValue: 8,
  unit: "ms",
  hint: "Quanto impiega la nota a raggiungere l'ampiezza massima.",
};

const DECAY: StageParameter = {
  id: "decay",
  label: "Decadimento",
  min: 0.2,
  max: 6,
  step: 0.1,
  defaultValue: 1.8,
  unit: "s",
  precision: 1,
  hint: "Costante di tempo della dissolvenza esponenziale.",
};

const PARTIALS: StageParameter = {
  id: "partials",
  label: "Parziali",
  min: 1,
  max: 12,
  step: 1,
  defaultValue: 8,
  hint: "Quante armoniche vengono sommate. Portalo a 1 per tornare alla fase 1.",
};

const SPECTRAL_DECAY: StageParameter = {
  id: "spectralDecay",
  label: "Decadimento spettrale",
  min: 0.2,
  max: 3,
  step: 0.05,
  defaultValue: 1,
  unit: "×",
  precision: 2,
  hint: "Moltiplica il tempo di decadimento di ogni parziale.",
};

const HAMMER: StageParameter = {
  id: "hammer",
  label: "Martelletto",
  min: 0,
  max: 3,
  step: 0.05,
  defaultValue: 1,
  unit: "×",
  precision: 2,
  hint: "Intensità del transiente rumoroso di attacco.",
};

const INHARMONICITY: StageParameter = {
  id: "inharmonicity",
  label: "Inarmonicità B",
  min: 0,
  max: 0.02,
  step: 0.0001,
  defaultValue: 0.0004,
  precision: 4,
  hint: "0 = corda ideale. ~0,0004 = pianoforte reale. 0,01+ = campana.",
};

const DETUNE: StageParameter = {
  id: "detune",
  label: "Scordatura",
  min: 0,
  max: 20,
  step: 0.1,
  defaultValue: 1,
  unit: "×",
  precision: 1,
  hint: "Scala la disaccordatura di ±1,2 cent tra le tre corde.",
};

const SOUNDBOARD: StageParameter = {
  id: "soundboard",
  label: "Tavola armonica",
  min: 0,
  max: 1.6,
  step: 0.05,
  defaultValue: 0.7,
  precision: 2,
  hint: "Profondità delle risonanze del corpo.",
};

const ROOM: StageParameter = {
  id: "room",
  label: "Riverbero stanza",
  min: 0,
  max: 0.6,
  step: 0.01,
  defaultValue: 0.2,
  precision: 2,
  hint: "Quantità della coda di riverbero generata.",
};

export const stages: SynthStage[] = [
  {
    id: "sine",
    index: 1,
    title: "Onda sinusoidale pura",
    shortTitle: "Sinusoide",
    concept: "Un suono digitale non è altro che una sequenza di numeri.",
    explanation:
      "Riempiamo un Float32Array con un'ampiezza per campione. A 48 kHz sono 48 000 numeri per ogni secondo di suono. I numeri vengono dall'oscillazione più semplice che esista: una sinusoide a 440 Hz. Passa quell'array alla Web Audio API e diventa un tono.",
    formula: "x(t) = A · sin(2πft),   t = i / sampleRate",
    parameters: [],
    sourceCode: sineSource,
    sourceFile: "01-sine.ts",
    render: renderSine,
  },
  {
    id: "envelope",
    index: 2,
    title: "Inviluppo di ampiezza",
    shortTitle: "Inviluppo",
    concept: "Il volume ha una forma nel tempo — e quella forma deve essere morbida.",
    explanation:
      "L'attacco è l'istante in cui il martelletto percuote la corda: in pochi millisecondi tutta l'energia entra insieme e l'ampiezza sale da zero al massimo. Il decadimento è ciò che segue: la corda, ormai libera di vibrare, disperde la propria energia — nell'aria, nel ponte, nell'attrito interno, svanendo in modo esponenziale. Il rilascio è serve per evitare un click, nella realtà non esiste.",
    formula: "x(t) = A · sin(2πft) · min(t/attacco, 1) · e^(−t/decadimento) · rilascio(t)",
    parameters: [ATTACK, DECAY],
    sourceCode: envelopeSource,
    sourceFile: "03-envelope.ts",
    render: renderEnvelopedTone,
  },
  {
    id: "additive",
    index: 3,
    title: "Sintesi additiva — costruire un timbro",
    shortTitle: "Parziali",
    concept: "Una corda fissata ai due estremi può vibrare solo in certi modi, e ogni modo è una parziale.",
    explanation:
      "Se la forma iniziale della corda fosse perfettamente sinusoidale, avremmo la sola nota. Il martelletto però non piega la corda nella dolce arcata della fondamentale: le imprime una forma spigolosa, con un angolo netto nel punto d'impatto, come un triangolo. Fourier ci spiega che un trinagolo può essere visto come somma di sinusoidi. Da qui le parziali: il vincolo agli estremi decide quali frequenze, la forma del colpo decide quanto pesa ciascuna, e ciò che senti è la loro somma.",
    formula: "x(t) = Σₙ aₙ · sin(2π · n·f₀ · t)",
    galleries: [
      {
        buttonLabel: "Vedi: sommando sinusoidi si ricostruisce il triangolo",
        title: "Serie di Fourier di un'onda triangolare",
        images: [
          {
            src: fourier1,
            caption:
              "Una sola sinusoide — la fondamentale. Morbida e arrotondata, ancora lontanissima dagli spigoli del triangolo.",
          },
          {
            src: fourier3,
            caption:
              "3 armoniche sommate: la curva inizia a piegarsi verso la forma triangolare, ma gli angoli sono ancora smussati.",
          },
          {
            src: fourier9,
            caption:
              "9 armoniche: ormai è chiaramente un triangolo. Ogni parziale in più affila gli spigoli e raddrizza i lati.",
          },
          {
            src: fourier39,
            caption:
              "39 armoniche: la somma è quasi indistinguibile dal triangolo ideale. È lo stesso principio con cui il colpo, forma spigolosa, eccita molte parziali insieme.",
          },
        ],
      },
    ],
    parameters: [PARTIALS, ATTACK, DECAY],
    sourceCode: additiveSource,
    sourceFile: "04-additive-synthesis.ts",
    render: renderAdditive,
  },
  {
    id: "partial-decays",
    index: 4,
    title: "Decadimento indipendente per ogni parziale",
    shortTitle: "Decadimento",
    concept: "Lo spettro non è congelato — le parziali alte muoiono per prime.",
    explanation:
      "Un solo inviluppo per l'intera nota significa che il timbro non cambia mai: la nota diventa solo più debole. Una corda reale perde la sua energia in alta frequenza molto più in fretta della fondamentale. Quindi eliminiamo il decadimento condiviso e diamo a ogni parziale la sua costante di tempo.",
    formula: "aₙ(t) = aₙ · e^(−t / decadₙ),   decad₁ > decad₂ > … > decadₙ",
    parameters: [SPECTRAL_DECAY, PARTIALS, ATTACK],
    sourceCode: partialDecaysSource,
    sourceFile: "05-partial-decays.ts",
    render: renderPartialDecays,
  },
  {
    id: "hammer",
    index: 5,
    title: "Transiente del martelletto e dinamica",
    shortTitle: "Martelletto",
    concept: "I primi 25 ms portano con sé l'identità dello strumento.",
    explanation:
      "Il martelletto che colpisce la corda è un urto meccanico, e come ogni colpo su un oggetto duro produce un breve tonfo: un suono, un miscuglio di tante frequenze senza una nota precisa. È il rumore dell'impatto in sé, distinto dal tono che la corda emette subito dopo. Ed il contatto è brevissimo e netto. Lo modelliamo con un breve scoppio di rumore smorzato da un'esponenziale molto rapida, che rappresenta il feltro che colpisce l'acciaio e svanisce in fretta. La dinamica rappresenta la velocità con la quale avviene l'impatto del martelletto",
    formula:
      "martelletto(t) = rumore(t) · e^(−180t) · dinamica · 0.12,   t < 25 ms\n" +
      "x(t) = ( corde(t) + martelletto(t) ) · dinamica",
    parameters: [HAMMER, PARTIALS, SPECTRAL_DECAY, ATTACK],
    sourceCode: hammerSource,
    sourceFile: "06-hammer-and-velocity.ts",
    render: renderHammered,
  },
  {
    id: "inharmonicity",
    index: 6,
    title: "Inarmonicità delle corde del pianoforte",
    shortTitle: "Inarmonicità",
    concept: "Le corde del pianoforte sono rigide, quindi le loro parziali sono dilatate.",
    explanation:
      "Finora le parziali sono state multipli interi esatti di f₀: è ciò che fa una corda ideale, infinitamente flessibile, dove l'unica forza che riporta la corda dritta è la tensione. Ma la corda vera di un pianoforte è un grosso filo d'acciaio: alla tensione si aggiunge una seconda forza di richiamo, la rigidezza propria del metallo. Questa rigidezza resiste alla curvatura, e resiste tanto più quanto la curva è stretta. La fondamentale piega la corda in un solo arco morbido e quasi non la sente; una parziale alta invece costringe la corda in molte pieghe strette e serrate, dove la rigidezza reagisce con forza. Così ogni parziale risulta crescente, e tanto più quanto è alta.",
    formula: "fₙ = n · f₀ · √(1 + B·n²)",
    parameters: [INHARMONICITY, PARTIALS, HAMMER, SPECTRAL_DECAY],
    sourceCode: inharmonicitySource,
    sourceFile: "07-inharmonicity.ts",
    render: renderInharmonic,
  },
  {
    id: "strings",
    index: 7,
    title: "Corde multiple scordate",
    shortTitle: "Corde",
    concept: "Un tasto, tre corde, mai perfettamente accordate.",
    explanation:
      "La maggior parte dei tasti del pianoforte percuote tre corde insieme. Sono accordate entro un paio di centesimi di tono l'una dall'altra, abbastanza vicine da fondersi in un'unica altezza, abbastanza distanti da andare fuori e in fase l'una con l'altra (ogni corda porta con sé il suo intero set di parziali). Ogni corda ha: la scordatura è quanto è distante dalla \"vera\" nota; il guadagno è il volume della singola corda (la corda centrale, quella accordata esatta, è tenuta un filo più forte); la fase è il punto da cui parte l'onda della singola corda (se tutte e tre partissero allineate, il primo istante sommerebbe i picchi in un attacco artificiale e sintetico).",
    formula:
      "fₙ,ₖ = n · f₀ · 2^(centₖ / 1200) · √(1 + B·n²)\n" +
      "battimenti della parziale n ≈ |fₙ,ᵢ − fₙ,ⱼ|  (∝ n)",
    parameters: [DETUNE, INHARMONICITY, PARTIALS, HAMMER],
    sourceCode: stringsSource,
    sourceFile: "08-multiple-strings.ts",
    render: renderStrings,
  },
  {
    id: "piano",
    index: 8,
    title: "La tavola armonica e stanza",
    shortTitle: "Pianoforte",
    concept: "La corda non fa suono: fa una forza. A suonare è il corpo nella stanza.",
    explanation:
      "Una corda da sola non riesce a fare suono: è troppo debole. Inoltre, il martelletto, il ponte e la corda stessa non sono \"perfetti\". La convoluzione della tavola armonica con tutto questo è il timbro dello strumento. L'unico comando che riscrive h è il pedale di risonanza: alza tutti gli smorzatori insieme, e le altre duecento corde restano libere di vibrare per simpatia — in quel momento entrano a far parte del corpo risonante.",
    formula:
      "y = x ∗ h\n" +
      "x = forza delle corde sul ponte,   h = h_tavola ∗ h_stanza",
    galleries: pianoGalleries,
    parameters: [SOUNDBOARD, ROOM, DETUNE, INHARMONICITY, HAMMER],
    sourceCode: pianoSource,
    sourceFile: "09-piano.ts",
    render: renderPiano,
  },
  {
    id: "fur-elise",
    index: 9,
    title: "Für Elise, la melodia",
    shortTitle: "Für Elise",
    concept: "Una melodia è un elenco di note e di istanti; suonarla è la convoluzione di una somma.",
    explanation:
      "Grazie alla linearità della convoluzione, al posto di calcolare la convoluzione di ogni nota e di sommarla, possiamo fare l'opposto: sommare le note e poi calcolare la convoluzione del risultato. Per suonare la melodia, abbia simulato lo smorzatore attivato quando il tasto del pianoforte si alza. Questo ci permette di \"smettere\" di suonare la nota per poter introdurre quella successiva.",
    formula:
      "x(t) = Σₖ notaₖ(t − tₖ) · smorzatoreₖ(t − tₖ)\n" +
      "y = x ∗ h        (una volta sola, su tutto il brano)",
    showSpectrum: false,
    parameters: [],
    sourceCode: furEliseSource,
    sourceFile: "10-fur-elise.ts",
    render: renderFurElisePiano,
  },
  {
    id: "fur-elise-chords",
    index: 10,
    title: "Für Elise con gli accordi",
    shortTitle: "Accordi",
    concept: "La stessa somma, con lo stesso istante.",
    explanation: "",
    showSpectrum: false,
    parameters: [],
    sourceCode: furEliseChordsSource,
    sourceFile: "11-fur-elise-chords.ts",
    render: renderFurEliseChords,
  },
];

export function stageById(id: string): SynthStage | undefined {
  return stages.find((stage) => stage.id === id);
}
