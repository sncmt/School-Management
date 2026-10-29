import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/ui.dart';
import 'auth_controller.dart';

/// While the saved session is checked on launch; "Try again" when the server can't be reached.
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final auth = ref.watch(authProvider);
    final error = auth.error;
    final failed = error != null && !auth.isLoading;

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const BrandMark(size: 72),
              const SizedBox(height: 28),
              if (!failed)
                const SizedBox(width: 120, child: LinearProgressIndicator(minHeight: 3, borderRadius: BorderRadius.all(Radius.circular(3))))
              else ...[
                Text(
                  error is ApiException && !error.isNetwork ? error.message : t.networkError,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: context.palette.muted),
                ),
                const SizedBox(height: 20),
                FilledButton.tonalIcon(
                  icon: const Icon(Icons.refresh_rounded),
                  label: Text(t.retry),
                  onPressed: () => ref.invalidate(authProvider),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
