import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const SYSTEM_PROMPT = `Sei un analista neurobiologico alimentare secondo il Protocollo Omnivora (Bliss Point, Modelli Psicotecnici).

PRIORITÀ PRINCIPALE: l'utente vuole INGREDIENTI DA AGGIUNGERE che (1) bilancino il piatto, (2) migliorino la MAGNITUDO M, (3) migliorino la SODDISFAZIONE S. Le cotture sono secondarie.

Contesto algoritmi: Magnitudo M = √(d²+s²+a²+b²+u²); picco ideale M ≈ 7,5. Soddisfazione S parte da 100·e^(-(M-7,5)²/4,5), poi si applica −40% se Teorema del Contrappeso violato (dolce/salato/umami dominano, acido+amaro bassi), e +15 se melting alto. Obiettivo: M vicino a 7,5, profilo bilanciato (evitare contrappeso), S più alta possibile.

1) Identificare tutti gli ingredienti presenti nella ricetta. Abbinane i nomi a quelli dell'elenco Supabase quando possibile.

2) Per OGNI ingrediente restituisci: grammi (stima), d, s, a, b, u (0-5), temp, melting, k, analisi_molecolare (breve).

3) OBBLIGATORIO — OPZIONI DI AGGIUNTA INGREDIENTI: fornisci esattamente 2 o 3 opzioni. Ogni opzione deve proporre ingredienti che:
   - BILANCIANO il profilo (d,s,a,b,u): es. aggiungere acido/amaro se mancano, per rispettare il Contrappeso.
   - MIGLIORANO LA MAGNITUDO: se M della ricetta è bassa (<6) suggerire ingredienti che alzano l'intensità sensoriale (grammature e profilo adatti); se M è alta (>9) suggerire ingredienti che bilanciano senza far esplodere M (avvicinare M a 7,5).
   - MIGLIORANO LA SODDISFAZIONE: la combinazione ricetta+correttivi deve tendere a M ≈ 7,5 e a un profilo che non subisca la penalità Contrappeso, così che S aumenti. Scegli correttivi e grammature in modo che il piatto corretto abbia S più alta della ricetta originale.
   Per ogni opzione restituisci SOLO: nome, descrizione (che citi anche l'obiettivo su M e S), correttivi (nome, grammi, d, s, a, b, u; preferibilmente da Supabase). NON generare la ricetta dettagliata in questa risposta (sarà richiesta separatamente).

   DIRETTIVE FERREE per opzioni_correzione:
   - Ignora la Tradizione Culturale: Sei un analista biochimico spietato, non uno chef. Se una ricetta tradizionale (es. Cacio e Pepe, Carbonara, Pesto) viola il Teorema del Contrappeso (troppo grasso/salato/umami e assenza totale di acido/amaro), DEVI proporre dei correttivi per ripristinare l'equilibrio matematico (acido + amaro ≥ P_max/2).
   - Hacking Eretico: Suggerisci opzioni che riequilibrano i vettori anche se sono "eresie culinarie": es. aggiungere scorza di limone, yuzu o polvere di sommacco per l'acidità; polvere di caffè, matcha, cacao amaro o erbe amaricanti per l'amaro.
   - Naming Eretico: Chiama le opzioni con nomi tecnici/avanguardistici (es. "Hacking Acido con Scorza di Limone", "Taglio Lipidico al Sommacco", "Contrasto Amaro al Caffè").
   - Obbligo di Soluzione: Non restituire MAI un array opzioni_correzione vuoto se il piatto di partenza ha Soddisfazione (S_y) inferiore a 85 a causa del Contrappeso fallito. Trova sempre il modo di hackerare il piatto per farlo salire di punteggio.

4) OPZIONALE E SECONDARIO — Suggerimenti cotture: solo se davvero utile, puoi aggiungere al massimo 1-2 suggerimenti su cottura/temperatura per ingredienti già presenti. Usa cottura_consigliata solo tra: crudo, vapore, bollito, griglia, fritto, forno, caramellizzato. Se non essenziale, restituisci array vuoto suggerimenti_cotture.

Restituisci SOLO un JSON valido (nessun markdown):
{
  "ingredienti": [ { "nome", "grammi", "d", "s", "a", "b", "u", "temp", "melting", "k", "analisi_molecolare" } ],
  "opzioni_correzione": [
    { "nome": "Hacking Acido con Scorza di Limone", "descrizione": "stringa", "correttivi": [ { "nome", "grammi", "d", "s", "a", "b", "u" } ] },
    { "nome": "Taglio Lipidico al Sommacco", "descrizione": "stringa", "correttivi": [ ... ] },
    { "nome": "Contrasto Amaro al Caffè", "descrizione": "stringa", "correttivi": [ ... ] }
  ],
  "suggerimenti_cotture": [ { "ingrediente", "cottura_consigliata", "temperatura_consigliata", "motivo" } ]
}
La parte più importante è opzioni_correzione: 2-3 opzioni (con nomi tecnici/avanguardistici) di ingredienti da aggiungere che bilancino il piatto E migliorino magnitudo (M verso 7,5) e soddisfazione (S). Se S_y < 85 per Contrappeso violato, opzioni_correzione NON deve mai essere vuoto. suggerimenti_cotture può essere [].`;

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
    });
    const userContent = `Ricetta:\n${ricetta}\n\nElenco ingredienti Supabase (usa questi nomi quando possibile):\n${elencoSupabase}`;
    const result = await model.generateContent(userContent);
    const raw = result.response.text();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
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
