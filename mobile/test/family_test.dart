import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:sncmt/features/guardian/family.dart';
import 'package:sncmt/features/guardian/results.dart';
import 'package:sncmt/widgets/attendance_status.dart';

// GET /family as the server sends it (FamilyService.getHome), for a school that names its exams,
// subjects and fee types in Bangla only: their English names are null. A required English name
// once made the guardian home fail with "Something went wrong".
const _familyHome = '''
{
  "today": "2026-11-09",
  "academicYear": { "id": "y1", "name": "2026" },
  "children": [
    {
      "id": "s1", "nameEn": "Rahim Uddin", "nameBn": "রহিম উদ্দিন", "admissionNo": "2026-001",
      "gender": "MALE", "status": "ACTIVE", "photo": null,
      "enrollment": {
        "id": "e1", "status": "ACTIVE", "rollNumber": "12",
        "academicYear": { "id": "y1", "name": "2026", "startDate": "2026-01-01T00:00:00.000Z", "isCurrent": true },
        "class": { "id": "c1", "name": "Six" },
        "section": { "id": "sec1", "name": "A", "isDefault": false },
        "group": null
      },
      "homework": {
        "total": 1,
        "items": [
          {
            "id": "h1", "title": "অনুশীলনী ২.১", "instructions": "", "assignedOn": "2026-11-08", "dueDate": "2026-11-10",
            "fullMarks": null, "subject": { "id": "sub1", "nameEn": null, "nameBn": "গণিত", "code": null },
            "attachments": [], "check": null
          }
        ]
      },
      "admitCards": [ { "id": "x1", "nameEn": null, "nameBn": "অর্ধবার্ষিক পরীক্ষা" } ],
      "attendance": { "today": { "status": "PRESENT", "checkInAt": "2026-11-09T02:05:00.000Z" }, "month": { "present": 6, "late": 1, "absent": 0, "leave": 0 } },
      "dues": {
        "total": "1500.00",
        "fees": [
          { "id": "f1", "month": "NOV", "year": 2026, "description": null, "feeType": { "nameEn": null, "nameBn": "বেতন" },
            "academicYear": { "id": "y1", "name": "2026" }, "due": "1000.00" },
          { "id": "f2", "month": null, "year": null, "description": "Late fine", "feeType": { "nameEn": "Fine", "nameBn": null },
            "academicYear": { "id": "y1", "name": "2026" }, "due": "500.00" }
        ]
      }
    }
  ],
  "upcoming": [ { "id": "e:1", "nameEn": null, "nameBn": "বিজয় দিবস", "kind": "HOLIDAY", "type": null, "from": "2026-12-16", "to": "2026-12-16" } ],
  "onlinePayment": { "enabled": false, "chargePercent": "0.00" }
}
''';

void main() {
  test('the guardian home reads a school with Bangla-only names', () {
    final home = FamilyHome.fromJson(jsonDecode(_familyHome) as Map<String, dynamic>);
    final child = home.children.single;

    expect(child.nameBn, 'রহিম উদ্দিন');
    expect(child.today, AttendanceStatus.present);
    expect(child.month[AttendanceStatus.present], 6);
    expect(child.hasDues, isTrue);
    expect(child.fees.first.nameEn, isNull);
    expect(child.fees.first.nameBn, 'বেতন');
    expect(child.homework.single.subjectEn, isNull);
    expect(child.admitCards.single.nameBn, 'অর্ধবার্ষিক পরীক্ষা');
    expect(home.upcoming.single.nameBn, 'বিজয় দিবস');
    expect(home.onlinePayment, isFalse);
  });

  test('a result list reads an exam with only a Bangla name', () {
    final r = ResultSummary.fromJson(jsonDecode('''
      { "exam": { "id": "x1", "nameEn": null, "nameBn": "অর্ধবার্ষিক" }, "academicYear": { "id": "y1", "name": "2026" },
        "class": { "id": "c1", "name": "Six" }, "publishedAt": "2026-11-01T00:00:00.000Z",
        "totalMarks": "540.00", "fullMarks": "600.00", "percentage": "90.00", "gpa": "5.00", "grade": "A+",
        "passed": true, "failedSubjects": 0 }
    ''') as Map<String, dynamic>);
    expect(r.examEn, isNull);
    expect(r.gpa, 5);
  });
}
