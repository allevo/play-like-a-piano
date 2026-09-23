# Suona una nota di pianoforte — I numeri dietro il suono

Una demo interattiva per un talk tecnico. Parte da un'onda sinusoidale a 440 Hz
e, in otto passi, la trasforma in una nota di pianoforte sintetizzata e
riconoscibile — mostrando la forma d'onda che ogni passo genera e il suo
spettro. La nona e ultima sezione prende quella nota e ci suona l'inizio di
Für Elise, con la sinusoide della fase 1 e con il pianoforte della fase 8.

Ogni campione è calcolato dall'applicazione. Non ci sono file audio, né
registrazioni di un pianoforte reale, né richieste di rete a runtime.

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # tsc + vite build
npm run test     # vitest (92 test)
```

Richiede un browser moderno con la Web Audio API. Chrome, Firefox, Safari ed
Edge funzionano tutti.

## Tastiera

| Tasto | Azione |
| --- | --- |
| `←` / `→` | Fase precedente / successiva |
| `Spazio` | Suona o ferma la nota corrente |

Le frecce sono disattivate mentre un campo di input ha il focus. `Spazio` suona
sempre.

> Nota sulla notazione: le altezze usano la notazione scientifica anglosassone
> (A4 = 440 Hz), uno standard internazionale trattato qui come un simbolo, alla
> pari di "Hz". A = La, quindi A4 corrisponde al La centrale di riferimento.

## Le nove sezioni

| # | Fase | File | Cosa aggiunge |
| --- | --- | --- | --- |
| 1 | Sinusoide | `01-sine.ts` | Un suono è un array di numeri: `x(t) = A·sin(2πft)` |
| 2 | Inviluppo | `03-envelope.ts` | Attacco, decadimento esponenziale, rilascio — niente più click |
| 3 | Parziali | `04-additive-synthesis.ts` | Sintesi additiva: una fondamentale più le armoniche |
| 4 | Decadimento | `05-partial-decays.ts` | Ogni parziale ha il suo tempo di decadimento, così il timbro si scurisce |
| 5 | Martelletto | `06-hammer-and-velocity.ts` | Un transiente di rumore con seme; la dinamica cambia la brillantezza, non solo il volume |
| 6 | Inarmonicità | `07-inharmonicity.ts` | Le corde rigide dilatano le parziali: `fₙ = n·f₀·√(1 + Bn²)` |
| 7 | Corde | `08-multiple-strings.ts` | Tre corde a un paio di cent di distanza, che battono l'una contro l'altra |
| 8 | Pianoforte | `09-piano.ts` | Biquad della tavola armonica e una stanza generata, resi offline |
| 9 | Für Elise | `10-fur-elise.ts` | Una melodia è una somma di note a istanti diversi |

I file conservano la numerazione originale del talk, che aveva anche una fase
"Frequenza e ottave" (`02`) poi assorbita nella prima.

## Architettura

```text
src/
  main.ts                  punto di ingresso
  app.ts                   collegamenti: stato, ciclo di rendering, trasporto
  styles.css

  audio/                   infrastruttura condivisa
    audio-engine.ts        l'unico AudioContext e l'unica sorgente
    audio-buffer.ts        Float32Array <-> AudioBuffer
    offline-processing.ts  rendering con OfflineAudioContext (fasi 8 e 9)
    deterministic-random.ts  PRNG con seme (mulberry32)
    fft.ts                 FFT radix-2, finestra di Hann, spettri in dB
    math.ts                semitoni, cent, frequenze delle parziali, nomi delle note
                           (`noteName`) e il loro inverso (`frequencyOfNote`)
    safety.ts              soft limiter, misura del picco

  stages/                  codice didattico — un modulo per fase
    types.ts               RenderSettings, RenderResult, SynthStage
    index.ts               metadati delle fasi + testi di presentazione
    01-sine.ts … 09-piano.ts
    10-fur-elise.ts        la partitura e il mixer che somma le note

  ui/                      navigazione, carosello di immagini, scorciatoie
  visualizations/          superficie canvas, forma d'onda, spettro
    assets/                le sole immagini non generate: la tavola di Chladni
  tests/                   vitest
```

La divisione è voluta. L'**infrastruttura** è scritta come scriveresti del
codice di produzione: condivisa, fattorizzata, testata. Le **fasi** sono scritte
per un pubblico — ognuna è un modulo piccolo e leggibile che ripete un po' della
fase precedente, così che la differenza tra l'una e l'altra sia la lezione. Non
rifattorizzare via la duplicazione in `src/stages/`; è proprio il punto.

### Il pannello del codice non può mentire

Il modulo di ogni fase viene importato due volte: una per la sua funzione
`render`, e una come testo.

```ts
import { renderSine } from "./01-sine.ts";
import sineSource from "./01-sine.ts?raw";
```

Il pannello mostra la regione tra `// TALK_START` e `// TALK_END`, ed evidenzia
le righe tra `// BEGIN_NEW` e `// END_NEW`. Le righe marcatore vengono rimosse.
Poiché il testo mostrato *è* il file in esecuzione, non esiste uno snippet
mantenuto a mano che possa divergere dal codice che produce il suono.

> I commenti all'interno di `src/stages/*` sono in inglese, come nella versione
> originale. Se vuoi proiettarli in italiano durante il talk, traducili nei file
> sorgente: il pannello mostra sempre e comunque il codice reale.

### Perché `AudioBuffer`?

Ogni fase produce un `Float32Array`. Lo avvolgiamo in un `AudioBuffer` e lo
riproduciamo con un `AudioBufferSourceNode`. Questo significa che:

* i numeri che il pubblico vede nel codice sono esattamente i numeri che
  arrivano agli altoparlanti;
* la forma d'onda e lo spettro sono calcolati dallo stesso buffer, quindi i
  grafici non possono mai contraddire il suono;
* il rendering è deterministico e può essere testato in Node, senza browser;
* la riproduzione è tre righe e non può fallire dal vivo.

### Perché non `AudioWorklet`, e perché non Tone.js?

Un `AudioWorklet` è lo strumento giusto per uno strumento in tempo reale, ma
sposta la sintesi in uno scope separato con un proprio ciclo di vita e scambio
di messaggi — molta più macchineria da spiegare, e una cosa in più che si può
rompere sul palco. Non ci serve il tempo reale: la nota è breve, quindi la
rendiamo in anticipo.

Tone.js (o qualsiasi libreria di sintesi) nasconderebbe proprio la cosa di cui
parla il talk. Il punto è tutto qui: la nota di pianoforte è un ciclo `for` su
`Math.sin`.

La fase 8 usa dei nodi Web Audio — filtri biquad e un convolver — perché una
tavola armonica e una stanza *sono* davvero filtri lineari, e riscrivere un
biquad a mano non insegnerebbe nulla di nuovo. È anche l'unica fase con tre
popup esplicativi (`src/visualizations/piano-galleries.ts`): perché una corda
nuda non riesce a irradiare, come si svolge una convoluzione discreta passo per
passo, e cosa sono fisicamente `x` e `h`. Girano dentro un
`OfflineAudioContext`, che rende il grafo in un `AudioBuffer`, così la
riproduzione resta semplice come nella fase 1.

### Politica audio dei browser

I browser rifiutano di avviare l'audio senza un gesto dell'utente. L'`AudioContext`
viene perciò creato in modo lazy, dentro il gestore del pulsante Suona, e
ripreso se sospeso:

```ts
if (audioContext.state === "suspended") {
  await audioContext.resume();
}
```

Niente tocca l'hardware audio prima del primo click. Le anteprime generate prima
di quel primo gesto assumono 48 kHz; una volta che l'AudioContext esiste,
l'app rigenera al sample rate reale dell'hardware.

### Suonare una melodia

La fase 9 non aggiunge sintesi: rende ogni nota della partitura con le stesse
funzioni delle fasi precedenti — cambia solo `frequency` — e le **somma** in un
unico `Float32Array` all'offset di campioni che spetta a ciascuna. La polifonia
è un'addizione, e non serve nessuno scheduler.

Due dettagli non ovvi:

* **Lo smorzatore.** La corda della fase 7 decade in ~3,4 s, quindi a questo
  tempo una nota è ancora al 96 % quando arriva la successiva. Su un pianoforte
  vero lo smorzatore ricade sulla corda al rilascio del tasto. Lo modelliamo
  rendendo ogni nota per la sua durata scritta più una coda, e passando quella
  stessa coda alla rampa di rilascio della fase 2.
* **Un corpo solo.** Le corde asciutte si sommano *prima* della tavola armonica
  e della stanza, che girano una volta sola sull'intero brano. Un pianoforte ha
  una tavola armonica sola e sta in una stanza sola — ed è anche l'unico modo
  perché resti veloce: una convoluzione invece di ventisette.

### Determinismo

Il rumore del martelletto e la risposta all'impulso della stanza vengono da un
PRNG con seme, mai da `Math.random()`. La stessa fase con le stesse impostazioni
produce sempre lo stesso buffer — bit per bit. I test ci contano, e ci conta
anche il talk: un confronto A/B è onesto solo se B non è leggermente diverso
ogni volta.

## Risoluzione dei problemi

**Nessun suono.** Il primo suono richiede un vero click o una pressione di
tasto. Clicca Suona una volta. Verifica che la scheda non sia in muto e che
l'indicatore di picco non mostri `−∞ dBFS`.

**L'indicatore di picco diventa rosso.** L'uscita è entro 0,5 dB dal fondo
scala. Il soft limiter evita la distorsione, ma abbassa la dinamica o il numero
di parziali se vuoi più margine.

**Uno slider non produce nulla di udibile.** Muovere uno slider rigenera i
grafici ma non suona. Premi Spazio (o Suona) per sentire la modifica — di
proposito, così chi presenta non è mai colto di sorpresa da una nota.

**Für Elise impasta.** Le note si sovrappongono di proposito, ma il bilancio è
tarato con due sole costanti in `src/stages/10-fur-elise.ts`: `DAMPER_SECONDS`
(quanto a lungo lo smorzatore lascia suonare una nota dopo il rilascio) e
`PIANO_NOTE_GAIN` (quanto piano entra ogni nota nella somma).
Alzare la coda impasta e costa CPU; abbassarla rende il tutto staccato.

**Il layout è compresso.** È pensato per 1440×900 e 1920×1080. Sotto i 1200 px
di larghezza il pannello del codice e i grafici si impilano e la pagina scorre.

Vedi `TALK_GUIDE.md` per il copione della presentazione.
