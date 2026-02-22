# Logica e equazioni del modello Omnivora

Questo documento spiega tutta la logica dietro gli indicatori (Magnitudo, Soddisfazione, Contrappeso, Anestesia termica, Melting, Loop edonico) senza modificare il grafico: le formule restano qui e nella legenda testuale.

---

## 1. Equazione della Soddisfazione base (S_base)

Determina la **soddisfazione teorica** in funzione della sola Magnitudo: è la curva gialla nel grafico (M in ascissa, S in ordinata).

$$
S_{base} = 100 \cdot e^{-\frac{(M - 7{,}5)^2}{4{,}5}}
$$

- **M (Magnitudo):** intensità totale del sapore, norma del vettore dei 5 gusti (dolce, salato, acido, amaro, umami in scala 0–5):
  $$M = \sqrt{d^2 + s^2 + a^2 + b^2 + u^2}$$
- **7,5:** Bliss Point teorico di intensità per un adulto: il picco della campana, dove S_base = 100.
- **4,5:** coefficiente di tolleranza della curva (ampiezza della campana): più è grande, più la soddisfazione scende lentamente allontanandosi da M = 7,5.

La curva gialla nel grafico è **solo** S_base(M). I pallini (ricette) usano invece la **soddisfazione finale** dopo le correzioni descritte sotto.

---

## 2. Teorema del Contrappeso (legge di tensione)

Agisce come **moltiplicatore di abbattimento** se l’alimento manca di complessità (acido/amaro) per bilanciare la spinta energetica (dolce/salato/umami).

**Condizione:** se la somma di acidità e amarezza è troppo bassa rispetto al massimo tra dolce, salato e umami:

$$
(a + b) < \frac{P_{max}}{2} \quad \Rightarrow \quad S_{finale} = S_{base} \cdot 0{,}6
$$

- **a, b:** valori di Acidità e Amarezza (0–5).
- **P_max:** massimo tra Dolce (d), Salato (s) e Umami (u).

In altre parole: se dolce/salato/umami dominano e acido+amaro sono bassi, il modello classifica il piatto come potenzialmente **stucchevole** (Satiety Crash) e applica una penalità del 40% sulla soddisfazione. Nel codice: `if (contrappeso) S *= 0.6`.

---

## 3. Anestesia termica (F_cold)

Modifica la **percezione** dello squilibrio in base alla temperatura di servizio (effetto “Kinder Choco Fresh”): il freddo inibisce i recettori del dolce e del grasso.

**Regola:**

$$
\text{Se } T < 6°C \quad \Rightarrow \quad \text{non si applica la penalità Contrappeso}
$$

Nel codice la condizione per applicare il contrappeso è `temp >= 6` (sulla scala usata dal modello); sotto quella soglia la penalità viene **ignorata**, quindi S resta su S_base (più eventuale bonus melting). Così si può consumare una Magnitudo elevata a temperatura fredda senza che il modello applichi il crollo da “stucchevole”.

---

## 4. Bonus di Hacking meccanico (Texture Melting)

Simula l’**appagamento istantaneo** dato dalla fusione dei grassi a temperatura corporea (effetto “Lindor”).

**Formula di riferimento:**

$$
S_{hacked} = S_{finale} + (15 \cdot O_{score} \cdot \text{Melting})
$$

Nel codice attuale la regola è semplificata: se **Melting > 4** (su scala 0–5), si aggiunge un bonus fisso di **+15** alla soddisfazione (con eventuale moltiplicatore O_score se usato). Melting rappresenta la velocità di fusione del grasso in bocca.

---

## 5. Algoritmo di persistenza e Loop edonico

Misura il **decadimento temporale** del sapore e la spinta compulsiva al riacquisto.

**Decadimento:**

$$
P(t) = P_0 \cdot e^{-kt}
$$

- **k:** costante di decadimento (quanto velocemente il sapore “sparisce” dopo il picco).

**Condizione di Loop edonico:**

$$
(M > 8) \land (k > 0{,}5) \quad \Rightarrow \quad \text{COMPULSIVE LOOP}
$$

Se la Magnitudo è molto alta (M > 8) e il sapore decade rapidamente (k > 0,5), il modello segnala un **loop edonico**: il cervello riceve un picco violento che si esaurisce in fretta e tende a richiedere una nuova stimolazione immediata (fame edonica). In interfaccia questo viene segnalato come “LOOP EDONICO DETECTED” (non viene codificato sul grafico).

---

## 6. Ordine di applicazione (in codice)

1. Si calcola **M** dal vettore (d, s, a, b, u).
2. Si calcola **S_base** con la formula gaussiana (punto 1).
3. Se **temp >= 6** e **(a + b) < P_max/2** → si applica il **Contrappeso**: S = S_base × 0,6 (il punto 3 dice che sotto 6°C questa penalità non si applica).
4. Se **melting > 4** → **Bonus melting**: S += 15.
5. S viene limitata in [0, 100].
6. **Loop edonico** è solo una bandiera (M > 8 e k > 0,5), non modifica S.

Il grafico mostra la curva S_base(M) (gialla) e i punti (M, S_finale) delle ricette; le equazioni sopra spiegano perché un punto può stare sotto la curva (contrappeso) o sopra (melting, o assenza di contrappeso per freddo).

---

## Riferimenti nel codice

- **indicatori.ts:** `soddisfazioneAdulto`, `dettaglioCalcolo`, calcolo di M e S_base.
- **page.tsx:** disegno della curva gialla (`yVal = 100 * Math.exp(-(m - 7.5)^2 / 4.5)`), pallini con S finale; legenda del grafico.
- **CORREZIONI_E_CALCOLI.md:** come cambiano i calcoli quando si applicano sostituzioni e correttivi alle ricette.
