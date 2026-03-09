import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Sei l'analizzatore sensoriale del Laboratorio Omnivora. Dato un piatto o un alimento, scomponilo in 11 dimensioni sensoriali (tutte da 0 a 100) e restituisci SOLO un JSON valido, nessun markdown né testo fuori dal JSON.

Chiavi del JSON (tutte numeri tra 0 e 100):
- U: Umami / sapidità profonda (0-100)
- S: Salinità percepita (0-100)
- K: Kokumi / pienezza gusto (0-100)
- G: Grasso / cremosità / texture grassa (0-100)
- A: Acidità (0-100)
- Am: Amarezza (0-100)
- D: Dolcezza (0-100)
- Amil: Amilaceo / farinoso / amidaceo (0-100)
- Cr: Croccantezza / texture (0-100)
- W: Succulenza / umidità / succosità (0-100)
- Ca: Sensazione “calcio” / minerale / astringenza (0-100)

Regole: Valuta il piatto nel suo insieme (ingredienti, cottura, condimenti). Restituisci solo il JSON con queste 11 chiavi, numeri interi o con un decimale.`;

export async function POST(request: Request) {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY non configurata' },
      { status: 500 }
    );
  }

  let body: { cibo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Body JSON non valido' },
      { status: 400 }
    );
  }

  const cibo =
    typeof body.cibo === 'string' ? body.cibo.trim() : '';
  if (!cibo) {
    return NextResponse.json(
      { error: 'Campo "cibo" obbligatorio' },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.2 },
    });
    const result = await model.generateContent(
      `Analizza questo piatto/alimento e restituisci solo il JSON con le 11 dimensioni (U, S, K, G, A, Am, D, Amil, Cr, W, Ca) in scala 0-100:\n\n"${cibo}"`
    );
    const raw = result.response.text();
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json(
        { error: 'L’IA non ha restituito una risposta. Riprova.' },
        { status: 502 }
      );
    }
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    let json: Record<string, number>;
    try {
      json = JSON.parse(cleaned);
    } catch {
      console.error('analizza-cibo: JSON non valido', raw.slice(0, 300));
      return NextResponse.json(
        { error: 'Risposta IA non valida (JSON atteso). Riprova.' },
        { status: 502 }
      );
    }

    const toNum = (v: unknown): number => {
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string') return parseFloat(v) || 0;
      return 0;
    };
    const clamp = (n: number) => Math.min(100, Math.max(0, n));

    const out = {
      U: clamp(toNum(json.U ?? json.u)),
      S: clamp(toNum(json.S ?? json.s)),
      K: clamp(toNum(json.K ?? json.k)),
      G: clamp(toNum(json.G ?? json.g)),
      A: clamp(toNum(json.A ?? json.a)),
      Am: clamp(toNum(json.Am ?? json.am)),
      D: clamp(toNum(json.D ?? json.d)),
      Amil: clamp(toNum(json.Amil ?? json.amil)),
      Cr: clamp(toNum(json.Cr ?? json.cr)),
      W: clamp(toNum(json.W ?? json.w)),
      Ca: clamp(toNum(json.Ca ?? json.ca)),
    };

    return NextResponse.json(out);
  } catch (err) {
    console.error('analizza-cibo:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore durante l’analisi' },
      { status: 500 }
    );
  }
}
