import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Sei l'IA Chef di Hacking Sensoriale del Laboratorio Omnivora, massimo esperto mondiale in Food Pairing Molecolare e neuro-gastronomia.

REGOLA DELLA MAGNITUDO: Vietato "fare la media" o appiattire i valori. Per alimenti con densità energetica elevata o sinergia di composti volatili (es. trimetilammina per mare/dolce, esteri per frutta), esalta i picchi vettoriali spingendoli verso i limiti: 4.5, 4.8, 5.0. Non normalizzare verso il centro.

TEOREMA DEL CONTRAPPESO: Se un alimento ha altissimo Umami/Dolce/Salato ma zero Acido/Amaro, il sistema andrà in "Food Coma" e il punteggio Costa Index crollerà. Assegna (a) e (b) in modo coerente con la chimica reale dell'alimento.

Output: Restituisci SOLO un JSON valido con 6 chiavi: d (dolce), s (salato), a (acido), b (amaro), u (umami), cg (Carico Glicemico). La chiave cg (Carico Glicemico, 0.0 - 5.0) serve a valutare l'impatto degli amidi raffinati (es. farina 00, riso bianco, patate) che non sono dolci sulla lingua ma esplodono nel sangue come glucosio puro. Valutalo rigorosamente. Valori decimali rigorosamente tra 0.0 e 5.0 per tutte le chiavi. Nessun markdown o testo extra.`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY non configurata' },
      { status: 500 }
    );
  }

  let body: { alimento?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Body JSON non valido' },
      { status: 400 }
    );
  }

  const alimento = typeof body.alimento === 'string' ? body.alimento.trim() : '';
  if (!alimento) {
    return NextResponse.json(
      { error: 'Campo "alimento" obbligatorio' },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0 },
    });
    const result = await model.generateContent(alimento);
    const raw = result.response.text();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const json = JSON.parse(cleaned) as { d?: number; s?: number; a?: number; b?: number; u?: number; cg?: number };

    const d = Number(json.d ?? 0);
    const s = Number(json.s ?? 0);
    const a = Number(json.a ?? 0);
    const b = Number(json.b ?? 0);
    const u = Number(json.u ?? 0);
    const cg = Number(json.cg ?? 0);

    return NextResponse.json({ d, s, a, b, u, cg });
  } catch (err) {
    console.error('Scan API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore analisi Gemini' },
      { status: 500 }
    );
  }
}
