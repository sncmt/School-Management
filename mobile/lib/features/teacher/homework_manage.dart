import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/paged.dart';
import '../../widgets/attachment_list.dart';
import '../auth/auth_controller.dart';
import '../guardian/homework.dart';
import 'teacher.dart';

num? _num(Object? v) => v is num ? v : (v is String ? num.tryParse(v) : null);

List<SectionRef> _sections(Object? json, String className) => [
      for (final s in (json as List?) ?? const [])
        SectionRef(
          id: (s as Map)['id'] as String,
          className: className,
          sectionName: s['isDefault'] == true ? null : s['name'] as String?,
        ),
    ];

/// A subject the teacher may give homework for, with the sections they teach it to
/// (GET /homework/options).
class SubjectOption {
  SubjectOption({required this.classSubjectId, required this.className, required this.subjectEn, this.subjectBn, this.groupEn, this.groupBn, required this.sections});

  final String classSubjectId;
  final String className;
  final String subjectEn;
  final String? subjectBn;
  final String? groupEn;
  final String? groupBn;
  final List<SectionRef> sections;

  factory SubjectOption.fromJson(Map<String, dynamic> json) {
    final className = (json['class'] as Map)['name'] as String;
    final subject = json['subject'] as Map<String, dynamic>;
    final group = json['group'] as Map<String, dynamic>?;
    return SubjectOption(
      classSubjectId: json['classSubjectId'] as String,
      className: className,
      subjectEn: subject['nameEn'] as String,
      subjectBn: subject['nameBn'] as String?,
      groupEn: group?['nameEn'] as String?,
      groupBn: group?['nameBn'] as String?,
      sections: _sections(json['sections'], className),
    );
  }
}

final homeworkOptionsProvider = FutureProvider.autoDispose<List<SubjectOption>>((ref) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/homework/options');
  return [for (final s in json['subjects'] as List) SubjectOption.fromJson(s as Map<String, dynamic>)];
});

/// A homework in the teacher's list (GET /homework?mine=true).
class GivenHomework {
  GivenHomework({
    required this.id,
    required this.title,
    required this.subjectEn,
    this.subjectBn,
    required this.sections,
    required this.dueDate,
    required this.checked,
  });

  final String id;
  final String title;
  final String subjectEn;
  final String? subjectBn;
  final List<SectionRef> sections;
  final String dueDate;

  /// How many students were ticked, by status.
  final Map<CheckStatus, int> checked;

  String get sectionLabel => sections.map((s) => s.label).join(', ');

  factory GivenHomework.fromJson(Map<String, dynamic> json) {
    final className = (json['class'] as Map)['name'] as String;
    final subject = (json['classSubject'] as Map)['subject'] as Map<String, dynamic>;
    final checked = json['checked'] as Map<String, dynamic>? ?? const {};
    return GivenHomework(
      id: json['id'] as String,
      title: json['title'] as String,
      subjectEn: subject['nameEn'] as String,
      subjectBn: subject['nameBn'] as String?,
      sections: _sections(json['sections'], className),
      dueDate: json['dueDate'] as String,
      checked: {
        CheckStatus.done: checked['done'] as int? ?? 0,
        CheckStatus.late: checked['late'] as int? ?? 0,
        CheckStatus.notDone: checked['notDone'] as int? ?? 0,
        CheckStatus.excused: checked['excused'] as int? ?? 0,
      },
    );
  }
}

/// The homework of the teacher's own subjects, the latest due first.
class MyHomeworkList extends PagedNotifier<GivenHomework> {
  @override
  Future<(List<GivenHomework>, int)> fetch(int page) async {
    final json = await ref.read(apiClientProvider)!.get<Map<String, dynamic>>(
      '/homework',
      query: {'mine': 'true', 'page': page},
    );
    return pageOf(json, GivenHomework.fromJson);
  }
}

final myHomeworkProvider = AsyncNotifierProvider.autoDispose<MyHomeworkList, Paged<GivenHomework>>(MyHomeworkList.new);

/// One homework for its teacher (GET /homework/:id): every student and their tick.
class HomeworkSheet {
  HomeworkSheet({
    required this.id,
    required this.title,
    this.instructions,
    required this.assignedOn,
    required this.dueDate,
    this.fullMarks,
    required this.subjectEn,
    this.subjectBn,
    required this.sections,
    required this.attachments,
    required this.canManage,
    required this.students,
  });

  final String id;
  final String title;
  final String? instructions;
  final String assignedOn;
  final String dueDate;
  final num? fullMarks;
  final String subjectEn;
  final String? subjectBn;
  final List<SectionRef> sections;
  final List<Attachment> attachments;

  /// May tick, attach and delete (it's the teacher's own subject and sections).
  final bool canManage;
  final List<HomeworkStudent> students;

  String get sectionLabel => sections.map((s) => s.label).join(', ');

  factory HomeworkSheet.fromJson(Map<String, dynamic> json) {
    final className = (json['class'] as Map?)?['name'] as String? ?? '';
    final subject = (json['classSubject'] as Map)['subject'] as Map<String, dynamic>;
    return HomeworkSheet(
      id: json['id'] as String,
      title: json['title'] as String,
      instructions: json['instructions'] as String?,
      assignedOn: json['assignedOn'] as String,
      dueDate: json['dueDate'] as String,
      fullMarks: _num(json['fullMarks']),
      subjectEn: subject['nameEn'] as String,
      subjectBn: subject['nameBn'] as String?,
      sections: _sections(json['sections'], className),
      attachments: Attachment.listFrom(json['attachments']),
      canManage: json['canManage'] == true,
      students: [for (final s in json['students'] as List) HomeworkStudent.fromJson(s as Map<String, dynamic>)],
    );
  }
}

class HomeworkStudent {
  HomeworkStudent({required this.enrollmentId, this.rollNumber, required this.nameEn, this.nameBn, this.status, this.marks});

  final String enrollmentId;
  final String? rollNumber;
  final String nameEn;
  final String? nameBn;

  /// null until ticked.
  final CheckStatus? status;
  final num? marks;

  factory HomeworkStudent.fromJson(Map<String, dynamic> json) {
    final student = json['student'] as Map<String, dynamic>;
    final check = json['check'] as Map<String, dynamic>?;
    return HomeworkStudent(
      enrollmentId: json['enrollmentId'] as String,
      rollNumber: json['rollNumber']?.toString(),
      nameEn: student['nameEn'] as String,
      nameBn: student['nameBn'] as String?,
      status: check == null ? null : CheckStatus.parse(check['status'] as String),
      marks: _num(check?['marks']),
    );
  }
}

final homeworkSheetProvider = FutureProvider.autoDispose.family<HomeworkSheet, String>((ref, id) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/homework/$id');
  return HomeworkSheet.fromJson(json);
});

/// The server's name for a tick.
String checkCode(CheckStatus s) => switch (s) {
      CheckStatus.done => 'DONE',
      CheckStatus.late => 'LATE',
      CheckStatus.notDone => 'NOT_DONE',
      CheckStatus.excused => 'EXCUSED',
    };
