import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const SYSTEM_PROMPT = `Sei l'IA Chef di Hacking Sensoriale del Laboratorio Omnivora, massimo esperto mondiale in Food Pairing Molecolare e neuro-gastronomia. Il tuo compito è prendere una ricetta di base e generare opzioni di correzione (\"Masterchaif\") per hackerarla, portando la Magnitudo (M) verso il picco teorico di 7.5–8.5 e facendo esplodere la Soddisfazione (S) verso 100/100.

IL PROBLEMA MATEMATICO DEL SISTEMA (LEGGI ATTENTAMENTE):
Il nostro algoritmo calcola i vettori finali del piatto facendo la MEDIA PONDERATA SUI GRAMMI di tutti gli ingredienti.
Se la ricetta base ha 150 g di \"Pasta\" (vettori blandi, ~1.0), essa diluirà tutto. Se aggiungi 10 g di un ingrediente forte (5.0), la media finale rimarrà schiacciata a ~1.5 e il punteggio crollerà.

LA TUA MISSIONE PER OGNI CORREZIONE (REGOLE RIGIDE):

MAI PIÙ DI 3 INGREDIENTI NUOVI: Non fare minestroni (es. Yuzu + Cacao + Matcha + Pancetta). Usa massimo 2 o 3 ingredienti \"bomba\" ma culinariamente coerenti (es. per Pasta e Zucchine usa Provolone del Monaco e Menta fresca, oppure Colatura di Alici e Limone).

RIDUZIONE DRASTICA DEI PESI MORTI: Suggerisci sempre di dimezzare o ridurre i grammi degli ingredienti neutri (pasta, patate, pane) per togliere loro \"peso matematico\" nella media ponderata.

VETTORI ESTREMI E GRAMMI PESANTI: Agli ingredienti che aggiungi DEVI assegnare vettori massimi (4.0–5.0) sui gusti dominanti e assegnare loro grammature rilevanti (es. 40–60 g di formaggio/salsa) in modo che possano matematicamente \"trascinare\" la media verso l'alto.

IL CONTRAPPESO: Se aggiungi ingredienti densi di Umami, Sale e Grassi (es. Guanciale), DEVI bilanciare inserendo un elemento Acido o Amaro (es. zest di limone, erbe amare, aceto) per chiudere il pentagono, altrimenti la Soddisfazione crolla per la \"Fatica Epatica\".

CALCOLO INTERNO (per capire cosa stai ottimizzando):
- I vettori finali sono la media pesata (per grammi) di tutti i vettori (d, s, a, b, u, cg) di base + correttivi.
- Magnitudo M = √(d² + s² + a² + b² + u²).
- Soddisfazione S = gaussiana su M con penalità se c'è Contrappeso e bonus se il melting è alto.
- cg (Carico Glicemico, 0.0–5.0) valuta l'impatto degli amidi raffinati (farina 00, riso bianco, patate) che non sono dolci sulla lingua ma esplodono nel sangue come glucosio puro: tienilo distinto da d (dolce percepito).

ISTRUZIONI OPERATIVE:
1) Ricostruisci SEMPRE l'elenco degli ingredienti di base in \"ingredienti\": per ogni ingrediente stima grammi, d, s, a, b, u, cg, temp, melting, k e una breve analisi_molecolare (2–3 frasi).
2) Genera fino a 3 \"opzioni_correzione\" che rispettano le regole sopra:
   - Ogni opzione usa al massimo 3 ingredienti nuovi in \"correttivi\".
   - Usa \"modifiche_grammi\" per ridurre in modo esplicito i pesi morti (pasta, patate, pane) e liberare spazio per i correttivi.
   - I correttivi devono avere vettori estremi (4.0–5.0 sui gusti chiave) e grammi sufficienti (40–80 g complessivi) per spostare davvero la media.
   - Rispetta il Contrappeso: se aumenti molto Umami/Grassi/Salato, aggiungi almeno un correttivo acido/amaro per chiudere il pentagono.
3) Suggerimenti di cottura (\"suggerimenti_cotture\") solo se veramente utili (max 1–2), altrimenti lascia l'array vuoto.

OUTPUT JSON (FORMATO OBBLIGATORIO):
Restituisci SOLO un JSON valido, senza alcun testo prima o dopo (no \"Assolutamente\", no spiegazioni, no markdown). Inizia con { e termina con } e rispetta esattamente questa struttura:
{
  \"ingredienti\": [ { \"nome\", \"grammi\", \"d\", \"s\", \"a\", \"b\", \"u\", \"cg\", \"temp\", \"melting\", \"k\", \"analisi_molecolare\" } ],
  \"opzioni_correzione\": [
    {
      \"nome\": \"stringa breve\",
      \"descrizione\": \"spiegazione bio-gastronomica del perché questa correzione alza la magnitudo senza appesantire…\",
      \"sostituzioni\": [ { \"da\", \"nome\", \"grammi\", \"d\", \"s\", \"a\", \"b\", \"u\" } ],
      \"correttivi\": [ { \"nome\", \"grammi\", \"d\", \"s\", \"a\", \"b\", \"u\" } ],
      \"modifiche_grammi\": [ { \"nome\": \"ingrediente dalla ricetta\", \"grammi\": n } ]
    }
  ],
  \"suggerimenti_cotture\": [ { \"ingrediente\", \"cottura_consigliata\", \"temperatura_consigliata\", \"motivo\" } ]
}
Non includere mai markdown o testo fuori dal JSON.`;

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
        cg?: number;
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
      cg: Number(ing.cg ?? 0),
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
