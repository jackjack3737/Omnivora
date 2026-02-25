import 'package:flutter/material.dart';

import '../../data/ingredients_repository.dart';
import '../../masterchaif_engine/masterchaif_engine.dart';

class AbbinamentiScreen extends StatefulWidget {
  const AbbinamentiScreen({super.key});

  @override
  State<AbbinamentiScreen> createState() => _AbbinamentiScreenState();
}

class _AbbinamentiScreenState extends State<AbbinamentiScreen> {
  final _repo = IngredientsRepository();
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();

  List<SensoryIngredient> _searchResults = [];
  List<SensoryIngredient> _selected = [];
  bool _loading = false;
  String? _error;
  SensoryLogicResult? _result;

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final q = _searchController.text.trim();
    if (q.isEmpty) {
      setState(() {
        _searchResults = [];
        _error = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _searchResults = [];
    });
    try {
      final list = await _repo.searchByName(q);
      setState(() {
        _searchResults = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
        _searchResults = [];
      });
    }
  }

  void _select(SensoryIngredient ing) {
    setState(() {
      if (_selected.any((e) => e.id == ing.id)) {
        _selected = _selected.where((e) => e.id != ing.id).toList();
      } else {
        _selected = [..._selected, ing];
      }
      _result = null;
    });
  }

  void _evaluate() {
    if (_selected.length < 2) return;
    setState(() {
      _result = SensoryLogicEngine.evaluate(_selected);
    });
  }

  String _verdict(SensoryLogicResult r) {
    if (r.dissonanzaCulinariaDc >= 0.4 || r.collisioneAntagonistaCa >= 0.5) {
      return 'Abbinamento sconsigliato (dissonanza alta)';
    }
    if (r.soddisfazioneSensorialeSs >= 1.2 && r.dissonanzaCulinariaDc < 0.25) {
      return 'Ottimo abbinamento';
    }
    if (r.soddisfazioneSensorialeSs >= 0.7 && r.dissonanzaCulinariaDc < 0.4) {
      return 'Buon abbinamento';
    }
    if (r.dissonanzaCulinariaDc >= 0.3) {
      return 'Abbinamento discutibile';
    }
    return 'Abbinamento neutro';
  }

  Color _verdictColor(SensoryLogicResult r) {
    if (r.dissonanzaCulinariaDc >= 0.4 || r.collisioneAntagonistaCa >= 0.5) return Colors.red;
    if (r.soddisfazioneSensorialeSs >= 1.2 && r.dissonanzaCulinariaDc < 0.25) return Colors.green;
    if (r.soddisfazioneSensorialeSs >= 0.7 && r.dissonanzaCulinariaDc < 0.4) return Colors.lightGreen;
    if (r.dissonanzaCulinariaDc >= 0.3) return Colors.orange;
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Abbinamenti'),
        backgroundColor: Colors.grey[900],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    focusNode: _searchFocus,
                    decoration: InputDecoration(
                      hintText: 'Cerca ingrediente...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    onSubmitted: (_) => _search(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _loading ? null : _search,
                  child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Cerca'),
                ),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(_error!, style: TextStyle(color: Colors.red[300], fontSize: 12)),
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                if (_searchResults.isNotEmpty) ...[
                  const Text('Risultati (tap per selezionare)', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(height: 4),
                  ..._searchResults.map((ing) {
                    final selected = _selected.any((e) => e.id == ing.id);
                    final microLine = ing.fatiguePredictor != null || ing.metabolicWindowScore != null
                        ? ' · Fatigue ${ing.fatiguePredictor?.toStringAsFixed(1) ?? '—'} · Window ${ing.metabolicWindowScore?.toStringAsFixed(1) ?? '—'}'
                        : '';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 6),
                      color: selected ? Colors.green.shade900.withValues(alpha: 0.3) : null,
                      child: ListTile(
                        title: Text(ing.nome),
                        subtitle: Text(
                          'T° ${ing.temperaturaServizioIdeale.toStringAsFixed(0)} · Crocc ${ing.croccantezzaSuono.toStringAsFixed(2)}$microLine',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: selected ? const Icon(Icons.check_circle, color: Colors.green) : null,
                        onTap: () => _select(ing),
                      ),
                    );
                  }),
                ],
                if (_selected.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text('Selezionati (${_selected.length})', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _selected.map((ing) => Chip(
                      label: Text(ing.nome),
                      onDeleted: () => _select(ing),
                    )).toList(),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _selected.length >= 2 ? _evaluate : null,
                    icon: const Icon(Icons.analytics),
                    label: const Text('Valuta abbinamento'),
                  ),
                ],
                if (_result != null) ...[
                  const SizedBox(height: 24),
                  Card(
                    color: Colors.grey[850],
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_verdict(_result!), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _verdictColor(_result!))),
                          const SizedBox(height: 12),
                          _row('Dissonanza D_c', _result!.dissonanzaCulinariaDc, Colors.red),
                          _row('Soddisfazione S_s', _result!.soddisfazioneSensorialeSs, Colors.green),
                          const Divider(height: 20),
                          _row('C_a', _result!.collisioneAntagonistaCa, null),
                          _row('I_s', _result!.incompatibilitaStrutturaleIs, null),
                          _row('E_p', _result!.elementiPonteEp, null),
                          _row('ΔT', _result!.deltaTermico, null),
                          _row('E_g', _result!.equilibrioGustiEg, null),
                          _row('M_t', _result!.matriceTattileMt, null),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, double value, Color? color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: color ?? Colors.grey)),
          Text(value.toStringAsFixed(4), style: TextStyle(color: color ?? Colors.white, fontFamily: 'monospace')),
        ],
      ),
    );
  }
}
