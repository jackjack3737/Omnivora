# Omnivora Mobile

App Flutter con **Masterchaif Engine** (Sensory Logic) per la valutazione dell’abbinamento tra ingredienti.

## Struttura

- **`lib/masterchaif_engine/`** — Core matematico
  - **`models/sensory_ingredient.dart`** — Modello ingrediente con vettori sensoriali (allineato al DB remoto).
  - **`sensory_logic_engine.dart`** — Formule Dissonanza Culinaria e Soddisfazione Sensoriale.

## Formule

- **Dissonanza Culinaria:** \( D_c = \frac{C_a \cdot I_s}{1 + E_p} \)
- **Soddisfazione Sensoriale:** \( S_s = (E_g \cdot M_t \cdot (1 + \Delta T)) - D_c \)

Indici: \( C_a \) Collisione Antagonista, \( I_s \) Incompatibilità Strutturale, \( E_p \) Elementi Ponte, \( \Delta T \) Delta Termico, \( E_g \) Equilibrio Gusti, \( M_t \) Matrice Tattile.

## Uso

```dart
import 'package:omnivora_mobile/masterchaif_engine/masterchaif_engine.dart';

final ingredients = [
  SensoryIngredient.fromJson(await fetchFromApi(...)),
  SensoryIngredient.fromJson(await fetchFromApi(...)),
];
final result = SensoryLogicEngine.evaluate(ingredients);
// result.dissonanzaCulinariaDc, result.soddisfazioneSensorialeSs, ...
```

## Supabase (per Abbinamenti)

1. Copia `.env.example` in `.env`.
2. Inserisci `SUPABASE_URL` e `SUPABASE_ANON_KEY` (gli stessi del progetto web / Vercel).
3. Le tabelle `matrice_ingredienti` e `matrice_microelementi` devono esistere in Supabase (come nel web).

Senza `.env` l’app parte uguale; aprendo **Abbinamenti** e cercando vedrai un messaggio che chiede di configurarli.

## Run

```bash
cd mobile
flutter pub get
flutter run
```

Dalla home puoi aprire **Abbinamenti** (cerca ingredienti, seleziona 2+, valuta) o **Demo Engine** (Pomodoro + Mozzarella fittizi).
