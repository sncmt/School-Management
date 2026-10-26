import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/auth/auth_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/splash_screen.dart';
import 'features/home/home_screen.dart';
import 'features/language/language_screen.dart';
import 'features/language/locale_controller.dart';
import 'features/school/school.dart';
import 'features/school/school_code_screen.dart';
import 'features/settings/change_password_screen.dart';
import 'features/settings/settings_screen.dart';

/// Where the user must be, in order: a language, a school, a checked session, then the app.
/// Screens never navigate to these steps themselves: they change the state and the router
/// follows.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  void bump(_, _) => refresh.value++;
  ref.listen(localeProvider, bump);
  ref.listen(schoolProvider, bump);
  ref.listen(authProvider, bump);
  ref.onDispose(refresh.dispose);

  const entrySteps = {'/language', '/school', '/splash', '/login'};

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final here = state.matchedLocation;
      String? goTo(String path) => here == path ? null : path;

      if (ref.read(localeProvider) == null) return goTo('/language');
      if (ref.read(schoolProvider) == null) return goTo('/school');

      final auth = ref.read(authProvider);
      if (auth.isLoading && !auth.hasValue || auth.hasError) return goTo('/splash');
      if (auth.value?.me == null) return goTo('/login');

      return entrySteps.contains(here) ? '/home' : null;
    },
    routes: [
      GoRoute(path: '/language', builder: (_, _) => const LanguageScreen()),
      GoRoute(path: '/school', builder: (_, _) => const SchoolCodeScreen()),
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
      GoRoute(
        path: '/settings',
        builder: (_, _) => const SettingsScreen(),
        routes: [GoRoute(path: 'password', builder: (_, _) => const ChangePasswordScreen())],
      ),
    ],
  );
});
