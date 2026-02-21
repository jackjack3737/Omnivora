import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Sei uno chef. Ricevi una ricetta base, il nome di un'opzione (es. "Opzione A"), l'elenco degli ingredienti base con grammature e l'elenco degli ingredienti da aggiungere (correttivi) con grammature.

Devi generare una RICETTA MOLTO DETTAGLIATA per quella opzione: stessa ricetta base ma con i correttivi integrati. Restituisci SOLO un JSON valido (nessun markdown) con una chiave "passaggi" che è un array di stringhe. Ogni stringa è un passaggio numerato della procedura.

Requisiti:
- Almeno 8-15 passaggi. Scrivi in italiano.
- Per ogni passaggio indica quantità (grammi, cucchiai, ecc.), tempi (minuti), temperature (°C o fuoco) dove applicabile.
- Includi: preparazione ingredienti base, ordine delle operazioni, cotture con tempi e temperature, momento esatto in cui aggiungere ogni correttivo, eventuale riposo o raffreddamento, impiattamento e servizio.
- Procedura replicabile e chiara (es. "1. Lavare e asciugare i 150 g di pomodori. Tagliarli a cubetti. 2. In una ciotola unire... 3. Cuocere in padella a 120 °C per 8 minuti. 4. Aggiungere i 20 g di limone (succo) e mescolare. 5. ...").
- Non aggiungere testo fuori dal JSON.`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurata' }, { status: 500 });
  }

  let body: {
    ricetta?: string;
    nome_opzione?: string;
    ingredienti?: Array<{ nome: string; grammi?: number }>;
    correttivi?: Array<{ nome: string; grammi?: number }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const ricetta = typeof body.ricetta === 'string' ? body.ricetta.trim() : '';
  const nomeOpzione = typeof body.nome_opzione === 'string' ? body.nome_opzione.trim() : '';
  const ingredienti = Array.isArray(body.ingredienti) ? body.ingredienti : [];
  const correttivi = Array.isArray(body.correttivi) ? body.correttivi : [];

  if (!ricetta || !nomeOpzione) {
    return NextResponse.json(
      { error: 'Campi "ricetta" e "nome_opzione" obbligatori' },
      { status: 400 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const ingredientiText = ingredienti
      .map((i) => `${i.nome}: ${i.grammi ?? 0} g`)
      .join('\n');
    const correttiviText = correttivi
      .map((c) => `${c.nome}: ${c.grammi ?? 0} g`)
      .join('\n');

    const userContent = `Ricetta base:\n${ricetta}\n\nOpzione: ${nomeOpzione}\n\nIngredienti base (con grammature):\n${ingredientiText}\n\nIngredienti da aggiungere (correttivi, con grammature):\n${correttiviText}\n\nGenera la ricetta dettagliata (passaggi con pesi, tempi di cottura, temperature). Restituisci SOLO JSON: { "passaggi": [ "1. ...", "2. ...", ... ] }`;

    const result = await model.generateContent(userContent);
    const raw = result.response.text();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const json = JSON.parse(cleaned) as { passaggi?: string[] };
    const passaggi = Array.isArray(json.passaggi)
      ? json.passaggi.map((p) => String(p ?? '').trim()).filter(Boolean)
      : [];

    return NextResponse.json({ passaggi });
  } catch (err) {
    console.error('Scan Ricetta Genera error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore generazione ricetta' },
      { status: 500 }
    );
  }
}
