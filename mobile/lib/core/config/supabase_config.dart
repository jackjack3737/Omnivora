/// Configurazione Supabase. Imposta URL e anon key prima di usare il repo.
/// In sviluppo: usa .env (SUPABASE_URL, SUPABASE_ANON_KEY) con flutter_dotenv.
class SupabaseConfig {
  static String? _url;
  static String? _anonKey;

  static String get url => _url ?? '';
  static String get anonKey => _anonKey ?? '';

  static bool get isConfigured => _url != null && _url!.isNotEmpty && _anonKey != null && _anonKey!.isNotEmpty;

  static void set(String url, String anonKey) {
    _url = url;
    _anonKey = anonKey;
  }
}
