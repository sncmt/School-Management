import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/school_logo.dart';
import '../../widgets/ui.dart';
import 'school.dart';

/// Enter the school code, see the school's name and logo, confirm it.
class SchoolCodeScreen extends ConsumerStatefulWidget {
  const SchoolCodeScreen({super.key});

  @override
  ConsumerState<SchoolCodeScreen> createState() => _SchoolCodeScreenState();
}

class _SchoolCodeScreenState extends ConsumerState<SchoolCodeScreen> {
  final _code = TextEditingController();
  bool _loading = false;
  String? _error;
  School? _found;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _lookup() async {
    final t = AppLocalizations.of(context);
    final code = normalizeSchoolCode(_code.text);
    if (code == null) return setState(() => _error = t.schoolNotFound);

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final school = await lookupSchool(code);
      setState(() => school == null ? _error = t.schoolNotFound : _found = school);
    } on ApiException catch (e) {
      setState(() => _error = e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final found = _found;
    return Scaffold(
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 350),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          transitionBuilder: (child, animation) => FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween(begin: const Offset(0, 0.04), end: Offset.zero).animate(animation),
              child: child,
            ),
          ),
          child: found == null ? _search(context) : _confirm(context, found),
        ),
      ),
    );
  }

  Widget _search(BuildContext context) {
    final t = AppLocalizations.of(context);
    return ListView(
      key: const ValueKey('search'),
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
      children: [
        const BrandMark(size: 56),
        const SizedBox(height: 28),
        Text(t.schoolCodeTitle, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(t.schoolCodeHelp, style: TextStyle(color: context.palette.muted, fontSize: 16)),
        const SizedBox(height: 32),
        TextField(
          controller: _code,
          autofocus: true,
          autocorrect: false,
          keyboardType: TextInputType.url,
          textInputAction: TextInputAction.go,
          onSubmitted: (_) => _loading ? null : _lookup(),
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: t.schoolCodeLabel,
            prefixIcon: const Icon(Icons.apartment_rounded),
            suffixText: '.${ApiConfig.rootDomain}',
            helperText: t.schoolCodeExample,
            errorText: _error,
            errorMaxLines: 3,
          ),
        ),
        const SizedBox(height: 28),
        FilledButton(
          onPressed: _loading ? null : _lookup,
          child: _loading
              ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
              : Text(t.continueLabel),
        ),
      ],
    );
  }

  Widget _confirm(BuildContext context, School found) {
    final t = AppLocalizations.of(context);
    return ListView(
      key: const ValueKey('confirm'),
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
      children: [
        Text(t.isThisYourSchool, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: context.palette.field, borderRadius: BorderRadius.circular(24)),
                  child: SchoolLogo(url: found.logo, size: 80),
                ),
                const SizedBox(height: 18),
                Text(
                  found.name(Localizations.localeOf(context)),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 10),
                Pill(ApiConfig.website(found.code), color: Theme.of(context).colorScheme.primary, icon: Icons.language_rounded),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: () => ref.read(schoolProvider.notifier).choose(found),
          child: Text(t.yesContinue),
        ),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: () => setState(() => _found = null), child: Text(t.noChangeCode)),
      ],
    );
  }
}
