import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../widgets/ui.dart';
import 'locale_controller.dart';

/// First launch: the welcome, then the language. Both choices and the tagline are written in
/// both languages, since the user can't read the other one yet.
class LanguageScreen extends ConsumerWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final choose = ref.read(localeProvider.notifier).set;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: scheme.primary,
        body: Column(
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [scheme.primary, Color.lerp(scheme.primary, Colors.black, 0.35)!],
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: FadeSlideIn(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const BrandMark(size: 88, onDark: true),
                        const SizedBox(height: 20),
                        Text(
                          'SNCMT',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white, letterSpacing: 2),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'আপনার স্কুল, হাতের মুঠোয়\nYour school, in your pocket',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.8), height: 1.6),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            FadeSlideIn(
              index: 2,
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: context.palette.canvas,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('ভাষা বেছে নিন · Choose language', textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 18),
                        _Choice(label: 'বাংলা', hint: 'Bangla', onTap: () => choose(const Locale('bn'))),
                        _Choice(label: 'English', hint: 'ইংরেজি', onTap: () => choose(const Locale('en'))),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({required this.label, required this.hint, required this.onTap});

  final String label;
  final String hint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        title: Text(label, style: Theme.of(context).textTheme.titleLarge),
        subtitle: Text(hint),
        trailing: Icon(Icons.arrow_forward_rounded, color: Theme.of(context).colorScheme.primary),
        onTap: onTap,
      ),
    );
  }
}
