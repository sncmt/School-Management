import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/school_logo.dart';
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

    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 24),
              FutureBuilder(
                future: _site,
                builder: (context, snapshot) => SchoolLogo(url: snapshot.data?.logo, size: 88),
              ),
              const SizedBox(height: 12),
              Text(
                school.name(Localizations.localeOf(context)),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.telephoneNumber],
                decoration: InputDecoration(labelText: t.mobileNumber, hintText: '01XXXXXXXXX'),
                validator: required,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _password,
                obscureText: _hidePassword,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.password],
                onFieldSubmitted: (_) => _loading ? null : _submit(),
                decoration: InputDecoration(
                  labelText: t.password,
                  suffixIcon: IconButton(
                    icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _hidePassword = !_hidePassword),
                  ),
                ),
                validator: required,
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                    : Text(t.loginButton),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _loading ? null : () => ref.read(schoolProvider.notifier).forget(),
                child: Text(t.changeSchool),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
