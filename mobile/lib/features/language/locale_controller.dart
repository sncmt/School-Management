import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/storage.dart';

const supportedLocales = [Locale('bn'), Locale('en')];

/// The app's language; null until the user picks one on first launch.
class LocaleController extends Notifier<Locale?> {
  @override
  Locale? build() {
    final code = ref.read(prefsProvider).getString(PrefKeys.locale);
    return code == null ? null : Locale(code);
  }

  Future<void> set(Locale locale) async {
    await ref.read(prefsProvider).setString(PrefKeys.locale, locale.languageCode);
    state = locale;
  }
}

final localeProvider = NotifierProvider<LocaleController, Locale?>(LocaleController.new);
