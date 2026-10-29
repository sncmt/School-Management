import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/attachment_list.dart';
import '../../widgets/notice_text.dart';
import '../../widgets/paged_list_view.dart';
import '../../widgets/ui.dart';
import 'notices.dart';

/// The notice board: for guardians and teachers alike, the server picks what each may read.
class NoticeBoardScreen extends ConsumerWidget {
  const NoticeBoardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(t.notices)),
      body: PagedListView<Notice>(
        value: ref.watch(noticeBoardProvider),
        empty: t.noNotices,
        onRefresh: () {
          ref.invalidate(unreadNoticesProvider);
          return ref.refresh(noticeBoardProvider.future);
        },
        onLoadMore: () => ref.read(noticeBoardProvider.notifier).loadMore(),
        onRetry: () => ref.invalidate(noticeBoardProvider),
        itemBuilder: (context, notice) => _NoticeTile(notice: notice),
      ),
    );
  }
}

class _NoticeTile extends StatelessWidget {
  const _NoticeTile({required this.notice});

  final Notice notice;

  @override
  Widget build(BuildContext context) {
    final unread = !notice.read;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => context.push('/notices/${notice.id}', extra: notice),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CategoryBadge(category: notice.category),
                  if (notice.pinned) ...[const SizedBox(width: 6), const Icon(Icons.push_pin, size: 16)],
                  const Spacer(),
                  Text(context.date(notice.publishAt), style: Theme.of(context).textTheme.bodySmall),
                  if (unread) ...[
                    const SizedBox(width: 8),
                    Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, shape: BoxShape.circle),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Text(
                notice.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: unread ? FontWeight.bold : null),
              ),
              const SizedBox(height: 4),
              // a snippet without the marks
              Text(
                notice.body.replaceAll('**', '').replaceAll(RegExp(r'\s+'), ' ').trim(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              if (notice.attachments.isNotEmpty) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.attach_file, size: 16),
                    Text(context.number(notice.attachments.length), style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class CategoryBadge extends StatelessWidget {
  const CategoryBadge({super.key, required this.category});

  final NoticeCategory category;

  @override
  Widget build(BuildContext context) => Pill(category.label(AppLocalizations.of(context)), color: category.color);
}

/// One notice in full. Opening it marks it read.
class NoticeDetailScreen extends ConsumerStatefulWidget {
  const NoticeDetailScreen({super.key, required this.notice});

  /// Handed over by the board; null when opened some other way.
  final Notice? notice;

  @override
  ConsumerState<NoticeDetailScreen> createState() => _NoticeDetailScreenState();
}

class _NoticeDetailScreenState extends ConsumerState<NoticeDetailScreen> {
  @override
  void initState() {
    super.initState();
    final notice = widget.notice;
    if (notice != null && !notice.read) {
      // after the first frame: providers can't change while the tree is building
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        try {
          await ref.read(noticeBoardProvider.notifier).markRead(notice);
        } on ApiException {
          // stays unread; it is marked next time
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final notice = widget.notice;
    if (notice == null) return Scaffold(appBar: AppBar(), body: Center(child: Text(t.noNotices)));

    return Scaffold(
      appBar: AppBar(title: Text(t.notices)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              CategoryBadge(category: notice.category),
              const SizedBox(width: 8),
              Text(context.date(notice.publishAt), style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 12),
          Text(notice.title, style: Theme.of(context).textTheme.headlineSmall),
          const Divider(height: 32),
          NoticeText(notice.body),
          if (notice.attachments.isNotEmpty) ...[
            Text(t.attachments, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            AttachmentList(attachments: notice.attachments),
          ],
        ],
      ),
    );
  }
}
