# Guida al talk — Suona una nota di pianoforte

Un percorso di 35–45 minuti. Ogni fase qui sotto dà il concetto, la formula, la
modifica al codice, cosa dire, cosa suonare e cosa indicare.

**Prima di iniziare**

* `npm run dev`, browser a schermo intero, verifica il dispositivo di uscita
  audio.
* Suona la fase 1 una volta durante l'introduzione, così il gesto audio
  richiesto dal browser è già speso e la prima demo *vera* non può inciampare.
* La nota predefinita è A4 = 440 Hz. Ogni fase suona la stessa nota, quindi
  l'unica cosa che cambia tra una fase e l'altra è l'algoritmo.
* `Spazio` suona. `←` `→` si spostano. `R` reimposta una fase che hai stravolto.

> Le altezze sono in notazione scientifica anglosassone (A4 = 440 Hz), uno
> standard internazionale. A = La: se preferisci, in italiano leggile come La3,
> La4, La5.

---

## Apertura — 3 min

Domanda: cos'*è* un suono, per un computer?

Risposta: un elenco di numeri. 48 000 al secondo, ciascuno la posizione del cono
dell'altoparlante in quell'istante. Tutto questo talk parla di come scegliere
bene quei numeri.

Alla fine avremo una nota di pianoforte, e non ci sarà nessun pianoforte da
nessuna parte — nessuna registrazione, nessun campione, nessuna libreria. Solo
aritmetica.

---

## Fase 1 — Onda sinusoidale pura — 4 min

**Concetto.** Un suono digitale è una sequenza di campioni.

**Formula.** `x(t) = A · sin(2πft)`, con `t = i / sampleRate`.

**Codice.** Un `Float32Array`, un ciclo `for`, una chiamata a `Math.sin`. Indica
la riga che trasforma l'*indice* del campione in un *tempo* — è tutto il ponte
tra "array" e "suono".

**Dì.** "Questo è il più piccolo programma sonoro completo che esista. Sample
rate, indice, tempo, frequenza, sinusoide. Niente altro."

**Suona.** A4. Poi A3 e A5 (`1`, `2`, `3`).

**Ascolta.** Un tono puro, stabile, palesemente artificiale. Inoltre: un click
alla fine — richiama l'attenzione su di esso, e prometti di risolverlo tra due
fasi.

**Osserva.** Una sinusoide perfetta. Un picco spettrale a 440 Hz. "Tutto il
resto del talk serve a dare più struttura a questa immagine."

---

## Fase 2 — Frequenza e ottave — 3 min

**Concetto.** L'altezza è frequenza. Un'ottava è un fattore due.

**Formula.** `rapporto = 2^(semitoni / 12)`.

**Modifica al codice.** Niente nel generatore. Solo il numero che gli passiamo.

**Dì.** "220, 440, 880. Stessa nota, tre ottave. L'orecchio percepisce un
raddoppio come 'la stessa cosa, più in alto' — ecco perché dodici passi uguali
di radice dodicesima di due è il compromesso su cui ci siamo messi d'accordo
tutti."

**Fai.** Premi `1`, `2`, `3` in sequenza. Poi trascina **Trasposizione** a `+12`
e indietro; nota il raddoppio della frequenza.

**Osserva.** Il picco spettrale scorre; la forma d'onda resta invariata.

**Non** farti trascinare in una digressione sui sistemi di accordatura. È una
conversazione da cinque minuti senza fondo.

---

## Fase 3 — Inviluppo di ampiezza — 5 min

**Concetto.** Il volume ha una forma, e i bordi di quella forma devono essere
morbidi.

**Formula.** `inviluppo(t) = min(t/attacco, 1) · e^(−t/decadimento) · rilascio(t)`

**Modifica al codice.** `edgeGain()` (le rampe in entrata e in uscita) e
`amplitudeEnvelope()` (il decadimento esponenziale). Il campione viene
moltiplicato per esso.

**Dì.** "Il click della fase 1 non era un difetto dell'altoparlante. Accendere
un'onda all'istante è una discontinuità a gradino, e un gradino contiene tutte
le frequenze insieme. La correzione non è un trucco — è la fisica: le cose reali
iniziano e finiscono gradualmente."

**Suona.** Confronta con la fase 1 (`←`, suona, `→`, suona).

**Cambia.** Porta **Attacco** al massimo (200 ms) — la nota ora cresce come una
corda strofinata, non percossa. Riportalo a ~8 ms. Porta **Decadimento** a 6 s e
poi a 0,2 s: organo contro pizzicato.

**Ascolta.** La nota ha un inizio e una fine. Nessun click.

**Osserva.** Passa la forma d'onda a **Primi 50 ms** per vedere la rampa
d'attacco dove prima c'era il fronte verticale.

---

## Fase 4 — Sintesi additiva — 5 min

**Concetto.** Un timbro è una fondamentale più una pila di parziali.

**Formula.** `x(t) = Σₙ aₙ · sin(2π · n·f₀ · t)`

**Modifica al codice.** Una tabella di parziali, e una somma dentro il ciclo dei
campioni. Nota la compensazione di guadagno: le sinusoidi si sommano, quindi
dividiamo per il totale.

**Dì.** "Fourier dice che ogni suono periodico si scompone in sinusoidi.
Applicalo al contrario: possiamo *costruire* un timbro sommando sinusoidi. È qui
che il suono smette di essere un tono di prova."

**Cambia.** Trascina **Parziali** da 1 a 12, suonando a ogni passo. A 1 sei di
nuovo alla fase 1 — vale la pena dirlo ad alta voce.

**Ascolta.** Più brillante, più nasale, con corpo. Ma ancora congelato: diventa
solo più debole, mai più scuro.

**Osserva.** Un pettine di picchi a 440, 880, 1320, 1760, 2200 Hz.

---

## Fase 5 — Decadimenti indipendenti delle parziali — 5 min

**Concetto.** Lo spettro evolve. Le parziali alte muoiono per prime.

**Formula.** `aₙ(t) = aₙ · e^(−t / decadₙ)` con `decad₁ > decad₂ > … > decadₙ`.

**Modifica al codice.** Il decadimento condiviso è sparito. Ogni parziale nella
tabella ha ora il proprio tempo di decadimento, applicato nel ciclo delle
parziali.

**Dì.** "Una corda reale perde l'energia in alta frequenza più in fretta — è
quell'energia ad avere più da perdere. Questa singola modifica è il passo più
grande verso un suono percosso anziché soffiato."

**Cambia.** **Decadimento spettrale** a 3× (la brillantezza persiste, quasi come
un clavicembalo) e a 0,2× (la nota si spegne subito).

**Ascolta.** Brillante all'inizio, scura mentre risuona.

**Osserva.** Imposta lo spettro su **Entrambi**: la traccia arancione 'finale' ha
perso i picchi alti mentre la traccia blu 'iniziale' li ha ancora. La
fondamentale sopravvive.

---

## Fase 6 — Martelletto e dinamica — 6 min

**Concetto.** I primi 25 ms sono ciò che rende riconoscibile uno strumento.

**Formula.** `martelletto(t) = rumore(t) · e^(−180t) · dinamica · 0.12`, per
`t < 25 ms`

**Modifica al codice.** Un PRNG con seme, uno scoppio di rumore sotto
un'esponenziale molto rapida, e un termine di dinamica che inclina anche le
ampiezze delle parziali: `brillantezza^(n−1)`.

**Dì.** "Riproduci la registrazione di una nota di pianoforte tagliando i primi
30 millisecondi e la maggior parte delle persone dirà 'organo'. L'attacco porta
con sé l'identità. E nota il seme — `Math.random()` renderebbe ogni rendering
diverso, e allora nessun confronto A/B in questo talk sarebbe onesto."

**Cambia.** **Dinamica** a 0,15, suona. Poi a 1,0, suona.

**Ascolta.** La nota forte non è la nota debole col volume alzato. Ha colpo e
mordente. È la differenza tra una manopola del volume e uno strumento musicale.

**Osserva.** Forma d'onda su **Primi 50 ms**: un picco rumoroso davanti alla
parte periodica. Porta **Martelletto** a 3× per renderlo inequivocabile, poi
riporta a 1.

---

## Fase 7 — Inarmonicità — 5 min

**Concetto.** Le corde del pianoforte sono rigide, quindi le loro parziali non
sono multipli esatti.

**Formula.** `fₙ = n · f₀ · √(1 + B·n²)`

**Modifica al codice.** `partialFrequency()`. Le frequenze delle parziali sono
calcolate una volta, prima del ciclo, invece di essere `n × f₀`.

**Dì.** "Tutto finora ha assunto una corda ideale — infinitamente flessibile. La
corda reale di un pianoforte resiste alla flessione, e quella rigidezza spinge
ogni parziale leggermente crescente, tanto più quanto si sale. B vale circa
0,0004 al centro della tastiera. È un numero minuscolo ed è gran parte del
motivo per cui un pianoforte non è un organo. È anche perché gli accordatori
'stirano' le ottave."

**Cambia.** **Inarmonicità B** da 0 → 0,0004 → 0,005 → 0,02, suonando ognuno.

**Ascolta.** 0 è pulito e sintetico. 0,0004 ha tensione. 0,01 è metallico. 0,02
è una campana — stesso codice, strumento diverso.

**Osserva.** Le guide tratteggiate sono le armoniche ideali. Con B alto i picchi
reali stanno visibilmente alla loro destra, e la distanza cresce col numero di
parziale.

---

## Fase 8 — Corde multiple scordate — 5 min

**Concetto.** Un tasto, tre corde, mai perfettamente accordate.

**Formula.** `rapporto = 2^(cent / 1200)`; due corde a distanza `Δf` battono a
`Δf` Hz.

**Modifica al codice.** Tre corde, ciascuna con la propria scordatura, guadagno
e fase iniziale, ciascuna che genera un intero set di parziali inarmoniche.

**Dì.** "Un accordatore non rende identiche le tre corde. Non possono esserlo, e
non devono esserlo. A un paio di cent di distanza, vanno fuori e in fase l'una
con l'altra, e quella lenta interferenza è ciò che udiamo come calore."

**Cambia.** **Scordatura** a 0 — la nota diventa morta e sintetica. Torna a 1×.
Poi a 10× per un'oscillazione udibile, e 20× per un honky-tonk.

**Ascolta.** Movimento. La nota respira invece di stare ferma.

**Osserva.** Imposta l'intervallo dello spettro su **Intorno a f₀**: l'unico
picco a 440 Hz si separa in un grappolo. (A 1× la separazione è una frazione di
hertz — dillo, e alza la scordatura per renderla visibile.)

---

## Fase 9 — Tavola armonica e stanza — 6 min

**Concetto.** La corda è la sorgente; lo strumento è un corpo in una stanza.

**Formula.** `y = stanza( tavola( corde(t) ) )`, reso offline.

**Modifica al codice.** I campioni della fase 8 entrano in un
`OfflineAudioContext`: tre filtri peaking e un passa-basso per il corpo, un
convolver per la stanza. La risposta all'impulso è generata — rumore in
decadimento dallo stesso PRNG con seme. Ne esce un `AudioBuffer`, e lo
riproduciamo esattamente come nella fase 1.

**Dì.** "Una corda che vibra muove pochissima aria. Mette in moto una grande
tavola di legno, che ha risonanze proprie, e la tavola mette in moto una stanza,
che risponde. Entrambe sono filtri lineari — quindi è l'unico punto in cui userò
volentieri i nodi Web Audio invece di scrivere la matematica a mano. Qui niente
è in tempo reale e niente è un AudioWorklet."

**Cambia.** **Riverbero stanza** a 0 e **Tavola armonica** a 0 — le corde nude.
Poi rialzale.

**Ascolta.** Un pianoforte. Non un grande pianoforte, ma inequivocabilmente un
pianoforte.

**Osserva.** La coda della forma d'onda dura oltre le corde; lo spettro mostra
la colorazione del corpo anziché le ampiezze grezze delle parziali.

---

## Chiusura: il confronto rapido — 3 min

Torna alla fase 1 e cammina in avanti, suonando ogni fase una volta. Dì solo
l'etichetta di una parola. L'effetto cumulativo è tutto il talk in quaranta
secondi:

```text
1  Sinusoide pura
2  Ottave
3  Inviluppo
4  Armoniche
5  Decadimento indipendente
6  Transiente del martelletto + dinamica
7  Inarmonicità
8  Corde multiple
9  Pianoforte finale
```

Poi chiudi: "Nove passi. Ognuno è una formula che sta su una riga, e un pezzo di
fisica che puoi spiegare in una frase. Non c'è nessun pianoforte in questo
programma — solo numeri che concordano con il modo in cui funziona un
pianoforte."

---

## Tempi

| Sezione | Minuti |
| --- | --- |
| Apertura | 3 |
| Fase 1 | 4 |
| Fase 2 | 3 |
| Fase 3 | 5 |
| Fase 4 | 5 |
| Fase 5 | 5 |
| Fase 6 | 6 |
| Fase 7 | 5 |
| Fase 8 | 5 |
| Fase 9 | 6 |
| Confronto rapido + chiusura | 3 |
| **Totale** | **50 con le domande; ~40 se tieni il ritmo** |

Per stare in 35 minuti: accorcia la fase 2 a un minuto, e non mostrare i valori
estremi degli slider nelle fasi 5 e 8.

## Se qualcosa va storto

* **Nessun suono.** Clicca Suona col mouse — dopo un ricaricamento della pagina
  una pressione di tasto potrebbe non valere come gesto. Verifica il dispositivo
  di uscita.
* **Una fase suona male.** Premi `R`. Probabilmente hai lasciato uno slider a un
  valore estremo.
* **Hai perso il segno.** Le linguette delle fasi in alto sono cliccabili.
* **La scheda è andata in background e l'audio è morto.** Clicca Suona;
  l'AudioContext si riprende da solo.
