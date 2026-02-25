import 'package:supabase_flutter/supabase_flutter.dart';

import '../masterchaif_engine/models/sensory_ingredient.dart';
import '../core/config/supabase_config.dart';

/// Repository per gli ingredienti da Supabase.
/// - matrice_ingredienti: id, nome_alimento, v_dolcezza_d, ... (sensory + macro)
/// - matrice_microelementi: id (= ingrediente id), fatigue_predictor, metabolic_window_score,
///   glycogen_burn_rate, neuro_satiety_index, cognitive_clarity_quotient, ...
class IngredientsRepository {
  SupabaseClient get _supabase {
    if (!SupabaseConfig.isConfigured) {
      throw StateError(
        'Supabase non configurato. Crea un file .env con SUPABASE_URL e SUPABASE_ANON_KEY (copia da .env.example).',
      );
    }
    return Supabase.client;
  }

  /// Cerca ingredienti per nome (ilike su nome_alimento) e arricchisce con matrice_microelementi (join su id).
  Future<List<SensoryIngredient>> searchByName(String query) async {
    if (query.trim().isEmpty) return [];

    final res = await _supabase
        .from('matrice_ingredienti')
        .select()
        .eq('stato_approvazione', 'approved')
        .ilike('nome_alimento', '%${query.trim()}%');

    final list = res as List<dynamic>? ?? [];
    if (list.isEmpty) return [];

    final ids = list
        .map((e) => (e as Map)['id']?.toString())
        .whereType<String>()
        .where((id) => id.isNotEmpty)
        .toList();

    final microById = <String, Map<String, dynamic>>{};
    if (ids.isNotEmpty) {
      try {
        final microRes = await _supabase
            .from('matrice_microelementi')
            .select()
            .in_('id', ids);
        final microList = microRes as List<dynamic>? ?? [];
        for (final m in microList) {
          final map = Map<String, dynamic>.from(m as Map);
          final id = map['id']?.toString();
          if (id != null) microById[id] = map;
        }
      } catch (_) {
        // Tabella microelementi assente o errore: continuiamo senza
      }
    }

    return list.map((e) {
      final base = Map<String, dynamic>.from(e as Map);
      final id = base['id']?.toString();
      final micro = id != null ? microById[id] : null;
      if (micro != null) {
        base['fatigue_predictor'] = micro['fatigue_predictor'];
        base['metabolic_window_score'] = micro['metabolic_window_score'];
        base['glycogen_burn_rate'] = micro['glycogen_burn_rate'];
        base['neuro_satiety_index'] = micro['neuro_satiety_index'];
        base['cognitive_clarity_quotient'] = micro['cognitive_clarity_quotient'];
      }
      return SensoryIngredient.fromJson(base);
    }).toList();
  }
}
