import 'package:omnivora_mobile/masterchaif_engine/models/sensory_ingredient.dart';

/// Risultato del calcolo del Masterchaif Engine.
class SensoryLogicResult {
  final double dissonanzaCulinariaDc;
  final double soddisfazioneSensorialeSs;
  final double collisioneAntagonistaCa;
  final double incompatibilitaStrutturaleIs;
  final double elementiPonteEp;
  final double deltaTermico;
  final double equilibrioGustiEg;
  final double matriceTattileMt;

  const SensoryLogicResult({
    required this.dissonanzaCulinariaDc,
    required this.soddisfazioneSensorialeSs,
    required this.collisioneAntagonistaCa,
    required this.incompatibilitaStrutturaleIs,
    required this.elementiPonteEp,
    required this.deltaTermico,
    required this.equilibrioGustiEg,
    required this.matriceTattileMt,
  });
}

/// Motore di calcolo Masterchaif: Dissonanza Culinaria e Soddisfazione Sensoriale.
///
/// Formule:
/// - D_c = (C_a * I_s) / (1 + E_p)
/// - S_s = (E_g * M_t * (1 + ΔT_norm)) - D_c
class SensoryLogicEngine {
  /// Soglia per considerare un "picco" estremo (0-5)
  static const double _peakThreshold = 2.5;
  /// Soglia per "dolce vs salato/umami" (abbinamenti spesso sgradevoli: Nutella + wurstel, ecc.)
  static const double _sweetSaltyClashThreshold = 2.5;

  /// Scala normale per ΔT (°C) in 0..1
  static const double _deltaTScale = 50.0;

  /// Collisione Antagonista: picchi contrastanti + penalità esplicita
  /// "dolce estremo vs salato/umami" (es. Nutella + wurstel = sconsigliato).
  static double collisioneAntagonista(List<SensoryIngredient> ingredients) {
    if (ingredients.isEmpty) return 0;
    if (ingredients.length == 1) return 0;

    double ca = 0;
    final n = ingredients.length;
    for (int i = 0; i < n; i++) {
      for (int j = i + 1; j < n; j++) {
        final a = ingredients[i];
        final b = ingredients[j];

        // 1) Picchi dolce/grasso senza bilanciamento acido/amaro
        final sweetFatA = (a.vDolcezzaD + a.indiceGrassoTexture) / 2;
        final balanceB = (b.vAciditaA + b.vAmarezzaB) / 2;
        final sweetFatB = (b.vDolcezzaD + b.indiceGrassoTexture) / 2;
        final balanceA = (a.vAciditaA + a.vAmarezzaB) / 2;
        final peakA = sweetFatA > _peakThreshold ? (1 - (balanceB / 5).clamp(0.0, 1.0)) : 0.0;
        final peakB = sweetFatB > _peakThreshold ? (1 - (balanceA / 5).clamp(0.0, 1.0)) : 0.0;
        ca += (peakA + peakB).clamp(0.0, 2.0);

        // 2) Clash dolce vs salato/umami: uno molto dolce, l'altro molto salato o umami, senza ponte acido/amaro
        final aSweet = a.vDolcezzaD >= _sweetSaltyClashThreshold;
        final aSaltyUmami = (a.vSalinitaS >= _sweetSaltyClashThreshold) || (a.vSapiditaU >= _sweetSaltyClashThreshold);
        final bSweet = b.vDolcezzaD >= _sweetSaltyClashThreshold;
        final bSaltyUmami = (b.vSalinitaS >= _sweetSaltyClashThreshold) || (b.vSapiditaU >= _sweetSaltyClashThreshold);
        final bridgeA = (a.vAciditaA + a.vAmarezzaB + a.freschezzaBalsamica) / 3;
        final bridgeB = (b.vAciditaA + b.vAmarezzaB + b.freschezzaBalsamica) / 3;
        final noBridge = (bridgeA < 1.0 && bridgeB < 1.0);
        if (noBridge && ((aSweet && bSaltyUmami) || (bSweet && aSaltyUmami))) {
          ca += 1.2; // penalità forte per abbinamenti tipo Nutella + wurstel
        }
      }
    }
    final pairs = n * (n - 1) / 2;
    return pairs > 0 ? (ca / pairs).clamp(0.0, 1.0) : 0;
  }

  /// Incompatibilità Strutturale (I_s): logica vettoriale pura.
  /// Penalizza i contrasti tattili sgradevoli guidati dalla Viscosità/Adesività.
  static double incompatibilitaStrutturale(List<SensoryIngredient> ingredients) {
    if (ingredients.length < 2) return 0.0;
    double totaleIs = 0.0;
    int coppie = 0;

    for (int i = 0; i < ingredients.length; i++) {
      for (int j = i + 1; j < ingredients.length; j++) {
        var a = ingredients[i];
        var b = ingredients[j];

        double deltaViscosita = (a.viscositaAdesivita - b.viscositaAdesivita).abs();
        double deltaSucculenza = (a.succulenzaUmidita - b.succulenzaUmidita).abs();
        double deltaCroccantezza = (a.croccantezzaSuono - b.croccantezzaSuono).abs();

        // Viscoso + Molto Umido = Sensazione viscida
        double contrastoViscSucc = deltaViscosita * deltaSucculenza;
        // Viscoso + Molto Croccante = Fastidioso/Innaturale sotto i denti
        double contrastoViscCrocc = deltaViscosita * deltaCroccantezza;

        // Sommiamo solo gli scontri tattili negativi
        totaleIs += (contrastoViscSucc + contrastoViscCrocc);
        coppie++;
      }
    }
    // Scaliamo dividendo per 2.0 (poiché ora sommiamo solo due termini) e limitiamo a 1.0
    return ((totaleIs / coppie) / 2.0).clamp(0.0, 1.0);
  }

  /// Elementi Ponte: somma di v_acidita_a e freschezza_balsamica
  /// per abbattere la dissonanza (1 + E_p al denominatore).
  static double elementiPonte(List<SensoryIngredient> ingredients) {
    double ep = 0;
    for (final i in ingredients) {
      ep += (i.vAciditaA + i.freschezzaBalsamica).clamp(0.0, 10.0);
    }
    return ep;
  }

  /// Delta Termico: differenza assoluta tra temperature di servizio ideali.
  /// Normalizzato in 0..1 per la formula (1 + ΔT_norm).
  static double deltaTermico(List<SensoryIngredient> ingredients) {
    if (ingredients.length < 2) return 0;
    double maxDiff = 0;
    final n = ingredients.length;
    for (int i = 0; i < n; i++) {
      for (int j = i + 1; j < n; j++) {
        final d = (ingredients[i].temperaturaServizioIdeale -
                ingredients[j].temperaturaServizioIdeale)
            .abs();
        if (d > maxDiff) maxDiff = d;
      }
    }
    return (maxDiff / _deltaTScale).clamp(0.0, 1.0);
  }

  /// Equilibrio Gusti: armonia sui 5 sapori + indice_grasso_texture.
  /// Alto quando i vettori sono bilanciati (bassa varianza della media).
  static double equilibrioGusti(List<SensoryIngredient> ingredients) {
    if (ingredients.isEmpty) return 0;
    final dims = 6; // d, s, a, b, u, grasso
    final sums = List.filled(dims, 0.0);
    for (final i in ingredients) {
      sums[0] += i.vDolcezzaD;
      sums[1] += i.vSalinitaS;
      sums[2] += i.vAciditaA;
      sums[3] += i.vAmarezzaB;
      sums[4] += i.vSapiditaU;
      sums[5] += i.indiceGrassoTexture;
    }
    final n = ingredients.length.toDouble();
    final mean = sums.map((s) => s / n).toList();
    double variance = 0;
    for (final i in ingredients) {
      final v = [
        i.vDolcezzaD,
        i.vSalinitaS,
        i.vAciditaA,
        i.vAmarezzaB,
        i.vSapiditaU,
        i.indiceGrassoTexture,
      ];
      for (int k = 0; k < dims; k++) {
        variance += (v[k] - mean[k]) * (v[k] - mean[k]);
      }
    }
    variance /= (n * dims);
    final std = variance > 0 ? variance.sqrt() : 0.0;
    return 1 / (1 + std.clamp(0.0, 5.0));
  }

  /// Matrice Tattile: bonus dal contrasto armonico
  /// (es. alta croccantezza in uno, alta succulenza nell'altro).
  static double matriceTattile(List<SensoryIngredient> ingredients) {
    if (ingredients.length < 2) return 1.0;
    double bonus = 0;
    int count = 0;
    final n = ingredients.length;
    for (int i = 0; i < n; i++) {
      for (int j = i + 1; j < n; j++) {
        final a = ingredients[i];
        final b = ingredients[j];
        final crSucc = (a.croccantezzaSuono * b.succulenzaUmidita +
                b.croccantezzaSuono * a.succulenzaUmidita) /
            2;
        bonus += crSucc.clamp(0.0, 1.0);
        count++;
      }
    }
    if (count == 0) return 1.0;
    final avg = bonus / count;
    return (1.0 + 0.5 * avg).clamp(1.0, 1.5);
  }

  /// Dissonanza Culinaria: D_c = (C_a * I_s) / (1 + E_p)
  static double dissonanzaCulinaria(
    double ca,
    double is_,
    double ep,
  ) {
    return (ca * is_) / (1 + ep);
  }

  /// Soddisfazione Sensoriale: S_s = (E_g * M_t * (1 + ΔT)) - D_c
  static double soddisfazioneSensoriale(
    double eg,
    double mt,
    double deltaTNorm,
    double dc,
  ) {
    final term = eg * mt * (1 + deltaTNorm);
    return (term - dc).clamp(0.0, double.infinity);
  }

  /// Esegue il calcolo completo e restituisce tutti gli indici.
  static SensoryLogicResult evaluate(List<SensoryIngredient> ingredients) {
    if (ingredients.isEmpty) {
      return const SensoryLogicResult(
        dissonanzaCulinariaDc: 0,
        soddisfazioneSensorialeSs: 0,
        collisioneAntagonistaCa: 0,
        incompatibilitaStrutturaleIs: 0,
        elementiPonteEp: 0,
        deltaTermico: 0,
        equilibrioGustiEg: 0,
        matriceTattileMt: 1,
      );
    }

    final ca = collisioneAntagonista(ingredients);
    final is_ = incompatibilitaStrutturale(ingredients);
    final ep = elementiPonte(ingredients);
    final deltaT = deltaTermico(ingredients);
    final eg = equilibrioGusti(ingredients);
    final mt = matriceTattile(ingredients);

    final dc = dissonanzaCulinaria(ca, is_, ep);
    final ss = soddisfazioneSensoriale(eg, mt, deltaT, dc);

    return SensoryLogicResult(
      dissonanzaCulinariaDc: dc,
      soddisfazioneSensorialeSs: ss,
      collisioneAntagonistaCa: ca,
      incompatibilitaStrutturaleIs: is_,
      elementiPonteEp: ep,
      deltaTermico: deltaT,
      equilibrioGustiEg: eg,
      matriceTattileMt: mt,
    );
  }
}
