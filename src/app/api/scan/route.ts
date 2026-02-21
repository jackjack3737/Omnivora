import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT =
  "Sei un analista biochimico alimentare. Valuta l'alimento richiesto e restituisci SOLO un JSON valido con 5 chiavi: d (dolce), s (salato), a (acido), b (amaro), u (umami). I valori devono essere numeri decimali compresi rigorosamente tra 0.0 e 5.0. Non aggiungere formattazione markdown o testo extra.";

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM_PROMPT });
    const result = await model.generateContent(alimento);
    const raw = result.response.text();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const json = JSON.parse(cleaned) as { d?: number; s?: number; a?: number; b?: number; u?: number };

    const d = Number(json.d ?? 0);
    const s = Number(json.s ?? 0);
    const a = Number(json.a ?? 0);
    const b = Number(json.b ?? 0);
    const u = Number(json.u ?? 0);

    return NextResponse.json({ d, s, a, b, u });
  } catch (err) {
    console.error('Scan API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore analisi Gemini' },
      { status: 500 }
    );
  }
}
