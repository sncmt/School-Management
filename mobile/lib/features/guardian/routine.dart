import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';

/// A child's weekly class routine (GET /family/routine): only the classes the child sits.
class Routine {
  Routine({required this.periods, required this.schoolDays, required this.entries});

  /// The day's periods in order, breaks included.
  final List<Period> periods;

  /// 0 = Sunday .. 6 = Saturday, without the weekly holidays.
  final List<int> schoolDays;
  final List<RoutineEntry> entries;

  RoutineEntry? at(int weekday, int period) =>
      entries.where((e) => e.weekday == weekday && e.periodNumber == period).firstOrNull;

  factory Routine.fromJson(Map<String, dynamic> json) => Routine(
        periods: [for (final p in json['periods'] as List) Period.fromJson(p as Map<String, dynamic>)],
        schoolDays: [
          for (final d in json['days'] as List)
            if ((d as Map)['isWeeklyHoliday'] != true) d['weekday'] as int,
        ],
        entries: [for (final e in json['entries'] as List) RoutineEntry.fromJson(e as Map<String, dynamic>)],
      );
}

class Period {
  Period({required this.number, this.nameEn, this.nameBn, required this.startTime, required this.endTime, required this.isBreak});

  final int number;
  final String? nameEn;
  final String? nameBn;

  /// "HH:mm".
  final String startTime;
  final String endTime;

  /// Tiffin, prayer: no class.
  final bool isBreak;

  factory Period.fromJson(Map<String, dynamic> json) => Period(
        number: json['number'] as int,
        nameEn: json['nameEn'] as String?,
        nameBn: json['nameBn'] as String?,
        startTime: json['startTime'] as String,
        endTime: json['endTime'] as String,
        isBreak: json['isBreak'] == true,
      );
}

class RoutineEntry {
  RoutineEntry({
    required this.weekday,
    required this.periodNumber,
    required this.subjectEn,
    this.subjectBn,
    this.teacherEn,
    this.teacherBn,
  });

  final int weekday;
  final int periodNumber;
  final String subjectEn;
  final String? subjectBn;

  /// null until the school assigns a teacher.
  final String? teacherEn;
  final String? teacherBn;

  factory RoutineEntry.fromJson(Map<String, dynamic> json) {
    final subject = json['subject'] as Map<String, dynamic>;
    final teacher = json['teacher'] as Map<String, dynamic>?;
    return RoutineEntry(
      weekday: json['weekday'] as int,
      periodNumber: json['periodNumber'] as int,
      subjectEn: subject['nameEn'] as String,
      subjectBn: subject['nameBn'] as String?,
      teacherEn: teacher?['nameEn'] as String?,
      teacherBn: teacher?['nameBn'] as String?,
    );
  }
}

/// null when the child isn't on roll this year.
final routineProvider = FutureProvider.autoDispose.family<Routine?, String>((ref, studentId) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>?>('/family/routine', query: {'studentId': studentId});
  return json == null ? null : Routine.fromJson(json);
});

// ---------------------------------------------------------------------- admit card

/// A child's admit card for one exam (GET /family/admit-card), once the school released it.
class AdmitCard {
  AdmitCard({
    required this.examEn,
    this.examBn,
    this.year,
    this.schoolEn,
    this.schoolBn,
    this.schoolLogo,
    required this.studentEn,
    this.studentBn,
    this.photo,
    this.rollNumber,
    this.className,
    this.sectionName,
    this.groupEn,
    this.groupBn,
    this.firstDay,
    this.lastDay,
    this.room,
    this.building,
    this.seatNo,
    required this.rules,
  });

  final String examEn;
  final String? examBn;
  final String? year;
  final String? schoolEn;
  final String? schoolBn;
  final String? schoolLogo;
  final String studentEn;
  final String? studentBn;
  final String? photo;
  final String? rollNumber;
  final String? className;
  final String? sectionName;
  final String? groupEn;
  final String? groupBn;

  /// The class's first and last exam day ("2026-11-02").
  final String? firstDay;
  final String? lastDay;

  /// The seat, once the school has made the seat plan.
  final String? room;
  final String? building;
  final String? seatNo;

  /// The school's exam rules, one per line.
  final List<String> rules;

  factory AdmitCard.fromJson(Map<String, dynamic> json) {
    final exam = json['exam'] as Map<String, dynamic>;
    final school = json['school'] as Map<String, dynamic>?;
    final card = (json['cards'] as List).first as Map<String, dynamic>;
    final student = card['student'] as Map<String, dynamic>;
    final section = card['section'] as Map<String, dynamic>?;
    final group = card['group'] as Map<String, dynamic>?;
    final seat = card['seat'] as Map<String, dynamic>?;
    return AdmitCard(
      examEn: exam['nameEn'] as String,
      examBn: exam['nameBn'] as String?,
      year: (exam['academicYear'] as Map?)?['name'] as String?,
      schoolEn: school?['nameEn'] as String?,
      schoolBn: school?['nameBn'] as String?,
      schoolLogo: school?['logo'] as String?,
      studentEn: student['nameEn'] as String,
      studentBn: student['nameBn'] as String?,
      photo: student['photo'] as String?,
      rollNumber: card['rollNumber']?.toString(),
      className: (card['class'] as Map?)?['name'] as String?,
      sectionName: section == null || section['isDefault'] == true ? null : section['name'] as String?,
      groupEn: group?['nameEn'] as String?,
      groupBn: group?['nameBn'] as String?,
      firstDay: card['firstDay'] as String?,
      lastDay: card['lastDay'] as String?,
      room: seat?['room']?.toString(),
      building: seat?['building'] as String?,
      seatNo: seat?['seatNo']?.toString(),
      rules: [for (final r in (json['rules'] as List?) ?? const []) r as String],
    );
  }
}

/// ("studentId", "examId").
final admitCardProvider = FutureProvider.autoDispose.family<AdmitCard, (String, String)>((ref, key) async {
  final (studentId, examId) = key;
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>(
    '/family/admit-card',
    query: {'studentId': studentId, 'examId': examId},
  );
  return AdmitCard.fromJson(json);
});
