import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import '../../widgets/ui.dart';
import 'family.dart';
import 'results.dart';

final _passColor = AttendanceStatus.present.color;
final _failColor = AttendanceStatus.absent.color;

/// The headline of a result: "GPA 4.50 (A)" for a graded result, else "82.5%".
String resultHeadline(BuildContext context, {num? gpa, String? grade, required num percentage}) {
  final t = AppLocalizations.of(context);
  if (gpa == null) return '${context.number(percentage)}%';
  final points = t.gpaValue(context.number(gpa));
  return grade == null ? points : '$points ($grade)';
}

class PassChip extends StatelessWidget {
  const PassChip({super.key, required this.passed});

  final bool passed;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Pill(passed ? t.passed : t.failed, color: passed ? _passColor : _failColor);
  }
}

/// The child page's list of published results; each opens its marksheet.
class ResultList extends ConsumerWidget {
  const ResultList({super.key, required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final results = ref.watch(resultsProvider(childId));
    final list = results.value;
    if (list == null) {
      return results.hasError
          ? TextButton(onPressed: () => ref.invalidate(resultsProvider(childId)), child: Text(t.retry))
          : const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator());
    }
    if (list.isEmpty) return Text(t.noResults);
    return Column(
      children: [
        for (final r in list)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(context.pick(r.examEn, r.examBn)),
            subtitle: Text([resultHeadline(context, gpa: r.gpa, grade: r.grade, percentage: r.percentage), ?r.year].join(' · ')),
            trailing: PassChip(passed: r.passed),
            onTap: () => context.push('/child/$childId/results/${r.examId}'),
          ),
      ],
    );
  }
}

/// One exam's marksheet: the totals, positions and attendance, then every subject.
class MarksheetScreen extends ConsumerWidget {
  const MarksheetScreen({super.key, required this.childId, required this.examId});

  final String childId;
  final String examId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final key = (childId, examId);
    final child = ref.watch(familyHomeProvider).value?.child(childId);

    return Scaffold(
      appBar: AppBar(title: Text(t.results)),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(marksheetProvider(key).future),
        child: AsyncBody(
          value: ref.watch(marksheetProvider(key)),
          onRetry: () => ref.invalidate(marksheetProvider(key)),
          builder: (m) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(context.pick(m.examEn, m.examBn), style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(
                [
                  if (child != null) context.pick(child.nameEn, child.nameBn),
                  ?m.className,
                  ?m.year,
                ].join(' · '),
              ),
              if (m.publishedAt != null) ...[
                const SizedBox(height: 2),
                Text(t.publishedOn(context.date(m.publishedAt!)), style: Theme.of(context).textTheme.bodySmall),
              ],
              const SizedBox(height: 16),
              _Summary(m: m),
              const SizedBox(height: 16),
              Text(t.subjectResults, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              for (final s in m.subjects) _SubjectRow(subject: s, graded: m.isGraded),
            ],
          ),
        ),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.m});

  final Marksheet m;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final big = Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w600);

    Widget tile(String label, String value) => Expanded(
          child: Column(
            children: [
              Text(value, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
              Text(label, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
            ],
          ),
        );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(resultHeadline(context, gpa: m.gpa, grade: m.grade, percentage: m.percentage), style: big),
            const SizedBox(height: 8),
            PassChip(passed: m.passed),
            if (!m.passed && m.failedSubjects > 0) ...[
              const SizedBox(height: 4),
              Text(t.failedSubjects(context.number(m.failedSubjects)), style: TextStyle(color: _failColor)),
            ],
            const Divider(height: 28),
            Row(
              children: [
                tile(t.totalMarks, '${context.number(m.totalMarks)} / ${context.number(m.fullMarks)}'),
                tile(t.sectionPosition, t.positionOf(context.number(m.sectionPosition), context.number(m.sectionOutOf))),
                tile(t.classPosition, t.positionOf(context.number(m.classPosition), context.number(m.classOutOf))),
              ],
            ),
            if (m.workingDays > 0) ...[
              const SizedBox(height: 16),
              Text(
                '${t.examAttendance}: ${t.daysPresent(context.number(m.present), context.number(m.workingDays))}'
                '${m.attendancePercent == null ? '' : ' (${context.number(m.attendancePercent!)}%)'}',
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SubjectRow extends StatelessWidget {
  const _SubjectRow({required this.subject, required this.graded});

  final SubjectResult subject;
  final bool graded;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final s = subject;
    final failed = !s.passed && !s.excluded && !s.isOptional;
    final marks = s.isAbsent ? t.absent : '${context.number(s.marks ?? 0)} / ${context.number(s.fullMarks)}';
    final notes = [
      if (s.isOptional) t.optionalSubject,
      if (s.excluded) t.notCounted,
      for (final p in s.parts)
        '${p.name} ${p.marks == null ? '-' : context.number(p.marks!)}/${context.number(p.fullMarks)}',
    ];

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.pick(s.nameEn, s.nameBn), style: Theme.of(context).textTheme.titleSmall),
                  if (notes.isNotEmpty)
                    Text(notes.join(' · '), style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(marks, style: TextStyle(color: failed ? _failColor : null, fontWeight: FontWeight.w600)),
                if (graded && s.grade != null)
                  Text(
                    s.point == null ? s.grade! : '${s.grade} (${context.number(s.point!)})',
                    style: TextStyle(color: failed ? _failColor : _passColor),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
