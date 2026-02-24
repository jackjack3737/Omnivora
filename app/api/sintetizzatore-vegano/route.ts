import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Sei il Sintetizzatore Vegano del Laboratorio Omnivora. Il tuo scopo è proporre versioni vegane di piatti onnivori (sapore e texture) FATTIBILI IN CASA. La ricetta deve essere A PROVA DI SCEMMO: chi non ha mai cucinato deve riuscirci.

VINCOLI OBBLIGATORI:

1) LISTA INGREDIENTI CON GRAMMI (campo "ingredienti"):
- PRIMA della ricetta fornisci SEMPRE un array "ingredienti" con TUTTI gli ingredienti e i grammi esatti.
- Ogni elemento: { "nome": "Nome ingrediente", "grammi": numero }. Esempio: { "nome": "Tofu naturale", "grammi": 200 }, { "nome": "Sale", "grammi": 5 }.
- Niente "q.b." o "un pizzico": per sale, pepe, olio, spezie indica sempre grammi (es. sale 5 g, olio 30 g, pepe 1 g). Per l'acqua puoi usare grammi o ml (es. "Acqua" 200 per 200 ml).
- Tutti gli ingredienti che servono devono essere in lista, così chi cucina fa la spesa una volta e ha tutto.

2) RICETTA A PROVA DI SCEMMO (campo "processo_termodinamico"):
- Ogni passaggio è UNA SOLA azione chiara. Niente "preparare il soffritto" senza dire come: scrivi "Mettere la padella sul fuoco a fiamma media. Aggiungere 30 g di olio. Quando l'olio è caldo, aggiungere la cipolla tritata e mescolare. Cuocere 5 minuti finché la cipolla è morbida e trasparente."
- Indica sempre: fiamma (bassa / media / alta), tempi in minuti, cosa guardare ("quando bolle", "quando è dorato"). Nessuna abbreviazione: scrivi "grammi" e "minuti" per intero se serve.
- Ordine logico: prima si preparano gli ingredienti (tritare, pesare), poi si cuoce. Chi segue non deve indovinare nulla.

3) DOMESTICA:
- Ingredienti SOLO da supermercato/negozio bio. Attrezzatura: fornelli, forno, frullatore, padelle, pentole. Niente strumenti da laboratorio.

REGOLE DI SINTESI:
- Mantieni il carattere del piatto: se l'originale è cremoso o umami, la versione vegana deve esserlo usando tecniche casalinghe (frullare, addensare con amido, lievito alimentare, ecc.).
- Fornisci i vettori target (d, s, a, b, u, cg, melting, temp, k) come stima dell'esperienza sensoriale del piatto finale.
- In "architettura": usa "molecole" come lista di ingredienti reali e comuni (es. "Latte di soia", "Lievito alimentare", "Salsa di soia"); "scopo" spiega in una frase perché quell’elemento dà sapore/texture.

OUTPUT RICHIESTO (SOLO JSON VALIDO, NESSUN TESTO EXTRA):
{
"nome_sintesi": "Nome del piatto (es. V-Carbonara)",
"vettori_target": { "d": 1.5, "s": 2.5, "a": 0.5, "b": 0.0, "u": 4.0, "cg": 1.0, "melting": 3.5, "temp": 55, "k": 0.3 },
"ingredienti": [
  { "nome": "Tofu naturale", "grammi": 200 },
  { "nome": "Latte di soia", "grammi": 100 },
  { "nome": "Sale", "grammi": 5 },
  { "nome": "Olio evo", "grammi": 30 }
],
"architettura": [
  { "componente": "Base cremosa", "molecole": ["Tofu", "Latte di soia"], "scopo": "Dà cremosità e corpo senza uova." }
],
"processo_termodinamico": [
  "Mettere una pentola d'acqua sul fuoco a fiamma alta. Quando l'acqua bolle, aggiungere 10 g di sale e la pasta. Cuocere il tempo indicato sulla confezione (es. 8 minuti), mescolando ogni tanto.",
  "Nel frattempo: mettere il tofu in una ciotola e schiacciarlo con una forchetta fino a farlo a pezzetti. Aggiungere il latte di soia e 3 g di sale. Mescolare.",
  "In una padella a fiamma media versare l'olio. Quando è caldo, aggiungere la crema di tofu e scaldare 2 minuti senza far bollire. Spegnere il fuoco.",
  "Scolare la pasta, tenendo da parte un mestolo di acqua di cottura. Versare la pasta nella padella con la crema, aggiungere 2-3 cucchiai di acqua di cottura e mescolare. Servire subito."
]
}
`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurata' }, { status: 500 });

  let body: { piatto_originale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 });
  }

  const piatto = typeof body.piatto_originale === 'string' ? body.piatto_originale.trim() : '';
  if (!piatto) return NextResponse.json({ error: 'Campo "piatto_originale" obbligatorio' }, { status: 400 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM_PROMPT });
    const result = await model.generateContent(`Sintetizza questo piatto in versione vegana SEMPLICE e A PROVA DI SCEMMO: lista ingredienti con grammi precisi (niente q.b.), poi passaggi chiarissimi uno per uno (fiamma, tempi, cosa guardare). Solo ingredienti e attrezzatura da casa: ${piatto}`);

    let raw = result.response.text();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    const cleaned = firstBrace >= 0 && lastBrace > firstBrace ? raw.slice(firstBrace, lastBrace + 1) : raw;

    const json = JSON.parse(cleaned);
    return NextResponse.json(json);
  } catch (err) {
    console.error('Errore Sintetizzatore:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Errore sintesi Gemini' }, { status: 500 });
  }
}
