import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme.dart';
import 'features/language/locale_controller.dart';
import 'features/school/school.dart';
import 'l10n/app_localizations.dart';
import 'router.dart';

class SncmtApp extends ConsumerWidget {
  const SncmtApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // the school's own colour once one is chosen
    final seed = accentColor(ref.watch(schoolProvider.select((s) => s?.accentColor)));

    return MaterialApp.router(
      title: 'SNCMT',
      debugShowCheckedModeBanner: false,
      routerConfig: ref.watch(routerProvider),
      theme: buildTheme(seed, Brightness.light),
      darkTheme: buildTheme(seed, Brightness.dark),
      // before the first choice: the phone's language if it's one of ours, else Bangla
      locale: ref.watch(localeProvider),
      supportedLocales: supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
