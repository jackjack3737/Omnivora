import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config/supabase_config.dart';
import 'masterchaif_engine/masterchaif_engine.dart';
import 'ui/screens/abbinamenti_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: '.env');
    final url = dotenv.env['SUPABASE_URL'] ?? '';
    final anonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';
    if (url.isNotEmpty && anonKey.isNotEmpty) {
      SupabaseConfig.set(url, anonKey);
      await Supabase.initialize(url: url, anonKey: anonKey);
    }
  } catch (_) {
    // .env assente o Supabase non configurato: l'app parte uguale, Abbinamenti mostrerà errore
  }
  runApp(const OmnivoraApp());
}

class OmnivoraApp extends StatelessWidget {
  const OmnivoraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Omnivora',
      theme: ThemeData.dark(useMaterial3: true),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Omnivora'),
        backgroundColor: Colors.grey[900],
      ),
      backgroundColor: Colors.grey[900],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            title: const Text('Abbinamenti'),
            subtitle: const Text('Cerca ingredienti da Supabase e valuta l\'abbinamento con il Masterchaif Engine'),
            leading: const Icon(Icons.restaurant, color: Colors.green),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AbbinamentiScreen())),
          ),
          const Divider(color: Colors.grey),
          ListTile(
            title: const Text('Demo Engine'),
            subtitle: const Text('Due ingredienti fittizi: Pomodoro + Mozzarella'),
            leading: const Icon(Icons.science, color: Colors.amber),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MasterchaifEngineDemoPage())),
          ),
        ],
      ),
    );
  }
}

class MasterchaifEngineDemoPage extends StatelessWidget {
  const MasterchaifEngineDemoPage({super.key});

  @override
  Widget build(BuildContext context) {
    final ingredients = [
      SensoryIngredient(
        id: '1',
        nome: 'Pomodoro',
        vDolcezzaD: 1.5,
        vSalinitaS: 0.3,
        vAciditaA: 3.2,
        vAmarezzaB: 0.2,
        vSapiditaU: 2.0,
        indiceGrassoTexture: 0.1,
        viscositaAdesivita: 0.3,
        succulenzaUmidita: 0.8,
        croccantezzaSuono: 0.2,
        temperaturaServizioIdeale: 18,
        freschezzaBalsamica: 0.7,
      ),
      SensoryIngredient(
        id: '2',
        nome: 'Mozzarella',
        vDolcezzaD: 0.5,
        vSalinitaS: 1.8,
        vAciditaA: 0.2,
        vAmarezzaB: 0.1,
        vSapiditaU: 3.5,
        indiceGrassoTexture: 0.6,
        viscositaAdesivita: 0.7,
        succulenzaUmidita: 0.6,
        croccantezzaSuono: 0.1,
        temperaturaServizioIdeale: 22,
        freschezzaBalsamica: 0.3,
      ),
    ];

    final result = SensoryLogicEngine.evaluate(ingredients);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Masterchaif Engine'),
        backgroundColor: Colors.grey[900],
      ),
      backgroundColor: Colors.grey[900],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Dissonanza Culinaria D_c',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.red[300]),
          ),
          Text('${result.dissonanzaCulinariaDc.toStringAsFixed(4)}', style: const TextStyle(color: Colors.white, fontSize: 18)),
          const SizedBox(height: 16),
          Text(
            'Soddisfazione Sensoriale S_s',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.green[300]),
          ),
          Text('${result.soddisfazioneSensorialeSs.toStringAsFixed(4)}', style: const TextStyle(color: Colors.white, fontSize: 18)),
          const SizedBox(height: 24),
          _buildRow('C_a', result.collisioneAntagonistaCa),
          _buildRow('I_s', result.incompatibilitaStrutturaleIs),
          _buildRow('E_p', result.elementiPonteEp),
          _buildRow('ΔT', result.deltaTermico),
          _buildRow('E_g', result.equilibrioGustiEg),
          _buildRow('M_t', result.matriceTattileMt),
        ],
      ),
    );
  }

  Widget _buildRow(String label, double value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value.toStringAsFixed(4), style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }
}
