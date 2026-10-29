import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../widgets/attendance_status.dart';
import '../auth/auth_controller.dart';

/// A section a class is taught to: "Six · A" (a class's only section has no name of its own).
class SectionRef {
  SectionRef({required this.id, required this.className, this.sectionName});

  final String id;
  final String className;

  /// null for a class's default (only) section.
  final String? sectionName;

  String get label => sectionName == null ? className : '$className · $sectionName';
}

/// One class in the teacher's routine (GET /routine/me/day and /me/week).
class TeacherClass {
  TeacherClass({
    required this.weekday,
    required this.periodNumber,
    this.startTime,
    this.endTime,
    required this.subjectEn,
    this.subjectBn,
    required this.sections,
    this.isSubstitute = false,
    this.held = true,
    this.coveredByEn,
    this.coveredByBn,
  });

  /// 0 = Sunday.
  final int weekday;
  final int periodNumber;

  /// "HH:mm"; null when the section has no period template.
  final String? startTime;
  final String? endTime;
  final String subjectEn;
  final String? subjectBn;

  /// Usually one; more for sections taught together.
  final List<SectionRef> sections;

  /// Today only: covering another teacher's class.
  final bool isSubstitute;

  /// Today only: false when the class doesn't happen (a holiday for that class, a changed schedule).
  final bool held;

  /// Today only: this teacher's own class, taken by a substitute.
  final String? coveredByEn;
  final String? coveredByBn;

  bool get coveredByOther => coveredByEn != null && !isSubstitute;

  String get sectionLabel => sections.map((s) => s.label).join(', ');

  factory TeacherClass.fromJson(Map<String, dynamic> json) {
    final subject = json['subject'] as Map<String, dynamic>;
    final className = (json['class'] as Map?)?['name'] as String? ?? '';
    final substitute = (json['substitution'] as Map?)?['teacher'] as Map?;
    return TeacherClass(
      weekday: json['weekday'] as int,
      periodNumber: json['periodNumber'] as int,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      subjectEn: subject['nameEn'] as String,
      subjectBn: subject['nameBn'] as String?,
      sections: [
        for (final s in (json['sections'] as List?) ?? const [])
          SectionRef(
            id: (s as Map)['id'] as String,
            className: className,
            sectionName: s['isDefault'] == true ? null : s['name'] as String?,
          ),
      ],
      isSubstitute: json['role'] == 'SUBSTITUTE',
      held: json['held'] != false,
      coveredByEn: substitute?['nameEn'] as String?,
      coveredByBn: substitute?['nameBn'] as String?,
    );
  }
}

/// The teacher's day: whether it's a school day, and their classes in time order.
class TeacherDay {
  TeacherDay({required this.date, required this.isSchoolDay, this.offEn, this.offBn, required this.classes});

  final String date;
  final bool isSchoolDay;

  /// The holiday's name on a day off.
  final String? offEn;
  final String? offBn;
  final List<TeacherClass> classes;

  factory TeacherDay.fromJson(Map<String, dynamic> json) {
    final day = json['day'] as Map<String, dynamic>;
    final source = day['source'] as Map<String, dynamic>?;
    return TeacherDay(
      date: json['date'] as String,
      isSchoolDay: day['isSchoolDay'] == true,
      offEn: source?['nameEn'] as String?,
      offBn: source?['nameBn'] as String?,
      classes: [for (final c in json['classes'] as List) TeacherClass.fromJson(c as Map<String, dynamic>)],
    );
  }
}

final myDayProvider = FutureProvider.autoDispose<TeacherDay>((ref) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/routine/me/day');
  return TeacherDay.fromJson(json);
});

/// The teacher's whole week (this year's routine).
final myWeekProvider = FutureProvider.autoDispose<List<TeacherClass>>((ref) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/routine/me/week');
  return [for (final e in json['entries'] as List) TeacherClass.fromJson(e as Map<String, dynamic>)];
});

/// The sections the teacher teaches in the week, for taking attendance.
List<SectionRef> sectionsOf(List<TeacherClass> week) {
  final byId = <String, SectionRef>{};
  for (final c in week) {
    for (final s in c.sections) {
      byId.putIfAbsent(s.id, () => s);
    }
  }
  return byId.values.toList()..sort((a, b) => a.label.compareTo(b.label));
}

// --------------------------------------------------------------------- attendance

/// A section's roll call for a date (GET /attendance/students/sheet).
class RollCall {
  RollCall({
    required this.sectionId,
    required this.date,
    required this.taken,
    required this.canTake,
    this.cannotTakeReason,
    required this.students,
  });

  final String sectionId;
  final String date;

  /// Already saved once today.
  final bool taken;
  final bool canTake;
  final String? cannotTakeReason;
  final List<RollEntry> students;

  factory RollCall.fromJson(Map<String, dynamic> json) => RollCall(
        sectionId: (json['section'] as Map)['id'] as String,
        date: json['date'] as String,
        taken: json['taken'] == true,
        canTake: json['canTake'] == true,
        cannotTakeReason: json['cannotTakeReason'] as String?,
        students: [for (final s in json['items'] as List) RollEntry.fromJson(s as Map<String, dynamic>)],
      );
}

class RollEntry {
  RollEntry({
    required this.studentId,
    required this.nameEn,
    this.nameBn,
    this.photo,
    this.rollNumber,
    required this.status,
    required this.saved,
    this.fromDevice = false,
    this.checkInAt,
  });

  final String studentId;
  final String nameEn;
  final String? nameBn;
  final String? photo;
  final String? rollNumber;

  /// Saved status, or PRESENT as the suggestion before the first save.
  final AttendanceStatus status;
  final bool saved;

  /// Marked by the fingerprint machine.
  final bool fromDevice;
  final String? checkInAt;

  factory RollEntry.fromJson(Map<String, dynamic> json) {
    final student = json['student'] as Map<String, dynamic>;
    return RollEntry(
      studentId: student['id'] as String,
      nameEn: student['nameEn'] as String,
      nameBn: student['nameBn'] as String?,
      photo: student['photo'] as String?,
      rollNumber: json['rollNumber']?.toString(),
      status: AttendanceStatus.parse(json['status'] as String?) ?? AttendanceStatus.present,
      saved: json['saved'] == true,
      fromDevice: json['source'] == 'DEVICE',
      checkInAt: json['checkInAt'] as String?,
    );
  }
}

/// ("sectionId", "2026-10-28").
final rollCallProvider = FutureProvider.autoDispose.family<RollCall, (String, String)>((ref, key) async {
  final (sectionId, date) = key;
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>(
    '/attendance/students/sheet',
    query: {'sectionId': sectionId, 'date': date},
  );
  return RollCall.fromJson(json);
});

/// Saves a roll call: every student whose mark changed, and any not saved before.
Future<void> saveRollCall(
  ApiClient api, {
  required RollCall sheet,
  required Map<String, AttendanceStatus> marks,
}) async {
  final records = [
    for (final s in sheet.students)
      if (!s.saved || marks[s.studentId] != s.status)
        {'studentId': s.studentId, 'status': (marks[s.studentId] ?? s.status).name.toUpperCase()},
  ];
  await api.put<void>(
    '/attendance/students/sheet',
    body: {'sectionId': sheet.sectionId, 'date': sheet.date, 'records': records},
  );
}
