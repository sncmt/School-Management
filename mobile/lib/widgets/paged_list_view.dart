import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/paged.dart';
import '../l10n/app_localizations.dart';
import 'async_body.dart';
import 'ui.dart';

/// A paged server list: pull to refresh, and the next page loads when the end comes into view.
class PagedListView<T> extends StatelessWidget {
  const PagedListView({
    super.key,
    required this.value,
    required this.itemBuilder,
    required this.empty,
    required this.onRefresh,
    required this.onLoadMore,
    required this.onRetry,
  });

  final AsyncValue<Paged<T>> value;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final String empty;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onLoadMore;
  final VoidCallback onRetry;

  Future<void> _loadMore(BuildContext context) async {
    try {
      await onLoadMore();
    } on ApiException catch (e) {
      if (!context.mounted) return;
      final t = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.isNetwork ? t.networkError : e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: AsyncBody(
        value: value,
        onRetry: onRetry,
        builder: (paged) {
          if (paged.items.isEmpty) {
            return ListView(children: [EmptyState(icon: Icons.inbox_outlined, message: empty)]);
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 96),
            itemCount: paged.items.length + (paged.hasMore ? 1 : 0),
            itemBuilder: (context, i) {
              // the first screenful arrives in a short cascade; later pages just appear
              if (i < paged.items.length) return i < 10 ? FadeSlideIn(index: i, child: itemBuilder(context, paged.items[i])) : itemBuilder(context, paged.items[i]);
              // the end is in view: ask for the next page once this frame is drawn
              if (!paged.loadingMore) WidgetsBinding.instance.addPostFrameCallback((_) => _loadMore(context));
              return const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()));
            },
          );
        },
      ),
    );
  }
}
