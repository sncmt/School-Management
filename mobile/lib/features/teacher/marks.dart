import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import 'teacher.dart';

num? _num(Object? v) => v is num ? v : (v is String ? num.tryParse(v) : null);

/// A marks sheet the teacher can fill: one exam subject in one of their sections
/// (GET /exam-marks/mine). Only classes whose marks entry is open.
class MarkSheetRef {
  MarkSheetRef({
    required this.examSubjectId,
    required this.examId,
    required this.examEn,
    this.examBn,
    required this.section,
    required this.subjectEn,
    this.subjectBn,
    required this.date,
    required this.open,
  });

  final String examSubjectId;
  final String examId;
  final String examEn;
  final String? examBn;
  final SectionRef section;
  final String subjectEn;
  final String? subjectBn;

  /// The subject's exam day ("2026-11-03"): marks open on it.
  final String date;
  final bool open;

  factory MarkSheetRef.fromJson(Map<String, dynamic> json) {
    final exam = json['exam'] as Map<String, dynamic>;
    final section = json['section'] as Map<String, dynamic>;
    final subject = json['subject'] as Map<String, dynamic>;
    return MarkSheetRef(
      examSubjectId: json['examSubjectId'] as String,
      examId: exam['id'] as String,
      examEn: exam['nameEn'] as String,
      examBn: exam['nameBn'] as String?,
      section: SectionRef(
        id: section['id'] as String,
        className: (json['class'] as Map)['name'] as String,
        sectionName: section['isDefault'] == true ? null : section['name'] as String?,
      ),
      subjectEn: subject['nameEn'] as String,
      subjectBn: subject['nameBn'] as String?,
      date: json['date'] as String,
      open: json['open'] == true,
    );
  }
}

final mySheetsProvider = FutureProvider.autoDispose<List<MarkSheetRef>>((ref) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/exam-marks/mine');
  return [for (final s in json['items'] as List) MarkSheetRef.fromJson(s as Map<String, dynamic>)];
});

/// A part of a subject's marks (Written, MCQ, Practical).
class MarkPart {
  MarkPart({required this.name, required this.fullMarks, required this.passMarks});

  final String name;
  final num fullMarks;
  final num passMarks;
}

/// One subject's marks in one section (GET /exam-marks/sheet).
class MarksSheet {
  MarksSheet({
    required this.examSubjectId,
    required this.sectionId,
    required this.fullMarks,
    required this.passMarks,
    required this.parts,
    required this.canEdit,
    this.cannotEditReason,
    required this.students,
  });

  final String examSubjectId;
  final String sectionId;
  final num fullMarks;
  final num passMarks;

  /// Empty: one total per student.
  final List<MarkPart> parts;
  final bool canEdit;
  final String? cannotEditReason;
  final List<MarkStudent> students;

  int get entered => students.where((s) => s.entered).length;

  factory MarksSheet.fromJson(Map<String, dynamic> json, {required String examSubjectId}) => MarksSheet(
        examSubjectId: examSubjectId,
        sectionId: (json['section'] as Map)['id'] as String,
        fullMarks: _num(json['fullMarks']) ?? 0,
        passMarks: _num(json['passMarks']) ?? 0,
        parts: [
          for (final p in (json['parts'] as List?) ?? const [])
            MarkPart(name: (p as Map)['name'] as String, fullMarks: _num(p['fullMarks']) ?? 0, passMarks: _num(p['passMarks']) ?? 0),
        ],
        canEdit: json['canEdit'] == true,
        cannotEditReason: json['cannotEditReason'] as String?,
        students: [for (final s in json['items'] as List) MarkStudent.fromJson(s as Map<String, dynamic>)],
      );
}

class MarkStudent {
  MarkStudent({
    required this.enrollmentId,
    this.rollNumber,
    required this.nameEn,
    this.nameBn,
    required this.entered,
    required this.isAbsent,
    this.parts,
    this.total,
  });

  final String enrollmentId;
  final String? rollNumber;
  final String nameEn;
  final String? nameBn;
  final bool entered;
  final bool isAbsent;

  /// Each part's marks, for a subject with parts.
  final Map<String, num>? parts;
  final num? total;

  factory MarkStudent.fromJson(Map<String, dynamic> json) {
    final student = json['student'] as Map<String, dynamic>;
    final parts = json['parts'] as Map?;
    return MarkStudent(
      enrollmentId: json['enrollmentId'] as String,
      rollNumber: json['rollNumber']?.toString(),
      nameEn: student['nameEn'] as String,
      nameBn: student['nameBn'] as String?,
      entered: json['entered'] == true,
      isAbsent: json['isAbsent'] == true,
      parts: parts == null ? null : {for (final e in parts.entries) e.key as String: _num(e.value) ?? 0},
      total: _num(json['total']),
    );
  }
}

/// ("examSubjectId", "sectionId").
final marksSheetProvider = FutureProvider.autoDispose.family<MarksSheet, (String, String)>((ref, key) async {
  final (examSubjectId, sectionId) = key;
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>(
    '/exam-marks/sheet',
    query: {'examSubjectId': examSubjectId, 'sectionId': sectionId},
  );
  return MarksSheet.fromJson(json, examSubjectId: examSubjectId);
});
