import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const SYSTEM_PROMPT = `Sei l'IA Chef di Hacking Sensoriale del Laboratorio Omnivora, massimo esperto mondiale in Food Pairing Molecolare e neuro-gastronomia. Proponi SOLO correzioni che MIGLIORANO magnitudo (M) e soddisfazione (S). Un'opzione che peggiora M o S è SBAGLIATA: non proporla mai.

REGOLA DELLA MAGNITUDO: Vietato "fare la media" o appiattire i valori in caso di abbinamenti dissonanti (es. ostriche e cioccolato bianco). Esalta i picchi vettoriali spingendoli verso i limiti (4.5, 4.8, 5.0) quando c'è densità energetica o sinergia di composti volatili. Non normalizzare verso il centro.

TEOREMA DEL CONTRAPPESO: Se l'utente inserisce cibi con altissimo Umami/Dolce/Salato ma zero Acido/Amaro, il sistema andrà in "Food Coma" (il punteggio Costa Index crollerà). Le opzioni_correzione devono fornire esattamente l'Acido (a) o l'Amaro (b) mancanti per chiudere un "pentagono perfetto" e massimizzare la Soddisfazione.

COMPORTAMENTO PER LE RICETTE: Le opzioni_correzione NON sono consigli salutisti. Sono proposte di ingredienti chimici/molecolari per hacking sensoriale: Yuzu, polvere di Matcha, Finger Lime, acido citrico, lime, pompelmo, cacao amaro, erbe amare, aceti, ecc. — tutto ciò che fornisce (a) o (b) mancanti per bilanciare e massimizzare S.

COME FUNZIONA IL CALCOLO:
- Media pesata (base + correttivi, peso = grammi). M = √(d²+s²+a²+b²+u²), S = gaussiana su M poi −40% se Contrappeso, +15 se melting alto. Picco ideale M ≈ 7,5.
- Per MIGLIORARE: correttivi devono AGGIUNGERE acido (a) e amaro (b) con grammi sufficienti (ingredienti molecolari sopra) così la media si bilancia e S sale. Quantità coraggiose (40–80 g o più per ingrediente ponte) se il base è piccolo o sbilanciato; totale correttivi almeno 80–150 g quando serve. Opzionale: "modifiche_grammi" per riequilibrare. Se non raggiungi S almeno 15–20, restituisci opzioni_correzione: [].

REGOLE OBBLIGATORIE:
1) Solo opzioni che fanno SALIRE M e S. Meglio 1–2 che migliorano davvero che 3 che peggiorano.
2) Solo aggiunte ("correttivi"); "sostituzioni": [] quasi sempre; al massimo UNA opzione con una sola sostituzione.
3) Per piatti che "cozzano": ingredienti ponte molecolari (yuzu, matcha, finger lime, acido citrico, lime, cacao amaro, aceti) in quantità sufficienti; modifiche_grammi se aiuta.

1) Identificare tutti gli ingredienti. Abbinare i nomi all'elenco Supabase quando possibile.
2) Per OGNI ingrediente: grammi (stima), d, s, a, b, u (0-5), temp, melting, k, analisi_molecolare (breve).

3) OPZIONI = SOLO MIRACOLI (M e S devono SALIRE):
   - Prima di includere un'opzione: i correttivi che ho scelto, in media pesata con il base, portano M verso 7,5 e S più in alto? Se no, cambia i correttivi (più acido/amaro se c'è contrappeso, grammi adeguati, profili bilanciati).
   - Correttivi: da 2 a 6 per opzione, con GRAMMI ALTI (40–80 g o più per ingrediente ponte) se il base è piccolo o sbilanciato, così la media pesata porta M verso 7,5 e S almeno 15–20. Opzionale: "modifiche_grammi" per riequilibrare le quantità già in ricetta.
   - Descrizione: spiegare come quella combinazione fa salire M e S.
   - Se non riesci a ottenere (a mente) S almeno 15–20 con le quantità che scegli, AUMENTA i grammi dei correttivi (es. 60 g lime, 50 g pompelmo, 30 g zenzero) oppure restituisci opzioni_correzione: [].

4) Suggerimenti cotture: solo se utili, max 1-2. cottura_consigliata in: crudo, vapore, bollito, griglia, fritto, forno, caramellizzato, affumicato, brasato, stufato, saltato, cartoccio, marinato, scottato, confit, padella, wok, glassato, pickle. Altrimenti suggerimenti_cotture: [].

Restituisci SOLO un JSON valido, senza alcun testo prima o dopo (no "Assolutamente", no spiegazioni, no markdown): inizia con { e termina con }.
{
  "ingredienti": [ { "nome", "grammi", "d", "s", "a", "b", "u", "temp", "melting", "k", "analisi_molecolare" } ],
  "opzioni_correzione": [
    { "nome": "stringa breve", "descrizione": "stringa", "sostituzioni": [ ], "correttivi": [ ], "modifiche_grammi": [ { "nome": "ingrediente dalla ricetta", "grammi": n } ] },
    { "nome": "...", "descrizione": "...", "sostituzioni": [ ... ], "correttivi": [ { "nome", "grammi", "d", "s", "a", "b", "u" } ], "modifiche_grammi": [ ] }
  ],
  "suggerimenti_cotture": [ { "ingrediente", "cottura_consigliata", "temperatura_consigliata", "motivo" } ]
}
Ogni opzione: correttivi molecolari/sensoriali (yuzu, matcha, finger lime, acidi, amari) che chiudono il pentagono d/s/a/b/u e fanno SALIRE M e S. Mai consigli salutisti generici; mai opzioni che peggiorano il piatto. "correttivi" (aggiunte), "sostituzioni" al massimo in una opzione. Se il piatto è già ottimale, opzioni_correzione: [].`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY non configurata' },
      { status: 500 }
    );
  }

  let body: { ricetta?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Body JSON non valido' },
      { status: 400 }
    );
  }

  const ricetta = typeof body.ricetta === 'string' ? body.ricetta.trim() : '';
  if (!ricetta) {
    return NextResponse.json(
      { error: 'Campo "ricetta" obbligatorio' },
      { status: 400 }
    );
  }

  try {
    const { data: rows } = await supabase
      .from('matrice_ingredienti')
      .select('id, nome')
      .limit(400);
    const nomiSupabase = (rows ?? [])
      .map((r: { nome?: string }) => (r as { nome: string }).nome)
      .filter(Boolean)
      .slice(0, 350);
    const elencoSupabase = nomiSupabase.join(', ');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0 },
    });
    const userContent = `Ricetta:\n${ricetta}\n\nElenco ingredienti Supabase (usa questi nomi quando possibile):\n${elencoSupabase}`;
    const result = await model.generateContent(userContent);
    const raw = result.response.text();
    const cleaned =
      (() => {
        const t = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        return start >= 0 && end > start ? t.slice(start, end + 1) : t;
      })();
    const json = JSON.parse(cleaned) as {
      ingredienti?: Array<{
        nome?: string;
        grammi?: number;
        d?: number;
        s?: number;
        a?: number;
        b?: number;
        u?: number;
        temp?: number;
        melting?: number;
        k?: number;
        analisi_molecolare?: string;
      }>;
      opzioni_correzione?: Array<{
        nome?: string;
        descrizione?: string;
        correttivi?: Array<{ nome?: string; grammi?: number; d?: number; s?: number; a?: number; b?: number; u?: number }>;
        sostituzioni?: Array<{ da?: string; nome?: string; grammi?: number; d?: number; s?: number; a?: number; b?: number; u?: number }>;
        modifiche_grammi?: Array<{ nome?: string; grammi?: number }>;
      }>;
      suggerimenti_cotture?: Array<{
        ingrediente?: string;
        cottura_consigliata?: string;
        temperatura_consigliata?: number;
        motivo?: string;
      }>;
    };

    const ingredienti = (json.ingredienti ?? []).map((ing) => ({
      nome: String(ing.nome ?? ''),
      grammi: Math.max(0, Number(ing.grammi ?? 0)),
      d: Number(ing.d ?? 0),
      s: Number(ing.s ?? 0),
      a: Number(ing.a ?? 0),
      b: Number(ing.b ?? 0),
      u: Number(ing.u ?? 0),
      temp: ing.temp !== undefined ? Number(ing.temp) : 20,
      melting: ing.melting !== undefined ? Number(ing.melting) : 0,
      k: ing.k !== undefined ? Number(ing.k) : 0.3,
      analisi_molecolare: typeof ing.analisi_molecolare === 'string' ? ing.analisi_molecolare.trim() : '',
    }));

    const opzioniCorrezione = (json.opzioni_correzione ?? []).slice(0, 3).map((op) => ({
      nome: String(op.nome ?? 'Opzione'),
      descrizione: String(op.descrizione ?? ''),
      correttivi: (op.correttivi ?? []).map((c) => ({
        nome: String(c.nome ?? ''),
        grammi: Math.max(0, Number(c.grammi ?? 0)),
        d: Number(c.d ?? 0),
        s: Number(c.s ?? 0),
        a: Number(c.a ?? 0),
        b: Number(c.b ?? 0),
        u: Number(c.u ?? 0),
      })),
      sostituzioni: (op.sostituzioni ?? []).map((s) => ({
        da: String(s.da ?? ''),
        nome: String(s.nome ?? ''),
        grammi: Math.max(0, Number(s.grammi ?? 0)),
        d: Number(s.d ?? 0),
        s: Number(s.s ?? 0),
        a: Number(s.a ?? 0),
        b: Number(s.b ?? 0),
        u: Number(s.u ?? 0),
      })).filter((s) => s.da && s.nome),
      modifiche_grammi: (op.modifiche_grammi ?? []).map((m) => ({
        nome: String(m.nome ?? '').trim(),
        grammi: Math.max(0, Number(m.grammi ?? 0)),
      })).filter((m) => m.nome),
    }));

    const suggerimentiCotture = (json.suggerimenti_cotture ?? []).map((s) => ({
      ingrediente: String(s.ingrediente ?? ''),
      cottura_consigliata: String(s.cottura_consigliata ?? '').toLowerCase(),
      temperatura_consigliata: s.temperatura_consigliata != null ? Number(s.temperatura_consigliata) : undefined,
      motivo: String(s.motivo ?? ''),
    })).filter((s) => s.ingrediente && s.motivo);

    return NextResponse.json({
      ingredienti,
      opzioni_correzione: opzioniCorrezione,
      suggerimenti_cotture: suggerimentiCotture,
    });
  } catch (err) {
    console.error('Scan Ricetta API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore analisi ricetta' },
      { status: 500 }
    );
  }
}
