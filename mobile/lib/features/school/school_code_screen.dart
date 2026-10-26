import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/school_logo.dart';
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
    final t = AppLocalizations.of(context);
    final found = _found;

    return Scaffold(
      appBar: AppBar(title: Text(t.schoolCodeTitle)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: found == null
              ? [
                  Text(t.schoolCodeHelp, style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _code,
                    autofocus: true,
                    autocorrect: false,
                    keyboardType: TextInputType.url,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _loading ? null : _lookup(),
                    decoration: InputDecoration(
                      labelText: t.schoolCodeLabel,
                      helperText: t.schoolCodeExample,
                      errorText: _error,
                      errorMaxLines: 3,
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _lookup,
                    child: _loading ? const _ButtonSpinner() : Text(t.continueLabel),
                  ),
                ]
              : [
                  Text(t.isThisYourSchool, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 24),
                  SchoolLogo(url: found.logo, size: 96),
                  const SizedBox(height: 16),
                  Text(
                    found.name(Localizations.localeOf(context)),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  Text(ApiConfig.website(found.code), textAlign: TextAlign.center),
                  const SizedBox(height: 32),
                  FilledButton(
                    onPressed: () => ref.read(schoolProvider.notifier).choose(found),
                    child: Text(t.yesContinue),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: () => setState(() => _found = null), child: Text(t.noChangeCode)),
                ],
        ),
      ),
    );
  }
}

class _ButtonSpinner extends StatelessWidget {
  const _ButtonSpinner();

  @override
  Widget build(BuildContext context) =>
      const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5));
}
