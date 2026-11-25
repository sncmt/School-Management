import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The pages of a list loaded so far.
class Paged<T> {
  const Paged(this.items, {required this.hasMore, this.loadingMore = false});

  final List<T> items;
  final bool hasMore;
  final bool loadingMore;
}

/// A server list of 20 at a time (`?page=`, answered with `meta.totalPages`): the first page
/// on build, the next one on [loadMore].
abstract class PagedNotifier<T> extends AsyncNotifier<Paged<T>> {
  int _page = 1;

  /// One page: its items and how many pages there are.
  Future<(List<T>, int totalPages)> fetch(int page);

  @override
  Future<Paged<T>> build() async {
    _page = 1;
    final (items, pages) = await fetch(1);
    return Paged(items, hasMore: pages > 1);
  }

  /// Throws ApiException when the page can't be loaded; the pages already shown stay.
  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(Paged(current.items, hasMore: true, loadingMore: true));
    try {
      final (items, pages) = await fetch(_page + 1);
      _page++;
      state = AsyncData(Paged([...current.items, ...items], hasMore: _page < pages));
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }
}

/// A page of a server answer: { items, meta: { totalPages } }.
(List<T>, int) pageOf<T>(Map<String, dynamic> json, T Function(Map<String, dynamic>) parse) => (
      [for (final item in json['items'] as List) parse(item as Map<String, dynamic>)],
      (json['meta'] as Map)['totalPages'] as int? ?? 1,
    );
