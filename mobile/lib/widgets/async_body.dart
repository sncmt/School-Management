import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../l10n/app_localizations.dart';
import 'ui.dart';

/// A screen's body for data loaded from the server: a spinner, the data, or the error with
/// "Try again". While refreshing, the data already shown stays on screen.
class AsyncBody<T> extends StatelessWidget {
  const AsyncBody({super.key, required this.value, required this.builder, required this.onRetry});

  final AsyncValue<T> value;
  final Widget Function(T data) builder;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final data = value.value;
    if (data != null) return builder(data);
    final error = value.error;
    if (error == null) return const Center(child: CircularProgressIndicator());

    final t = AppLocalizations.of(context);
    // only a failed connection is the network's fault; anything else is a bug of ours
    final message = switch (error) {
      ApiException(isNetwork: true) => t.networkError,
      ApiException e => e.message,
      _ => t.somethingWentWrong,
    };
    final detail = switch (error) {
      ApiException e => e.detail,
      _ => '$error',
    };
    if (kDebugMode) debugPrint('[AsyncBody] $error\n${value.stackTrace}');

    // a ListView, so pull-to-refresh still works on the error
    return ListView(
      padding: const EdgeInsets.all(32),
      children: [
        Center(child: IconBadge(Icons.cloud_off_rounded, size: 64, color: Theme.of(context).colorScheme.error)),
        const SizedBox(height: 16),
        Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleSmall),
        if (kDebugMode && detail != null) ...[
          const SizedBox(height: 8),
          SelectableText(detail, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
        ],
        const SizedBox(height: 12),
        Center(child: FilledButton.tonal(onPressed: onRetry, child: Text(t.retry))),
      ],
    );
  }
}
