import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/paged.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/attachment_list.dart';
import '../../widgets/attendance_status.dart';
import '../auth/auth_controller.dart';

/// A child's homework as the family sees it (GET /family and /family/homework).
class Homework {
  Homework({
    required this.id,
    required this.title,
    this.instructions,
    required this.assignedOn,
    required this.dueDate,
    this.fullMarks,
    required this.subjectEn,
    this.subjectBn,
    required this.attachments,
    this.check,
  });

  final String id;
  final String title;
  final String? instructions;
  final String assignedOn;
  final String dueDate;
  final num? fullMarks;
  final String subjectEn;
  final String? subjectBn;
  final List<Attachment> attachments;

  /// The teacher's tick for this child; null until checked.
  final HomeworkCheck? check;

  factory Homework.fromJson(Map<String, dynamic> json) {
    final subject = json['subject'] as Map<String, dynamic>;
    final check = json['check'] as Map<String, dynamic>?;
    return Homework(
      id: json['id'] as String,
      title: json['title'] as String,
      instructions: json['instructions'] as String?,
      assignedOn: json['assignedOn'] as String,
      dueDate: json['dueDate'] as String,
      fullMarks: json['fullMarks'] as num?,
      subjectEn: subject['nameEn'] as String,
      subjectBn: subject['nameBn'] as String?,
      attachments: Attachment.listFrom(json['attachments']),
      check: check == null ? null : HomeworkCheck.fromJson(check),
    );
  }
}

class HomeworkCheck {
  HomeworkCheck({required this.status, this.marks, this.comment});

  final CheckStatus status;
  final num? marks;
  final String? comment;

  factory HomeworkCheck.fromJson(Map<String, dynamic> json) => HomeworkCheck(
        status: CheckStatus.parse(json['status'] as String),
        marks: json['marks'] as num?,
        comment: json['comment'] as String?,
      );
}

enum CheckStatus {
  done,
  late,
  notDone,
  excused;

  static CheckStatus parse(String value) => switch (value) {
        'LATE' => late,
        'NOT_DONE' => notDone,
        'EXCUSED' => excused,
        _ => done,
      };

  // the attendance palette: green / amber / red / blue
  Color get color => switch (this) {
        done => AttendanceStatus.present.color,
        late => AttendanceStatus.late.color,
        notDone => AttendanceStatus.absent.color,
        excused => AttendanceStatus.leave.color,
      };

  String label(AppLocalizations t) => switch (this) {
        done => t.checkDone,
        late => t.checkLate,
        notDone => t.checkNotDone,
        excused => t.checkExcused,
      };
}

/// A child's homework, the latest due first, 20 at a time.
class HomeworkList extends PagedNotifier<Homework> {
  HomeworkList(this.studentId);

  final String studentId;

  @override
  Future<(List<Homework>, int)> fetch(int page) async {
    final json = await ref.read(apiClientProvider)!.get<Map<String, dynamic>>(
      '/family/homework',
      query: {'studentId': studentId, 'page': page},
    );
    return pageOf(json, Homework.fromJson);
  }
}

final homeworkListProvider =
    AsyncNotifierProvider.autoDispose.family<HomeworkList, Paged<Homework>, String>(HomeworkList.new);
