# Correzioni apportate e come cambiano i calcoli

Questo documento spiega le modifiche fatte a Ottimizzatore Ricette, API scan-ricetta e visualizzazione, e come cambiano i calcoli dietro le correzioni.

---

## 1. Cosa è stato corretto (in sintesi)

- **API (scan-ricetta):** il modello deve proporre solo correzioni che migliorano **molto** S e M; preferenza per **sostituzioni** (es. pane → pane integrale) invece di sole aggiunte marginali (es. “aggiunta di fichi”).
- **Calcolo delle ricette corrette:** ogni opzione ora si applica con **sostituzioni** (togli un ingrediente, metti il sostituto) + eventuali **correttivi** (aggiunte), poi si ricalcola il piatto dalla nuova lista ingredienti.
- **Interfaccia:** etichette rese più chiare (Sapori, Magnitudo M, Soddisfazione S, ecc.) e messaggi che spiegano l’ideale (M ≈ 7,5, S alto) e quando una correzione è troppo debole.

---

## 2. Come funzionavano i calcoli prima

### Opzioni di correzione (solo “correttivi”)

- Un’opzione era solo una lista di **correttivi** da **aggiungere** alla ricetta (nome, grammi, d, s, a, b, u).
- Il **piatto corretto** era calcolato così:
  - Si consideravano tutti gli ingredienti **originali** + tutti i **correttivi**.
  - Si faceva una **media pesata** (per “peso virtuale”, con condimenti/spezie ≤30 g che pesano 15×) dei vettori (d, s, a, b, u), temperatura, melting, k.
  - Da questo profilo medio si ricalcolavano M e S (soddisfazione adulto, formula Gauss, contrappeso, bonus melting).
- Formula: `piatto_corretto = media_pesata(ingredienti_originali + correttivi)`.

### Problema

- Aggiungendo **un solo ingrediente leggero** (es. 50 g di fichi) a una ricetta già “pesante” (es. 400 g totali), la media pesata si spostava poco → **M e S cambiavano di pochissimo** → sul grafico il punto “Corretto - Aggiunta di Fichi” restava in basso a sinistra e non era utile.

---

## 3. Come funzionano i calcoli ora

### Nuova struttura delle opzioni

Ogni opzione può avere:

- **`sostituzioni`** (opzionale): array di `{ da, nome, grammi, d, s, a, b, u }`
  - **da** = nome dell’ingrediente da **togliere**
  - **nome** = ingrediente **sostituto** (stesso ruolo, profilo migliore)
  - **grammi**, **d, s, a, b, u** = quantità e profilo del sostituto
- **`correttivi`** (come prima): ingredienti da **aggiungere** (nome, grammi, d, s, a, b, u).

### Applicazione di un’opzione (funzione `applyOpzioneToResults`)

Per ogni opzione si costruisce una **nuova lista di ingredienti**:

1. Si parte da una **copia** degli ingredienti della ricetta analizzata (i `ScanResult` originali).
2. **Sostituzioni:** per ogni elemento in `sostituzioni`:
   - si **rimuove** dalla lista l’ingrediente il cui nome coincide con **da** (confronto case-insensitive);
   - si **aggiunge** un nuovo ingrediente con **nome**, **grammi** e profilo **d, s, a, b, u** (con temp/melting/k di default).
3. **Correttivi:** per ogni elemento in `correttivi` si **aggiunge** un nuovo ingrediente con nome, grammi e profilo.
4. Il risultato è la lista “ricetta modificata” (sostituzioni applicate + aggiunte).

Questa lista è un array di `ScanResult` (con magnitudo, soddisfazione, ecc. calcolati per ogni riga dove serve).

### Calcolo del piatto corretto (funzione `computeCorrectedFromResults`)

Per **ogni** opzione:

1. Si ottiene la lista modificata con **`applyOpzioneToResults(scanResults, opzione)`** (sostituzioni + correttivi applicati come sopra).
2. Su questa lista si calcola il **piatto unico** con **`computePiattoFromResults(modifiedList)`**:
   - media pesata (peso virtuale) di d, s, a, b, u, temp, melting, k;
   - da questo profilo medio si ricalcolano M, S (soddisfazione adulto), asseX, asseY;
   - il risultato è un solo `ScanResult` che rappresenta il “piatto corretto” per quell’opzione.
3. Si assegna a questo risultato il nome `"Corretto - [nome opzione]"` e si mette nell’array dei piatti corretti.

Quindi:

- **Prima:** `piatto_corretto = media_pesata(originali + correttivi)` (sempre “tutto originale + aggiunte”).
- **Ora:** `piatto_corretto = computePiattoFromResults(applyOpzioneToResults(originali, opzione))`, dove `applyOpzioneToResults` può **togliere** ingredienti (sostituzioni) e **aggiungere** sostituti e correttivi.

Le formule di **media pesata**, **peso virtuale**, **soddisfazione adulto**, **Magnitudo M**, **S** (Gauss, contrappeso, bonus melting) **non sono cambiate**: cambia solo **da quale insieme di ingredienti** partiamo per calcolare quella media (lista con sostituzioni applicate + eventuali aggiunte).

---

## 4. Prompt API (scan-ricetta) e perché “migliora di pochissimo”

### Regole aggiunte / rafforzate

- **Miglioramento netto:** si devono proporre solo correzioni per cui **S** sale in modo evidente (es. almeno +15–20 punti) e **M** si avvicina a 7,5. Se il miglioramento è marginale, non proporre.
- **Vietato** proporre solo “aggiunta di X” quando X ha **peso piccolo** nella ricetta (es. fichi, erbe): sul grafico il punto resterebbe in basso a sinistra (M e S ancora bassi).
- **Preferenza per le sostituzioni:** proporre di **sostituire** ingredienti con peso rilevante (pane → pane integrale, mozzarella → pecorino, panna → yogurt greco, riso → riso integrale, ecc.) così il profilo (d,s,a,b,u) cambia davvero e M/S si spostano verso l’ideale.
- Se l’unica idea è un’aggiunta marginale, restituire **opzioni_correzione vuoto**.

Quindi le correzioni che “migliorano di pochissimo” non dovrebbero più essere proposte: o il modello suggerisce sostituzioni/aggiunte **impatanti**, o nessuna opzione.

---

## 5. Cosa è stato reso più chiaro in interfaccia

### Nomi e spiegazioni

- **Vettore (d,s,a,b,u)** → **Sapori (0–5):** dolce, salato, acido, amaro, umami (con valori numerici).
- **M** → **Magnitudo M** (intensità complessiva); **S** → **Soddisfazione S** (0–100).
- Aggiunta una frase tipo: *“Ideale: M vicino a 7,5 e S alto. M troppo bassa = piatto poco ‘carico’; M troppo alta = rischio saturazione.”*

### Laboratory Report

- **S_y** → **Soddisfazione S** (con tooltip).
- **M** → **Magnitudo M**.
- **S_base** → **S base** (prima di penalità/bonus).
- **P(t) k** → **Decadimento k** (calo del sapore nel tempo).
- **D** → **Distanza D** (tra profili).

### Card delle opzioni

- Se ci sono **sostituzioni:** sezione “Sostituisci: X → Y (grammi)”.
- Se ci sono **correttivi:** sezione “Aggiungi: …”.
- **Risultato:** “Magnitudo M = … · Soddisfazione S = …/100” + nota: *“Ideale: M ≈ 7,5, S alto. Se M e S restano bassi, la correzione è troppo debole.”*

---

## 6. Riepilogo formule (invariato)

- **Magnitudo:** `M = √(d² + s² + a² + b² + u²)` (scala 0–12 circa).
- **Soddisfazione base:** `S_base = 100 · e^(-(M - 7,5)² / 4,5)`.
- **Penalità contrappeso** (dolce/salato/umami alti, acido+amaro bassi): `S *= 0,6`.
- **Bonus melting** (melting > 4): `S += 15`.
- **Peso virtuale:** per grammi ≤ 30 (condimenti/spezie) il peso usato nella media è `grammi × 15`, altrimenti `grammi`.

La **differenza** è solo **quali ingredienti** entrano in questa media quando calcoli il “piatto corretto”: prima solo originali + correttivi; ora lista ottenuta applicando prima le sostituzioni e poi le aggiunte.

Per la spiegazione completa della logica e l'analisi di tutte le equazioni (S_base, Contrappeso, Anestesia termica, Melting, Loop edonico) vedi **[LOGICA_E_EQUAZIONI.md](./LOGICA_E_EQUAZIONI.md)**.
