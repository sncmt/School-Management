import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/app_update.dart';
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
    // what support needs from a screenshot: the error, and for a bug of ours where it happened
    final detail = switch (error) {
      ApiException e => [if (e.statusCode != null) 'HTTP ${e.statusCode}', ?e.detail].join(' · '),
      _ => ['$error', ..._firstFrames(value.stackTrace)].join('\n'),
    };
    if (kDebugMode) debugPrint('[AsyncBody] $error\n${value.stackTrace}');

    // a ListView, so pull-to-refresh still works on the error
    return ListView(
      padding: const EdgeInsets.all(32),
      children: [
        Center(child: IconBadge(Icons.cloud_off_rounded, size: 64, color: Theme.of(context).colorScheme.error)),
        const SizedBox(height: 16),
        Text(message, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 12),
        Center(child: FilledButton.tonal(onPressed: onRetry, child: Text(t.retry))),
        if (detail.isNotEmpty) ...[const SizedBox(height: 20), _Details(detail: detail)],
      ],
    );
  }

  /// The app's own lines of a stack trace (where it failed), at most four.
  static Iterable<String> _firstFrames(StackTrace? trace) => '${trace ?? ''}'
      .split('\n')
      .where((line) => line.contains('package:sncmt/'))
      .take(4)
      .map((line) => line.replaceFirst(RegExp(r'^#\d+\s+'), '').trim());
}

/// "Details", collapsed: unseen by most, but a screenshot of it tells support what went wrong.
class _Details extends ConsumerStatefulWidget {
  const _Details({required this.detail});

  final String detail;

  @override
  ConsumerState<_Details> createState() => _DetailsState();
}

class _DetailsState extends ConsumerState<_Details> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final info = ref.watch(appInfoProvider).value;
    final small = Theme.of(context).textTheme.bodySmall;
    return Column(
      children: [
        TextButton(
          onPressed: () => setState(() => _open = !_open),
          child: Text(t.errorDetails, style: small?.copyWith(decoration: TextDecoration.underline)),
        ),
        if (_open)
          SelectableText(
            [widget.detail, if (info != null) 'SNCMT ${info.version} (build ${info.buildNumber})'].join('\n'),
            textAlign: TextAlign.center,
            style: small?.copyWith(fontFamily: 'monospace', fontSize: 11),
          ),
      ],
    );
  }
}
