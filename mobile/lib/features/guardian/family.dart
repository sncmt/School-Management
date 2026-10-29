import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../widgets/attendance_status.dart';
import '../auth/auth_controller.dart';
import 'homework.dart';

/// GET /family: everything the guardian home and each child's page show.
class FamilyHome {
  FamilyHome({required this.children, required this.upcoming, required this.onlinePayment});

  final List<Child> children;

  /// The school's holidays in the next weeks.
  final List<Holiday> upcoming;

  /// Whether the school takes fees online (the "Pay" button, phase 3 part 3).
  final bool onlinePayment;

  Child? child(String id) => children.where((c) => c.id == id).firstOrNull;

  factory FamilyHome.fromJson(Map<String, dynamic> json) => FamilyHome(
        children: [for (final c in json['children'] as List) Child.fromJson(c as Map<String, dynamic>)],
        upcoming: [for (final h in json['upcoming'] as List) Holiday.fromJson(h as Map<String, dynamic>)],
        onlinePayment: (json['onlinePayment'] as Map?)?['enabled'] == true,
      );
}

class Child {
  Child({
    required this.id,
    required this.nameEn,
    this.nameBn,
    this.photo,
    this.className,
    this.sectionName,
    this.rollNumber,
    this.today,
    this.checkInAt,
    required this.month,
    required this.duesTotal,
    required this.fees,
    required this.homeworkTotal,
    required this.homework,
    required this.admitCards,
  });

  final String id;
  final String nameEn;
  final String? nameBn;
  final String? photo;
  final String? className;

  /// null for a class's only (default) section.
  final String? sectionName;
  final String? rollNumber;

  /// Today's roll call; null when it hasn't been taken (yet).
  final AttendanceStatus? today;
  final String? checkInAt;

  /// This month's counts by status.
  final Map<AttendanceStatus, int> month;

  final String duesTotal;
  final List<Fee> fees;
  final int homeworkTotal;

  /// Due from today, soonest first.
  final List<Homework> homework;
  final List<ExamRef> admitCards;

  bool get hasDues => (double.tryParse(duesTotal) ?? 0) > 0;

  factory Child.fromJson(Map<String, dynamic> json) {
    final enrollment = json['enrollment'] as Map<String, dynamic>?;
    final section = enrollment?['section'] as Map<String, dynamic>?;
    final attendance = json['attendance'] as Map<String, dynamic>;
    final today = attendance['today'] as Map<String, dynamic>?;
    final month = attendance['month'] as Map<String, dynamic>;
    final dues = json['dues'] as Map<String, dynamic>;
    final homework = json['homework'] as Map<String, dynamic>;
    return Child(
      id: json['id'] as String,
      nameEn: json['nameEn'] as String,
      nameBn: json['nameBn'] as String?,
      photo: json['photo'] as String?,
      className: (enrollment?['class'] as Map?)?['name'] as String?,
      sectionName: section == null || section['isDefault'] == true ? null : section['name'] as String?,
      rollNumber: enrollment?['rollNumber']?.toString(),
      today: AttendanceStatus.parse(today?['status'] as String?),
      checkInAt: today?['checkInAt'] as String?,
      month: {
        AttendanceStatus.present: month['present'] as int? ?? 0,
        AttendanceStatus.late: month['late'] as int? ?? 0,
        AttendanceStatus.absent: month['absent'] as int? ?? 0,
        AttendanceStatus.leave: month['leave'] as int? ?? 0,
      },
      duesTotal: dues['total'] as String,
      fees: [for (final f in dues['fees'] as List) Fee.fromJson(f as Map<String, dynamic>)],
      homeworkTotal: homework['total'] as int? ?? 0,
      homework: [for (final h in homework['items'] as List) Homework.fromJson(h as Map<String, dynamic>)],
      admitCards: [for (final e in json['admitCards'] as List) ExamRef.fromJson(e as Map<String, dynamic>)],
    );
  }
}

class Fee {
  Fee({required this.id, required this.nameEn, this.nameBn, this.month, this.year, this.description, required this.due});

  final String id;
  final String nameEn;
  final String? nameBn;

  /// "JAN".."DEC" for a monthly fee; null for a one-time fee.
  final String? month;
  final int? year;
  final String? description;
  final String due;

  factory Fee.fromJson(Map<String, dynamic> json) {
    final type = json['feeType'] as Map<String, dynamic>;
    return Fee(
      id: json['id'] as String,
      nameEn: type['nameEn'] as String,
      nameBn: type['nameBn'] as String?,
      month: json['month'] as String?,
      year: json['year'] as int?,
      description: json['description'] as String?,
      due: json['due'] as String,
    );
  }
}

class ExamRef {
  ExamRef({required this.id, required this.nameEn, this.nameBn});

  final String id;
  final String nameEn;
  final String? nameBn;

  factory ExamRef.fromJson(Map<String, dynamic> json) =>
      ExamRef(id: json['id'] as String, nameEn: json['nameEn'] as String, nameBn: json['nameBn'] as String?);
}

class Holiday {
  Holiday({required this.nameEn, this.nameBn, required this.from, required this.to});

  final String? nameEn;
  final String? nameBn;
  final String from;
  final String to;

  factory Holiday.fromJson(Map<String, dynamic> json) => Holiday(
        nameEn: json['nameEn'] as String?,
        nameBn: json['nameBn'] as String?,
        from: json['from'] as String,
        to: json['to'] as String,
      );
}

final familyHomeProvider = FutureProvider.autoDispose<FamilyHome>((ref) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/family');
  return FamilyHome.fromJson(json);
});

// ------------------------------------------------------------------ attendance month

/// GET /family/attendance: one child's month, day by day.
class AttendanceMonth {
  AttendanceMonth({required this.days, required this.counts, this.percentage});

  final List<AttendanceDay> days;
  final Map<AttendanceStatus, int> counts;

  /// (present + late) / days with a roll call; null when there was none.
  final num? percentage;

  factory AttendanceMonth.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>;
    return AttendanceMonth(
      days: [for (final d in json['days'] as List) AttendanceDay.fromJson(d as Map<String, dynamic>)],
      counts: {
        for (final s in AttendanceStatus.values) s: summary[s.name.toUpperCase()] as int? ?? 0,
      },
      percentage: summary['percentage'] as num?,
    );
  }
}

class AttendanceDay {
  AttendanceDay({required this.date, this.status, this.checkInAt, this.note, this.offReason, this.offNameEn, this.offNameBn});

  final String date;
  final AttendanceStatus? status;
  final String? checkInAt;
  final String? note;

  /// Why there was no school: "WEEKLY_HOLIDAY", "HOLIDAY", "NATIONAL_HOLIDAY"; null on a school day.
  final String? offReason;
  final String? offNameEn;
  final String? offNameBn;

  bool get isOff => offReason != null;

  factory AttendanceDay.fromJson(Map<String, dynamic> json) {
    final off = json['off'] as Map<String, dynamic>?;
    return AttendanceDay(
      date: json['date'] as String,
      status: AttendanceStatus.parse(json['status'] as String?),
      checkInAt: json['checkInAt'] as String?,
      note: json['note'] as String?,
      offReason: off?['reason'] as String?,
      offNameEn: off?['nameEn'] as String?,
      offNameBn: off?['nameBn'] as String?,
    );
  }
}

/// A child's month: ("studentId", "2026-10").
final attendanceMonthProvider = FutureProvider.autoDispose.family<AttendanceMonth, (String, String)>((ref, key) async {
  final (studentId, month) = key;
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>(
    '/family/attendance',
    query: {'studentId': studentId, 'month': month},
  );
  return AttendanceMonth.fromJson(json);
});
