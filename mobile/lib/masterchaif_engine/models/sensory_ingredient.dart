/// Modello ingrediente con vettori sensoriali per il Masterchaif Engine.
/// Allineato ai dati dal database remoto (matrice_ingredienti / matrice_microelementi).
class SensoryIngredient {
  final String id;
  final String nome;

  /// Gusti base (scala 0–5, come scan: d,s,a,b,u)
  final double vDolcezzaD;   // d
  final double vSalinitaS;   // s
  final double vAciditaA;    // a
  final double vAmarezzaB;   // b
  final double vSapiditaU;   // u

  /// Indice grasso/texture (0–1 o 0–5)
  final double indiceGrassoTexture;

  /// Tattile
  final double viscositaAdesivita;  // 0–1
  final double succulenzaUmidita;   // 0–1
  final double croccantezzaSuono;   // 0–1

  /// Termico e freschezza
  final double temperaturaServizioIdeale; // °C
  final double freschezzaBalsamica;       // 0–1

  /// Da matrice_microelementi (opzionale, non usato dal Masterchaif Engine)
  final double? fatiguePredictor;
  final double? metabolicWindowScore;
  final double? glycogenBurnRate;
  final double? neuroSatietyIndex;
  final double? cognitiveClarityQuotient;

  const SensoryIngredient({
    required this.id,
    required this.nome,
    this.vDolcezzaD = 0,
    this.vSalinitaS = 0,
    this.vAciditaA = 0,
    this.vAmarezzaB = 0,
    this.vSapiditaU = 0,
    this.indiceGrassoTexture = 0,
    this.viscositaAdesivita = 0,
    this.succulenzaUmidita = 0,
    this.croccantezzaSuono = 0,
    this.temperaturaServizioIdeale = 20,
    this.freschezzaBalsamica = 0,
    this.fatiguePredictor,
    this.metabolicWindowScore,
    this.glycogenBurnRate,
    this.neuroSatietyIndex,
    this.cognitiveClarityQuotient,
  });

  /// Vettore dei 5 sapori [d, s, a, b, u]
  List<double> get tasteVector =>
      [vDolcezzaD, vSalinitaS, vAciditaA, vAmarezzaB, vSapiditaU];

  /// Vettore tattile [viscosità, succulenza, croccantezza]
  List<double> get tactileVector =>
      [viscositaAdesivita, succulenzaUmidita, croccantezzaSuono];

  /// Da mappa JSON da Supabase (matrice_ingredienti, eventualmente arricchita con matrice_microelementi).
  /// ingredienti: id, nome_alimento, v_dolcezza_d, ... microelementi: fatigue_predictor, metabolic_window_score, ...
  factory SensoryIngredient.fromJson(Map<String, dynamic> json) {
    final nome = json['nome_alimento']?.toString() ?? json['nome']?.toString() ?? '';
    final macroGrassi = _toDouble(json['macro_grassi'] ?? json['grassi']);
    final indiceGrassoFromMacro = (macroGrassi / 100).clamp(0.0, 1.0);
    final indiceRaw = _toDouble(json['indice_grasso_texture'], default: -1);
    final indiceGrasso = indiceRaw >= 0
        ? (indiceRaw > 1 ? (indiceRaw / 5).clamp(0.0, 1.0) : indiceRaw.clamp(0.0, 1.0))
        : indiceGrassoFromMacro;
    final croccRaw = _toDouble(json['croccantezza_suono'], default: 0.5);
    final croccNorm = croccRaw > 1 ? (croccRaw / 5).clamp(0.0, 1.0) : croccRaw.clamp(0.0, 1.0);
    return SensoryIngredient(
      id: json['id']?.toString() ?? '',
      nome: nome,
      vDolcezzaD: _toDouble(json['v_dolcezza_d'] ?? json['d']),
      vSalinitaS: _toDouble(json['v_salinita_s'] ?? json['s']),
      vAciditaA: _toDouble(json['v_acidita_a'] ?? json['a']),
      vAmarezzaB: _toDouble(json['v_amarezza_b'] ?? json['b']),
      vSapiditaU: _toDouble(json['v_sapidita_u'] ?? json['u']),
      indiceGrassoTexture: indiceGrasso,
      viscositaAdesivita: _toDouble(json['viscosita_adesivita'], default: 0.5),
      succulenzaUmidita: _toDouble(json['succulenza_umidita'], default: 0.5),
      croccantezzaSuono: croccNorm,
      temperaturaServizioIdeale:
          _toDouble(json['temperatura_servizio_ideale'], default: 20),
      freschezzaBalsamica: _toDouble(json['freschezza_balsamica']),
      fatiguePredictor: _toDoubleOrNull(json['fatigue_predictor']),
      metabolicWindowScore: _toDoubleOrNull(json['metabolic_window_score']),
      glycogenBurnRate: _toDoubleOrNull(json['glycogen_burn_rate']),
      neuroSatietyIndex: _toDoubleOrNull(json['neuro_satiety_index']),
      cognitiveClarityQuotient: _toDoubleOrNull(json['cognitive_clarity_quotient']),
    );
  }

  static double? _toDoubleOrNull(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  static double _toDouble(dynamic v, {double default: 0}) {
    if (v == null) return default;
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? default;
    return default;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nome': nome,
        'v_dolcezza_d': vDolcezzaD,
        'v_salinita_s': vSalinitaS,
        'v_acidita_a': vAciditaA,
        'v_amarezza_b': vAmarezzaB,
        'v_sapidita_u': vSapiditaU,
        'indice_grasso_texture': indiceGrassoTexture,
        'viscosita_adesivita': viscositaAdesivita,
        'succulenza_umidita': succulenzaUmidita,
        'croccantezza_suono': croccantezzaSuono,
        'temperatura_servizio_ideale': temperaturaServizioIdeale,
        'freschezza_balsamica': freschezzaBalsamica,
      };
}
