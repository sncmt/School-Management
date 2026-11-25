import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/format.dart';
import '../../core/paged.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/attendance_status.dart';
import '../auth/auth_controller.dart';

// The messages inbox, as on the website's Messages page (server: modules/notification; client:
// components/school/messages). Every push notification is one of these messages. A message
// keeps its kind and facts; the sentence is written here, in the reader's language, with the
// website's wording (client/messages, the "inbox" strings).

/// One message (GET /notification).
class AppMessage {
  AppMessage({required this.id, required this.type, required this.data, this.studentId, required this.read, required this.createdAt});

  final String id;

  /// STUDENT_ABSENT, PAYMENT_RECEIVED, RESULT_PUBLISHED...
  final String type;

  /// The facts: the student's names, the amount, the date...
  final Map<String, dynamic> data;
  final String? studentId;
  final bool read;
  final DateTime createdAt;

  AppMessage markedRead() => AppMessage(id: id, type: type, data: data, studentId: studentId, read: true, createdAt: createdAt);

  factory AppMessage.fromJson(Map<String, dynamic> json) => AppMessage(
        id: json['id'] as String,
        type: json['type'] as String,
        data: (json['data'] as Map?)?.cast<String, dynamic>() ?? const {},
        studentId: json['studentId'] as String?,
        read: json['read'] == true,
        createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
      );
}

/// Where a message (or its push notification) leads: what it is about, for that child.
String? messageRoute(String? type, String? studentId) {
  if (studentId == null || studentId.isEmpty) return null;
  return switch (type) {
    'STUDENT_PRESENT' || 'STUDENT_ABSENT' || 'STUDENT_LATE' => '/child/$studentId/attendance',
    'PAYMENT_RECEIVED' || 'PAYMENT_CANCELLED' || 'FEE_DUE' => '/child/$studentId/payments',
    _ => '/child/$studentId',
  };
}

/// Each kind's icon and colour (the words carry the meaning; the colour only helps).
({IconData icon, Color color}) messageLook(String type, ColorScheme scheme) => switch (type) {
      'STUDENT_ADMITTED' || 'STUDENT_PROMOTED' || 'STUDENT_PRESENT' => (
          icon: type == 'STUDENT_PRESENT' ? Icons.how_to_reg_rounded : (type == 'STUDENT_ADMITTED' ? Icons.person_add_alt_1_rounded : Icons.school_rounded),
          color: AttendanceStatus.present.color,
        ),
      'STUDENT_ABSENT' => (icon: Icons.person_off_rounded, color: AttendanceStatus.absent.color),
      'STUDENT_LATE' => (icon: Icons.schedule_rounded, color: AttendanceStatus.late.color),
      'PAYMENT_RECEIVED' => (icon: Icons.payments_rounded, color: scheme.primary),
      'PAYMENT_CANCELLED' => (icon: Icons.cancel_rounded, color: AttendanceStatus.absent.color),
      'RESULT_PUBLISHED' => (icon: Icons.emoji_events_rounded, color: const Color(0xFF7C3AED)),
      'ADMIT_CARD_RELEASED' => (icon: Icons.badge_rounded, color: scheme.primary),
      'FEE_DUE' => (icon: Icons.account_balance_wallet_rounded, color: AttendanceStatus.late.color),
      _ => (icon: Icons.notifications_rounded, color: scheme.primary),
    };

/// A message's title and sentence in the app's language.
({String title, String body}) messageText(BuildContext context, AppMessage m) {
  final t = AppLocalizations.of(context);
  final d = m.data;
  String name(Object? names) => names is Map ? context.pick(names['nameEn'] as String?, names['nameBn'] as String?) : '';
  String text(String key) => (d[key] as Object?)?.toString() ?? '—';
  final student = name(d['student']);
  final place = [d['className'], if (d['section'] != null) '(${d['section']})'].whereType<String>().join(' ');
  final placeText = place.isEmpty ? '—' : place;
  final amount = d['amount'] == null ? '—' : context.money('${d['amount']}');
  final date = d['date'] is String ? DateFormat('EEEE, d MMMM', Localizations.localeOf(context).languageCode).format(DateTime.parse(d['date'] as String)) : '';

  return switch (m.type) {
    'STUDENT_ADMITTED' => (title: t.msgAdmittedTitle, body: t.msgAdmittedBody(student, placeText, text('academicYear'), text('admissionNo'))),
    'PAYMENT_RECEIVED' => (title: t.msgPaymentReceivedTitle, body: t.msgPaymentReceivedBody(amount, student, text('receiptNo'))),
    'PAYMENT_CANCELLED' => (title: t.msgPaymentCancelledTitle, body: t.msgPaymentCancelledBody(amount, student, text('receiptNo'))),
    'STUDENT_PRESENT' => (title: t.msgPresentTitle, body: t.msgPresentBody(student, date)),
    'STUDENT_ABSENT' => (title: t.msgAbsentTitle, body: t.msgAbsentBody(student, date)),
    'STUDENT_LATE' => (title: t.msgLateTitle, body: t.msgLateBody(student, date)),
    'RESULT_PUBLISHED' => (title: t.msgResultTitle, body: t.msgResultBody(student, name(d['exam']))),
    'ADMIT_CARD_RELEASED' => (title: t.msgAdmitCardTitle, body: t.msgAdmitCardBody(student, name(d['exam']))),
    'FEE_DUE' => (
        title: t.msgFeeDueTitle,
        body: (d['fees'] as num? ?? 0) == 1 ? t.msgFeeDueBodyOne(student, amount) : t.msgFeeDueBody(student, amount, context.number(d['fees'] as num? ?? 0)),
      ),
    'STUDENT_PROMOTED' when d['outcome'] == 'GRADUATED' => (title: t.msgGraduatedTitle, body: t.msgGraduatedBody(student, text('className'))),
    'STUDENT_PROMOTED' => (title: t.msgPromotedTitle, body: t.msgPromotedBody(student, placeText, text('academicYear'))),
    _ => (title: t.messages, body: ''),
  };
}

/// "Just now", "5 min ago", "3 h ago", "Yesterday", or the date.
String messageAge(BuildContext context, DateTime at) {
  final t = AppLocalizations.of(context);
  final gone = DateTime.now().difference(at);
  if (gone.inMinutes < 1) return t.justNow;
  if (gone.inMinutes < 60) return t.minutesAgo(context.number(gone.inMinutes));
  if (gone.inHours < 24) return t.hoursAgo(context.number(gone.inHours));
  if (gone.inDays < 2) return t.yesterday;
  return DateFormat.MMMd(Localizations.localeOf(context).languageCode).format(at);
}

/// The inbox, newest first, 20 at a time: everything, or only the unread ones.
class MessageList extends PagedNotifier<AppMessage> {
  MessageList(this.unreadOnly);

  final bool unreadOnly;

  @override
  Future<(List<AppMessage>, int)> fetch(int page) async {
    final json = await ref.read(apiClientProvider)!.get<Map<String, dynamic>>(
      '/notification',
      query: {'page': page, if (unreadOnly) 'unread': 'true'},
    );
    return pageOf(json, AppMessage.fromJson);
  }

  /// Opened: read on the server and here, and the badge follows.
  Future<void> markRead(AppMessage message) async {
    if (message.read) return;
    await ref.read(apiClientProvider)!.post<void>('/notification/${message.id}/read');
    final current = state.value;
    if (current != null) {
      state = AsyncData(Paged([for (final m in current.items) m.id == message.id ? m.markedRead() : m], hasMore: current.hasMore));
    }
    ref.invalidate(unreadMessagesProvider);
    ref.invalidate(messageListProvider(!unreadOnly));
  }
}

final messageListProvider =
    AsyncNotifierProvider.autoDispose.family<MessageList, Paged<AppMessage>, bool>(MessageList.new);

/// How many messages are unread, for the bottom bar's badge. A failed count shows no badge.
final unreadMessagesProvider = FutureProvider.autoDispose<int>((ref) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/notification/unread-count');
  return json['unread'] as int? ?? 0;
});

/// Every message read: one request, then the lists and the badge refresh.
Future<void> markAllMessagesRead(WidgetRef ref) async {
  await ref.read(apiClientProvider)!.post<void>('/notification/read-all');
  ref.invalidate(messageListProvider);
  ref.invalidate(unreadMessagesProvider);
}

/// A message opened from its push notification: read, without the inbox being open.
Future<void> markMessageRead(Ref ref, String id) async {
  try {
    await ref.read(apiClientProvider)?.post<void>('/notification/$id/read');
  } catch (_) {
    // stays unread; the inbox shows it
  }
  ref.invalidate(unreadMessagesProvider);
  ref.invalidate(messageListProvider);
}
