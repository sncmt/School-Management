import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/storage.dart';
import '../school/school.dart';

/// The roles this app is for. Anyone else (staff, the school's super admin) uses the website.
class Roles {
  static const guardian = 'GUARDIAN';
  static const teacher = 'TEACHER';
}

/// The logged-in person, from GET /auth/me.
class Me {
  const Me({
    required this.fullname,
    required this.phone,
    required this.roles,
    required this.canChangeOwnPassword,
    required this.schoolNameEn,
    this.schoolNameBn,
    this.schoolLogo,
  });

  final String fullname;
  final String? phone;
  final Set<String> roles;

  /// Only guardians change their own password; a teacher's is changed by the school's super admin.
  final bool canChangeOwnPassword;
  final String schoolNameEn;
  final String? schoolNameBn;
  final String? schoolLogo;

  String schoolName(Locale locale) =>
      locale.languageCode == 'bn' && (schoolNameBn?.isNotEmpty ?? false) ? schoolNameBn! : schoolNameEn;

  /// The roles of this app that the person has, guardian first.
  List<String> get appRoles => [Roles.guardian, Roles.teacher].where(roles.contains).toList();

  factory Me.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    final school = json['school'] as Map<String, dynamic>;
    return Me(
      fullname: user['fullname'] as String,
      phone: user['phone'] as String?,
      roles: {for (final role in json['roles'] as List) (role as Map)['name'] as String},
      canChangeOwnPassword: json['canChangeOwnPassword'] == true,
      schoolNameEn: school['nameEn'] as String,
      schoolNameBn: school['nameBn'] as String?,
      schoolLogo: school['logo'] as String?,
    );
  }
}

class AuthState {
  const AuthState(this.me, this.activeRole);

  static const loggedOut = AuthState(null, null);

  /// null = logged out.
  final Me? me;

  /// Which home is showing, for someone who is both (a teacher whose child studies there).
  /// null for an account with neither role.
  final String? activeRole;

  factory AuthState.of(Me me) => AuthState(me, me.appRoles.firstOrNull);
}

/// The logged-in API client of the chosen school.
final apiClientProvider = Provider<ApiClient?>((ref) {
  final school = ref.watch(schoolProvider);
  if (school == null) return null;
  return ApiClient(
    schoolCode: school.code,
    tokens: ref.read(tokenStoreProvider),
    onSessionExpired: () => ref.read(authProvider.notifier).sessionExpired(),
  );
});

class AuthController extends AsyncNotifier<AuthState> {
  TokenStore get _tokens => ref.read(tokenStoreProvider);

  /// On launch: a saved session is checked with the server. Offline -> an error the
  /// splash screen offers to retry; refused -> logged out.
  @override
  Future<AuthState> build() async {
    final api = ref.watch(apiClientProvider);
    if (api == null || !_tokens.hasSession) return AuthState.loggedOut;
    try {
      return AuthState.of(await _fetchMe(api));
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        await _tokens.clear();
        return AuthState.loggedOut;
      }
      rethrow;
    }
  }

  Future<Me> _fetchMe(ApiClient api) async => Me.fromJson(await api.get<Map<String, dynamic>>('/auth/me'));

  /// Throws ApiException with the server's reason ("Invalid credentials!" and so on).
  Future<void> login(String identifier, String password) async {
    final api = ref.read(apiClientProvider)!;
    final data = await api.post<Map<String, dynamic>>(
      '/auth/school/login',
      body: {'identifier': identifier, 'password': password},
      noAuth: true,
    );
    await _tokens.save(data['tokens'] as Map<String, dynamic>);
    state = AsyncData(AuthState.of(await _fetchMe(api)));
  }

  /// Ends the session on the server too. Offline, the phone still logs out and the server's
  /// copy simply expires.
  Future<void> logout() async {
    final api = ref.read(apiClientProvider);
    final refreshToken = _tokens.refreshToken;
    if (api != null && refreshToken != null) {
      try {
        await api.post<void>('/auth/school/logout', body: {'refreshToken': refreshToken}, noAuth: true);
      } on ApiException {
        // nothing more to do
      }
    }
    await _tokens.clear();
    state = const AsyncData(AuthState.loggedOut);
  }

  /// Every other session of the account ends; this phone carries on with the new tokens.
  Future<void> changePassword(String current, String next) async {
    final data = await ref.read(apiClientProvider)!.post<Map<String, dynamic>>(
      '/auth/change-password',
      body: {'currentPassword': current, 'newPassword': next},
    );
    await _tokens.save(data['tokens'] as Map<String, dynamic>);
  }

  void switchRole(String role) {
    final me = state.value?.me;
    if (me != null && me.appRoles.contains(role)) state = AsyncData(AuthState(me, role));
  }

  /// The server refused to refresh: the tokens are already gone.
  void sessionExpired() => state = const AsyncData(AuthState.loggedOut);
}

final authProvider = AsyncNotifierProvider<AuthController, AuthState>(
  AuthController.new,
  // a failed launch check waits for the user's "Try again", not an automatic loop
  retry: (_, _) => null,
);
