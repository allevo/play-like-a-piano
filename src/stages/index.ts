import { renderSine } from "./01-sine.ts";
import sineSource from "./01-sine.ts?raw";
import { renderEnvelopedTone } from "./03-envelope.ts";
import envelopeSource from "./03-envelope.ts?raw";
import { renderAdditive } from "./04-additive-synthesis.ts";
import additiveSource from "./04-additive-synthesis.ts?raw";
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
    listenFor:
      "Un tono stabile, puro, palesemente artificiale. È un'altezza, ma niente in esso dice 'strumento'. Nota il click alla fine — nulla dice all'onda di fermarsi in modo graduale.",
    lookFor:
      "Una sinusoide perfettamente regolare, e uno spettro con esattamente un picco a 440 Hz. Tutto ciò che aggiungeremo da qui in poi è un modo di dare più struttura a questa immagine.",
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
      "Accendere e spegnere un'onda di colpo è una discontinuità, e una discontinuità è energia a banda larga: un click. Moltiplichiamo invece l'onda per un inviluppo — un attacco rapido, un decadimento esponenziale come una corda percossa che perde energia, e un breve rilascio che garantisce che il buffer finisca a zero.",
    formula: "inviluppo(t) = min(t/attacco, 1) · e^(−t/decadimento) · rilascio(t)",
    listenFor:
      "Ora la nota ha un inizio e una fine. Smette di comportarsi come un tono di prova lasciato acceso e inizia a comportarsi come qualcosa che è stato percosso. Il click è sparito.",
    lookFor:
      "La forma d'onda cresce in pochi millisecondi e poi decade. Ingrandisci a 50 ms per vedere la rampa d'attacco al posto di un fronte verticale.",
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
    concept: "Un timbro è una fondamentale più una pila di parziali.",
    explanation:
      "Una singola sinusoide ha altezza e volume ma nessun carattere. Aggiungi sinusoidi a 2×, 3×, 4× … la fondamentale, ciascuna più debole della precedente, e il tono acquista un colore. È l'idea di Fourier al contrario: invece di scomporre un suono, ne componiamo uno.",
    formula: "x(t) = Σₙ aₙ · sin(2π · n·f₀ · t)",
    listenFor:
      "Trascina il numero di parziali da 1 a 12. A 1 è la sinusoide della fase 1; a 5 è un tono più brillante e nasale, con corpo. Non è più un fischio — ma è ancora statico.",
    lookFor:
      "Lo spettro fa crescere un pettine di picchi a 440, 880, 1320, 1760, 2200 Hz. La forma d'onda è ancora perfettamente periodica, solo non più una sinusoide.",
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
    listenFor:
      "La nota parte brillante e si scurisce mentre risuona — il passo singolo più importante per suonare come una corda percossa e non come un organo.",
    lookFor:
      "Alterna lo spettro tra Iniziale e Finale. I picchi alti sono forti all'inizio della nota e quasi spariti verso la fine, mentre la fondamentale è ancora lì.",
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
      "Non sono le parziali in regime stazionario a farci riconoscere un pianoforte — è l'attacco. Aggiungiamo un breve scoppio di rumore, modellato da un'esponenziale molto rapida, a rappresentare il feltro che colpisce l'acciaio. Il rumore viene da un PRNG con seme, quindi le stesse impostazioni producono sempre lo stesso buffer. La dinamica smette allora di essere un controllo di volume: i colpi più forti sono più intensi, più percussivi e più brillanti.",
    formula: "martelletto(t) = rumore(t) · e^(−180t) · dinamica · 0.12,   t < 25 ms",
    listenFor:
      "Imposta la dinamica a 0,15, poi a 1,0. La nota forte non è la nota debole col volume alzato: ha più colpo e molto più mordente in alta frequenza.",
    lookFor:
      "Ingrandisci la forma d'onda a 50 ms: ora un picco rumoroso precede la parte periodica. Lo spettro iniziale ha un pavimento di alte frequenze più alto.",
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
      "Finora le nostre parziali sono state multipli interi esatti di f₀ — ciò che farebbe una corda ideale, infinitamente flessibile. La corda reale di un pianoforte resiste alla flessione, e la rigidezza spinge ogni parziale leggermente crescente, tanto più quanto è alta. Il coefficiente B è minuscolo, ed è gran parte del motivo per cui un pianoforte non è un organo.",
    formula: "fₙ = n · f₀ · √(1 + B·n²)",
    listenFor:
      "A B = 0 il tono è pulito e un po' sintetico. A 0,0004 acquista una tensione sottile. Portalo a 0,01 e diventa metallico, poi simile a una campana — lo stesso codice, uno strumento diverso.",
    lookFor:
      "Le guide tratteggiate segnano le armoniche ideali n·440 Hz. I picchi reali vi si posano in fondo allo spettro e si spostano progressivamente alla loro destra man mano che si sale.",
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
      "La maggior parte dei tasti del pianoforte percuote tre corde insieme. Sono accordate entro un paio di cent l'una dall'altra — abbastanza vicine da fondersi in un'unica altezza, abbastanza distanti da andare fuori e in fase l'una con l'altra. Quella lenta interferenza è il coro, lo scintillio, la 'vitalità' dello strumento.",
    formula: "rapporto = 2^(cent / 1200),   battimenti ≈ |f₁ − f₂| Hz",
    listenFor:
      "Con una scordatura di 0 la nota è morta e sintetica. A 1× respira. Alza la scordatura e il battimento diventa un'oscillazione udibile, poi un honky-tonk.",
    lookFor:
      "Scegli lo zoom dello spettro 'Intorno a f₀': l'unico picco a 440 Hz si separa in un piccolo grappolo di componenti ravvicinate.",
    parameters: [DETUNE, INHARMONICITY, PARTIALS, HAMMER],
    sourceCode: stringsSource,
    sourceFile: "08-multiple-strings.ts",
    render: renderStrings,
  },
  {
    id: "piano",
    index: 8,
    title: "Modello finale del pianoforte — tavola armonica e stanza",
    shortTitle: "Pianoforte",
    concept: "La corda è una sorgente; lo strumento è un corpo in una stanza.",
    explanation:
      "Una corda da sola è quasi inudibile. Mette in moto una grande tavola armonica di legno, che ha le proprie risonanze, e la tavola irradia in una stanza, che rimanda riflessioni. Entrambe sono filtri lineari, quindi facciamo passare i campioni della fase 7 attraverso un grafo di normali nodi Web Audio dentro un OfflineAudioContext — biquad per il corpo, un convolver con una risposta all'impulso generata proceduralmente per la stanza — e riotteniamo un semplice buffer che riproduciamo esattamente come nella fase 1.",
    formula: "y = stanza( tavola( corde(t) ) ),  reso offline",
    listenFor:
      "Un La4 (A4) di pianoforte riconoscibile. Porta la stanza a 0 e la tavola armonica a 0 per riascoltare le corde nude, poi rialzale: la nota smette di essere un esperimento e inizia a essere uno strumento.",
    lookFor:
      "La forma d'onda ora ha una coda che dura oltre le corde. Lo spettro mostra la colorazione del corpo anziché le ampiezze grezze delle parziali.",
    parameters: [SOUNDBOARD, ROOM, DETUNE, INHARMONICITY, HAMMER],
    sourceCode: pianoSource,
    sourceFile: "09-piano.ts",
    render: renderPiano,
  },
];

export function stageById(id: string): SynthStage | undefined {
  return stages.find((stage) => stage.id === id);
}
