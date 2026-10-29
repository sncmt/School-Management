import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/paged.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/attachment_list.dart';
import '../auth/auth_controller.dart';

/// A notice on the board (GET /notice/board): only the ones this person may read now.
class Notice {
  Notice({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.pinned,
    required this.publishAt,
    required this.attachments,
    required this.read,
  });

  final String id;
  final String title;
  final String body;
  final NoticeCategory category;
  final bool pinned;
  final String publishAt;
  final List<Attachment> attachments;
  final bool read;

  Notice markedRead() => Notice(
        id: id,
        title: title,
        body: body,
        category: category,
        pinned: pinned,
        publishAt: publishAt,
        attachments: attachments,
        read: true,
      );

  factory Notice.fromJson(Map<String, dynamic> json) => Notice(
        id: json['id'] as String,
        title: json['title'] as String,
        body: json['body'] as String? ?? '',
        category: NoticeCategory.parse(json['category'] as String?),
        pinned: json['pinned'] == true,
        publishAt: json['publishAt'] as String,
        attachments: Attachment.listFrom(json['attachments']),
        read: json['read'] == true,
      );
}

enum NoticeCategory {
  general,
  exam,
  holiday,
  fees,
  event,
  urgent;

  static NoticeCategory parse(String? value) =>
      values.where((c) => c.name.toUpperCase() == value).firstOrNull ?? general;

  // the website's badge colours (client notices/shared.tsx)
  Color get color => switch (this) {
        general => const Color(0xFF475569),
        exam => const Color(0xFF1D4ED8),
        holiday => const Color(0xFF047857),
        fees => const Color(0xFF6D28D9),
        event => const Color(0xFF92400E),
        urgent => const Color(0xFFB91C1C),
      };

  String label(AppLocalizations t) => switch (this) {
        general => t.categoryGeneral,
        exam => t.categoryExam,
        holiday => t.categoryHoliday,
        fees => t.categoryFees,
        event => t.categoryEvent,
        urgent => t.categoryUrgent,
      };
}

/// The board, pinned first, newest first, 20 at a time.
class NoticeBoard extends PagedNotifier<Notice> {
  @override
  Future<(List<Notice>, int)> fetch(int page) async {
    final json = await ref.read(apiClientProvider)!.get<Map<String, dynamic>>('/notice/board', query: {'page': page});
    return pageOf(json, Notice.fromJson);
  }

  /// Records the read on the server and in the list, and updates the unread badge.
  Future<void> markRead(Notice notice) async {
    if (notice.read) return;
    await ref.read(apiClientProvider)!.post<void>('/notice/${notice.id}/read');
    final current = state.value;
    if (current != null) {
      state = AsyncData(Paged(
        [for (final n in current.items) n.id == notice.id ? n.markedRead() : n],
        hasMore: current.hasMore,
      ));
    }
    ref.invalidate(unreadNoticesProvider);
  }
}

final noticeBoardProvider = AsyncNotifierProvider.autoDispose<NoticeBoard, Paged<Notice>>(NoticeBoard.new);

/// How many notices this person hasn't opened yet, for the badge on the home screen.
final unreadNoticesProvider = FutureProvider.autoDispose<int>((ref) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/notice/board', query: {'limit': 1});
  return json['unread'] as int? ?? 0;
});
