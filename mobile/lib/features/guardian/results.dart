import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';

/// The server sends marks as strings ("450.50") and counts as numbers: either becomes a num.
num? _num(Object? value) => value is num ? value : (value is String ? num.tryParse(value) : null);

/// A published exam result's headline (GET /family/results).
class ResultSummary {
  ResultSummary({
    required this.examId,
    required this.examEn,
    this.examBn,
    this.year,
    required this.totalMarks,
    required this.fullMarks,
    required this.percentage,
    this.gpa,
    this.grade,
    required this.passed,
  });

  final String examId;
  final String examEn;
  final String? examBn;
  final String? year;
  final num totalMarks;
  final num fullMarks;
  final num percentage;

  /// A graded result only; null for a marks-only result.
  final num? gpa;
  final String? grade;
  final bool passed;

  factory ResultSummary.fromJson(Map<String, dynamic> json) {
    final exam = json['exam'] as Map<String, dynamic>;
    return ResultSummary(
      examId: exam['id'] as String,
      examEn: exam['nameEn'] as String,
      examBn: exam['nameBn'] as String?,
      year: (json['academicYear'] as Map?)?['name'] as String?,
      totalMarks: _num(json['totalMarks']) ?? 0,
      fullMarks: _num(json['fullMarks']) ?? 0,
      percentage: _num(json['percentage']) ?? 0,
      gpa: _num(json['gpa']),
      grade: json['grade'] as String?,
      passed: json['passed'] == true,
    );
  }
}

final resultsProvider = FutureProvider.autoDispose.family<List<ResultSummary>, String>((ref, studentId) async {
  final list = await ref.watch(apiClientProvider)!.get<List<dynamic>>('/family/results', query: {'studentId': studentId});
  return [for (final r in list) ResultSummary.fromJson(r as Map<String, dynamic>)];
});

// --------------------------------------------------------------------------- marksheet

/// One exam's full result (GET /family/results/:examId): the school's own marksheet.
class Marksheet {
  Marksheet({
    required this.examEn,
    this.examBn,
    this.year,
    this.className,
    this.publishedAt,
    required this.totalMarks,
    required this.fullMarks,
    required this.percentage,
    this.gpa,
    this.grade,
    required this.passed,
    required this.failedSubjects,
    required this.sectionPosition,
    required this.sectionOutOf,
    required this.classPosition,
    required this.classOutOf,
    required this.workingDays,
    required this.present,
    this.attendancePercent,
    required this.subjects,
  });

  final String examEn;
  final String? examBn;
  final String? year;
  final String? className;
  final String? publishedAt;
  final num totalMarks;
  final num fullMarks;
  final num percentage;
  final num? gpa;
  final String? grade;
  final bool passed;
  final int failedSubjects;
  final int sectionPosition;
  final int sectionOutOf;
  final int classPosition;
  final int classOutOf;

  /// Attendance over the exam's attendance period.
  final int workingDays;
  final int present;
  final num? attendancePercent;

  final List<SubjectResult> subjects;

  bool get isGraded => gpa != null;

  factory Marksheet.fromJson(Map<String, dynamic> json) {
    final exam = json['exam'] as Map<String, dynamic>;
    final position = json['position'] as Map<String, dynamic>;
    final attendance = json['attendance'] as Map<String, dynamic>;
    return Marksheet(
      examEn: exam['nameEn'] as String,
      examBn: exam['nameBn'] as String?,
      year: (json['academicYear'] as Map?)?['name'] as String?,
      className: (json['class'] as Map?)?['name'] as String?,
      publishedAt: json['publishedAt'] as String?,
      totalMarks: _num(json['totalMarks']) ?? 0,
      fullMarks: _num(json['fullMarks']) ?? 0,
      percentage: _num(json['percentage']) ?? 0,
      gpa: _num(json['gpa']),
      grade: json['grade'] as String?,
      passed: json['passed'] == true,
      failedSubjects: _num(json['failedSubjects'])?.toInt() ?? 0,
      sectionPosition: _num(position['section'])?.toInt() ?? 0,
      sectionOutOf: _num(position['sectionOutOf'])?.toInt() ?? 0,
      classPosition: _num(position['class'])?.toInt() ?? 0,
      classOutOf: _num(position['classOutOf'])?.toInt() ?? 0,
      workingDays: _num(attendance['workingDays'])?.toInt() ?? 0,
      present: _num(attendance['present'])?.toInt() ?? 0,
      attendancePercent: _num(attendance['percentage']),
      subjects: [for (final s in json['subjects'] as List) SubjectResult.fromJson(s as Map<String, dynamic>)],
    );
  }
}

class SubjectResult {
  SubjectResult({
    required this.nameEn,
    this.nameBn,
    required this.fullMarks,
    this.marks,
    this.grade,
    this.point,
    required this.passed,
    required this.isAbsent,
    required this.isOptional,
    required this.excluded,
    required this.parts,
  });

  final String nameEn;
  final String? nameBn;
  final num fullMarks;

  /// null when absent.
  final num? marks;
  final String? grade;
  final num? point;
  final bool passed;
  final bool isAbsent;

  /// The 4th subject: only its bonus counts towards the GPA.
  final bool isOptional;

  /// Absent under the school's "exclude" rule: left out of the totals and GPA.
  final bool excluded;

  /// Its parts (written, MCQ, practical...), when it has them.
  final List<SubjectPart> parts;

  factory SubjectResult.fromJson(Map<String, dynamic> json) => SubjectResult(
        nameEn: json['nameEn'] as String? ?? '',
        nameBn: json['nameBn'] as String?,
        fullMarks: _num(json['fullMarks']) ?? 0,
        marks: _num(json['marks']),
        grade: json['grade'] as String?,
        point: _num(json['point']),
        passed: json['passed'] == true,
        isAbsent: json['isAbsent'] == true,
        isOptional: json['isOptional'] == true,
        excluded: json['excluded'] == true,
        parts: [
          for (final p in (json['parts'] as List?) ?? const [])
            SubjectPart(
              name: (p as Map)['name'] as String? ?? '',
              fullMarks: _num(p['fullMarks']) ?? 0,
              marks: _num(p['marks']),
            ),
        ],
      );
}

class SubjectPart {
  SubjectPart({required this.name, required this.fullMarks, this.marks});

  final String name;
  final num fullMarks;
  final num? marks;
}

/// ("studentId", "examId").
final marksheetProvider = FutureProvider.autoDispose.family<Marksheet, (String, String)>((ref, key) async {
  final (studentId, examId) = key;
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>(
    '/family/results/$examId',
    query: {'studentId': studentId},
  );
  return Marksheet.fromJson(json);
});
