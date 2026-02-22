import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Sei l'IA Chef di Hacking Sensoriale del Laboratorio Omnivora, massimo esperto mondiale in Food Pairing Molecolare e neuro-gastronomia.

REGOLA DELLA MAGNITUDO: Vietato "fare la media" o appiattire i valori vettoriali. Per alimenti con densità energetica elevata o sinergia di composti volatili (es. trimetilammina per mare/dolce, esteri per frutta), esalta i picchi spingendoli verso i limiti: 4.5, 4.8, 5.0. Non normalizzare verso il centro in caso di abbinamenti dissonanti.

TEOREMA DEL CONTRAPPESO: Se l'alimento ha altissimo Umami/Dolce/Salato ma zero o bassissimo Acido/Amaro, il sistema andrà in "Food Coma" e il punteggio Costa Index crollerà. Assegna (a) e (b) in modo coerente con la chimica reale; violazione quando temp≥6 e acido+amaro < max(dolce,salato,umami)/2 → effetto stucchevole.

Per l'alimento richiesto restituisci SOLO un JSON valido con le seguenti chiavi (nessun markdown, nessun testo fuori dal JSON):

- d, s, a, b, u: numeri decimali tra 0.0 e 5.0 (dolce, salato, acido, amaro, umami).
- temp: numero, temperatura di consumo tipica in °C. Opzionale; default 20.
- melting: numero 0-5, intensità texture melting/cremoso. Opzionale; default 0.
- k: numero 0-1, costante di decadimento sensoriale. Opzionale; default 0.3.
- analisi_molecolare: stringa. Analisi in italiano con termini Omnivora: 1) Magnitudo Mk = √(d²+s²+a²+b²+u²) e commento. 2) Teorema del Contrappeso: rispettato/violato (…). 3) Se freddo (temp<6°C): Anestesia Termica. 4) Se Mk>8 e k>0,5: Loop Edonico.`;

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
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json(
        { error: 'Gemini non ha restituito testo. Riprova.' },
        { status: 502 }
      );
    }
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let json: {
      d?: number;
      s?: number;
      a?: number;
      b?: number;
      u?: number;
      temp?: number;
      melting?: number;
      k?: number;
      analisi_molecolare?: string;
    };
    try {
      json = JSON.parse(cleaned);
    } catch {
      console.error('Scan API: JSON non valido', raw.slice(0, 300));
      return NextResponse.json(
        { error: 'Risposta Gemini non valida (JSON atteso). Riprova.' },
        { status: 502 }
      );
    }

    const d = Number(json.d ?? 0);
    const s = Number(json.s ?? 0);
    const a = Number(json.a ?? 0);
    const b = Number(json.b ?? 0);
    const u = Number(json.u ?? 0);
    const temp = json.temp !== undefined ? Number(json.temp) : 20;
    const melting = json.melting !== undefined ? Number(json.melting) : 0;
    const k = json.k !== undefined ? Number(json.k) : 0.3;
    const analisi_molecolare =
      typeof json.analisi_molecolare === 'string' ? json.analisi_molecolare.trim() : '';

    return NextResponse.json({
      d,
      s,
      a,
      b,
      u,
      temp,
      melting,
      k,
      analisi_molecolare,
    });
  } catch (err) {
    console.error('Scan API error:', err);
    const msg = err instanceof Error ? err.message : 'Errore analisi Gemini';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
