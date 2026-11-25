import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/paged_list_view.dart';
import '../../widgets/ui.dart';
import 'messages.dart';

/// The inbox: every message the school has sent this family (each one also came as a push
/// notification), all of them or only the unread. Opening one marks it read and goes to what
/// it is about.
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  Future<void> _markAll(BuildContext context, WidgetRef ref) async {
    try {
      await markAllMessagesRead(ref);
    } on ApiException catch (e) {
      if (!context.mounted) return;
      final t = AppLocalizations.of(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.isNetwork ? t.networkError : e.message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final unread = ref.watch(unreadMessagesProvider).value ?? 0;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t.messages),
          actions: [
            if (unread > 0)
              TextButton.icon(
                onPressed: () => _markAll(context, ref),
                icon: const Icon(Icons.done_all_rounded, size: 20),
                label: Text(t.markAllRead),
              ),
            const SizedBox(width: 8),
          ],
          bottom: TabBar(tabs: [Tab(text: t.allMessages), Tab(text: t.unreadMessages)]),
        ),
        body: const TabBarView(children: [_Inbox(unreadOnly: false), _Inbox(unreadOnly: true)]),
      ),
    );
  }
}

class _Inbox extends ConsumerWidget {
  const _Inbox({required this.unreadOnly});

  final bool unreadOnly;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final provider = messageListProvider(unreadOnly);

    return PagedListView<AppMessage>(
      value: ref.watch(provider),
      empty: unreadOnly ? t.noUnreadMessages : t.noMessages,
      onRefresh: () {
        ref.invalidate(unreadMessagesProvider);
        return ref.refresh(provider.future);
      },
      onLoadMore: () => ref.read(provider.notifier).loadMore(),
      onRetry: () => ref.invalidate(provider),
      itemBuilder: (context, message) => _MessageTile(
        message: message,
        onTap: () {
          // read in the background; going there doesn't wait for it
          ref.read(provider.notifier).markRead(message).catchError((_) {});
          final route = messageRoute(message.type, message.studentId);
          if (route != null) context.push(route);
        },
      ),
    );
  }
}

class _MessageTile extends StatelessWidget {
  const _MessageTile({required this.message, required this.onTap});

  final AppMessage message;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final look = messageLook(message.type, theme.colorScheme);
    final (:title, :body) = messageText(context, message);
    final unread = !message.read;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      // an unread message stands out a little, as on the website
      color: unread ? theme.colorScheme.primary.withValues(alpha: 0.04) : null,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconBadge(look.icon, color: look.color, size: 42),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: unread ? FontWeight.w700 : FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(messageAge(context, message.createdAt), style: theme.textTheme.bodySmall),
                        if (unread) ...[
                          const SizedBox(width: 8),
                          Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(color: theme.colorScheme.primary, shape: BoxShape.circle),
                          ),
                        ],
                      ],
                    ),
                    if (body.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(body, style: theme.textTheme.bodyMedium?.copyWith(color: context.palette.muted)),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
