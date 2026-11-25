import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../core/theme.dart';
import '../../widgets/school_logo.dart';
import '../../widgets/ui.dart';
import '../school/school.dart';
import 'auth_controller.dart';

/// Mobile number and password, for the school chosen on this phone.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _hidePassword = true;
  bool _loading = false;
  String? _error;

  /// Fresh site info: the logo link (they expire) and any change of name or colour.
  late final Future<School?> _site = _refreshSite();

  Future<School?> _refreshSite() async {
    final school = ref.read(schoolProvider)!;
    try {
      final fresh = await lookupSchool(school.code);
      if (fresh != null) await ref.read(schoolProvider.notifier).choose(fresh);
      return fresh ?? school;
    } on ApiException {
      return school;
    }
  }

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    final t = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).login(_phone.text.trim(), _password.text);
      // the router moves on to the home screen by itself
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final school = ref.watch(schoolProvider);
    if (school == null) return const SizedBox.shrink();
    String? required(String? v) => (v == null || v.trim().isEmpty) ? t.required : null;

    final error = _error;
    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
            children: [
              FadeSlideIn(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(Radii.tile),
                        border: Border.all(color: context.palette.hairline),
                      ),
                      child: FutureBuilder(
                        future: _site,
                        builder: (context, snapshot) => SchoolLogo(url: snapshot.data?.logo, size: 44),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        school.name(Localizations.localeOf(context)),
                        style: Theme.of(context).textTheme.titleMedium,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 36),
              FadeSlideIn(
                index: 1,
                child: Text(t.loginTitle, style: Theme.of(context).textTheme.headlineMedium),
              ),
              const SizedBox(height: 28),
              FadeSlideIn(
                index: 2,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      decoration: InputDecoration(
                        labelText: t.mobileNumber,
                        hintText: '01XXXXXXXXX',
                        prefixIcon: const Icon(Icons.phone_iphone_rounded),
                      ),
                      validator: required,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _password,
                      obscureText: _hidePassword,
                      textInputAction: TextInputAction.done,
                      autofillHints: const [AutofillHints.password],
                      onFieldSubmitted: (_) => _loading ? null : _submit(),
                      decoration: InputDecoration(
                        labelText: t.password,
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                          onPressed: () => setState(() => _hidePassword = !_hidePassword),
                        ),
                      ),
                      validator: required,
                    ),
                  ],
                ),
              ),
              AnimatedSize(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOutCubic,
                child: error == null
                    ? const SizedBox(width: double.infinity)
                    : Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(top: 16),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.error.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(Radii.control),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline_rounded, color: Theme.of(context).colorScheme.error, size: 20),
                            const SizedBox(width: 10),
                            Expanded(child: Text(error, style: TextStyle(color: Theme.of(context).colorScheme.error))),
                          ],
                        ),
                      ),
              ),
              const SizedBox(height: 28),
              FilledButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Text(t.loginButton),
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton.icon(
                  icon: const Icon(Icons.swap_horiz_rounded, size: 18),
                  label: Text(t.changeSchool),
                  onPressed: _loading ? null : () => ref.read(schoolProvider.notifier).forget(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
