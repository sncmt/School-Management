import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'locale_controller.dart';

/// First launch: the language, before anything else. Both labels are shown in their own
/// language, since the user can't read the other one yet.
class LanguageScreen extends ConsumerWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final choose = ref.read(localeProvider.notifier).set;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.school_rounded, size: 72, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 16),
              Text('SNCMT', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              const Text('ভাষা বেছে নিন · Choose language', textAlign: TextAlign.center),
              const SizedBox(height: 40),
              FilledButton(onPressed: () => choose(const Locale('bn')), child: const Text('বাংলা')),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: () => choose(const Locale('en')), child: const Text('English')),
            ],
          ),
        ),
      ),
    );
  }
}
