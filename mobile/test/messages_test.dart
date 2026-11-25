import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sncmt/core/paged.dart';
import 'package:sncmt/features/messages/messages.dart';
import 'package:sncmt/features/teacher/teacher.dart';
import 'package:sncmt/l10n/app_localizations.dart';

// GET /notification as the server sends it (NotificationService.listMine), one message of each
// kind, with the data each notify* writes: amounts as strings, the fee count as a number, the
// day as "YYYY-MM-DD", an exam's English name missing.
const _inbox = '''
{
  "items": [
    { "id": "n1", "type": "STUDENT_ABSENT", "studentId": "s1", "read": false, "createdAt": "2026-11-24T03:10:00.000Z",
      "data": { "student": { "nameEn": "Rahim Uddin", "nameBn": "রহিম উদ্দিন" }, "date": "2026-11-24" } },
    { "id": "n2", "type": "PAYMENT_RECEIVED", "studentId": "s1", "read": true, "createdAt": "2026-11-20T08:00:00.000Z",
      "data": { "student": { "nameEn": "Rahim Uddin", "nameBn": "রহিম উদ্দিন" }, "amount": "1200.00", "receiptNo": "R-0042" } },
    { "id": "n3", "type": "FEE_DUE", "studentId": "s1", "read": false, "createdAt": "2026-11-01T02:00:00.000Z",
      "data": { "student": { "nameEn": "Rahim Uddin", "nameBn": "রহিম উদ্দিন" }, "amount": "2500.00", "fees": 3 } },
    { "id": "n4", "type": "RESULT_PUBLISHED", "studentId": "s1", "read": false, "createdAt": "2026-10-30T02:00:00.000Z",
      "data": { "student": { "nameEn": "Rahim Uddin", "nameBn": "রহিম উদ্দিন" }, "exam": { "nameEn": null, "nameBn": "অর্ধবার্ষিক" }, "className": "Six" } },
    { "id": "n5", "type": "STUDENT_ADMITTED", "studentId": "s1", "read": true, "createdAt": "2026-01-05T02:00:00.000Z",
      "data": { "student": { "nameEn": "Rahim Uddin", "nameBn": "রহিম উদ্দিন" }, "admissionNo": "2026-001", "className": "Six", "section": null, "academicYear": "2026" } },
    { "id": "n6", "type": "STUDENT_PROMOTED", "studentId": "s1", "read": true, "createdAt": "2025-12-30T02:00:00.000Z",
      "data": { "student": { "nameEn": "Rahim Uddin", "nameBn": "রহিম উদ্দিন" }, "outcome": "GRADUATED", "className": "Ten" } }
  ],
  "unread": 3,
  "meta": { "page": 1, "limit": 20, "total": 6, "totalPages": 1 }
}
''';

void main() {
  final (messages, pages) = pageOf(jsonDecode(_inbox) as Map<String, dynamic>, AppMessage.fromJson);

  test('the inbox reads every kind of message', () {
    expect(pages, 1);
    expect(messages.map((m) => m.read), [false, true, false, false, true, true]);
    expect(messageRoute(messages[0].type, messages[0].studentId), '/child/s1/attendance');
    expect(messageRoute(messages[2].type, messages[2].studentId), '/child/s1/payments');
    expect(messageRoute('RESULT_PUBLISHED', ''), isNull);
  });

  for (final locale in const [Locale('en'), Locale('bn')]) {
    testWidgets('every message has a sentence in ${locale.languageCode}', (tester) async {
      final texts = <({String title, String body})>[];
      await tester.pumpWidget(
        MaterialApp(
          locale: locale,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Builder(
            builder: (context) {
              texts
                ..clear()
                ..addAll(messages.map((m) => messageText(context, m)));
              return const SizedBox();
            },
          ),
        ),
      );
      expect(texts, hasLength(messages.length));
      expect(texts.every((x) => x.title.isNotEmpty && x.body.isNotEmpty), isTrue);
      if (locale.languageCode == 'en') {
        expect(texts[0].body, 'Rahim Uddin was absent on Tuesday, 24 November.');
        expect(texts[3].body, "Rahim Uddin's অর্ধবার্ষিক result is out."); // no English name: the Bangla one
      }
    });
  }

  test('a class teacher may take their own section without the permission', () {
    final access = RollCallAccess.fromJson(
      jsonDecode('''
        { "canMarkAny": false, "sections": [
          { "id": "sec1", "name": "A", "isDefault": false, "class": { "id": "c1", "name": "Six", "numericLevel": 6 } },
          { "id": "sec2", "name": "Default", "isDefault": true, "class": { "id": "c2", "name": "Seven", "numericLevel": 7 } }
        ] }
      ''') as Map<String, dynamic>,
    );
    expect(access.canTakeAny, isTrue);
    expect(access.classTeacherOf.map((s) => s.label), ['Six · A', 'Seven']);
    expect(RollCallAccess.fromJson({'canMarkAny': false, 'sections': []}).canTakeAny, isFalse);
  });
}
