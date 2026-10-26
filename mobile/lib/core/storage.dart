import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Plain settings (language, the chosen school). Opened in main() and overridden there,
/// so screens read them without waiting.
final prefsProvider = Provider<SharedPreferencesWithCache>(
  (ref) => throw UnimplementedError('opened in main()'),
);

class PrefKeys {
  static const locale = 'locale';
  static const school = 'school';
  static const all = {locale, school};
}

/// The session's tokens, in Android's encrypted storage. Kept in memory too, so every API
/// call can add the access token without a disk read.
class TokenStore {
  TokenStore._(this._storage, this._access, this._refresh);

  static const _accessKey = 'accessToken';
  static const _refreshKey = 'refreshToken';

  final FlutterSecureStorage _storage;
  String? _access;
  String? _refresh;

  static Future<TokenStore> open() async {
    const storage = FlutterSecureStorage();
    return TokenStore._(
      storage,
      await storage.read(key: _accessKey),
      await storage.read(key: _refreshKey),
    );
  }

  String? get accessToken => _access;
  String? get refreshToken => _refresh;
  bool get hasSession => _refresh != null;

  /// `tokens` as the server sends them: { accessToken, refreshToken, ... }.
  Future<void> save(Map<String, dynamic> tokens) async {
    _access = tokens['accessToken'] as String;
    _refresh = tokens['refreshToken'] as String;
    await _storage.write(key: _accessKey, value: _access);
    await _storage.write(key: _refreshKey, value: _refresh);
  }

  Future<void> clear() async {
    _access = null;
    _refresh = null;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}

final tokenStoreProvider = Provider<TokenStore>(
  (ref) => throw UnimplementedError('opened in main()'),
);
