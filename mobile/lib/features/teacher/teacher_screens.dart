import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import '../auth/auth_controller.dart';
import 'teacher.dart';

/// One class: its time, subject and section; today also whether it's a substitution, or
/// taken by someone else, or not held.
class ClassTile extends StatelessWidget {
  const ClassTile({super.key, required this.item});

  final TeacherClass item;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final off = !item.held || item.coveredByOther;
    final start = item.startTime;
    final end = item.endTime;

    final notes = [
      item.sectionLabel,
      if (item.isSubstitute) t.substituteClass,
      if (item.coveredByOther) t.coveredBy(context.pick(item.coveredByEn, item.coveredByBn)),
      if (!item.held) t.notHeld,
    ];

    // the accent bar: the school's colour, amber for a substitution, grey when not taken
    final bar = off
        ? context.palette.hairline
        : item.isSubstitute
            ? AttendanceStatus.late.color
            : Theme.of(context).colorScheme.primary;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: IntrinsicHeight(
          child: Row(
            children: [
              SizedBox(
                width: 62,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(start == null ? context.number(item.periodNumber) : context.clock(start),
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                    if (end != null) Text(context.clock(end), style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              Container(width: 3, margin: const EdgeInsets.symmetric(horizontal: 10), decoration: BoxDecoration(color: bar, borderRadius: BorderRadius.circular(2))),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      context.pick(item.subjectEn, item.subjectBn),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: off ? muted : null,
                            decoration: off ? TextDecoration.lineThrough : null,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(notes.join(' · '), style: TextStyle(color: muted, fontSize: 13)),
                  ],
                ),
              ),
              if (item.isSubstitute) Icon(Icons.swap_horiz_rounded, color: bar),
            ],
          ),
        ),
      ),
    );
  }
}

/// The teacher's whole week, a tab per day that has classes, opening on today.
class WeekScreen extends ConsumerWidget {
  const WeekScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final value = ref.watch(myWeekProvider);
    final week = value.value;
    final days = {for (final c in week ?? const <TeacherClass>[]) c.weekday}.toList()..sort();

    if (week == null || days.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(t.weeklyRoutine)),
        body: value.hasValue
            ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(t.noRoutine)))
            : AsyncBody(value: value, onRetry: () => ref.invalidate(myWeekProvider), builder: (_) => const SizedBox()),
      );
    }

    final today = DateTime.now().weekday % 7;
    return DefaultTabController(
      length: days.length,
      initialIndex: days.contains(today) ? days.indexOf(today) : 0,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t.weeklyRoutine),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [for (final d in days) Tab(text: context.weekdayName(d))],
          ),
        ),
        body: TabBarView(
          children: [
            for (final d in days)
              ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  for (final c in week.where((c) => c.weekday == d).toList()
                    ..sort((a, b) => (a.startTime ?? '').compareTo(b.startTime ?? '')))
                    ClassTile(item: c),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// The sections the teacher teaches; each opens today's roll call.
class AttendanceSectionsScreen extends ConsumerWidget {
  const AttendanceSectionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(t.takeAttendance)),
      body: AsyncBody(
        value: ref.watch(myWeekProvider),
        onRetry: () => ref.invalidate(myWeekProvider),
        builder: (week) {
          final sections = sectionsOf(week);
          if (sections.isEmpty) return Center(child: Text(t.noRoutine));
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              for (final s in sections)
                Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: const Icon(Icons.groups_outlined),
                    title: Text(s.label),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/teacher/attendance/${s.id}', extra: s.label),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

String _dayKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// A section's roll call: everyone starts present, the teacher marks the rest and saves.
class RollCallScreen extends ConsumerStatefulWidget {
  const RollCallScreen({super.key, required this.sectionId, this.label});

  final String sectionId;
  final String? label;

  @override
  ConsumerState<RollCallScreen> createState() => _RollCallScreenState();
}

class _RollCallScreenState extends ConsumerState<RollCallScreen> {
  DateTime _date = DateUtils.dateOnly(DateTime.now());

  /// The teacher's marks so far, by student; reset from each sheet that loads.
  Map<String, AttendanceStatus> _marks = {};
  RollCall? _loaded;
  bool _saving = false;

  (String, String) get _key => (widget.sectionId, _dayKey(_date));

  Future<void> _pickDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      // the server allows a week back (more with special permission)
      firstDate: today.subtract(const Duration(days: 30)),
      lastDate: today,
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save(RollCall sheet) async {
    final t = AppLocalizations.of(context);
    setState(() => _saving = true);
    try {
      await saveRollCall(ref.read(apiClientProvider)!, sheet: sheet, marks: _marks);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t.attendanceSaved)));
      ref.invalidate(rollCallProvider(_key));
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.isNetwork ? t.networkError : e.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final value = ref.watch(rollCallProvider(_key));
    final sheet = value.value;

    // a freshly loaded sheet (another date, or after saving) starts the marks again
    if (sheet != null && !identical(sheet, _loaded)) {
      _loaded = sheet;
      _marks = {for (final s in sheet.students) s.studentId: s.status};
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.label ?? t.takeAttendance),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.event),
            label: Text(context.day(_dayKey(_date))),
            onPressed: _pickDate,
          ),
        ],
      ),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(rollCallProvider(_key)),
        builder: (sheet) {
          final counts = {for (final s in AttendanceStatus.values) s: 0};
          for (final m in _marks.values) {
            counts[m] = counts[m]! + 1;
          }
          return Column(
            children: [
              Material(
                color: Theme.of(context).colorScheme.surfaceContainerHigh,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          for (final s in AttendanceStatus.values)
                            Expanded(
                              child: Text(
                                '${s.label(t)} ${context.number(counts[s]!)}',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: s.color, fontWeight: FontWeight.w600),
                              ),
                            ),
                        ],
                      ),
                      if (!sheet.canTake && sheet.cannotTakeReason != null) ...[
                        const SizedBox(height: 8),
                        Text(sheet.cannotTakeReason!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ] else if (sheet.taken) ...[
                        const SizedBox(height: 4),
                        Text(t.attendanceAlreadyTaken, style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ],
                  ),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.only(bottom: 88),
                  itemCount: sheet.students.length,
                  itemBuilder: (context, i) {
                    final s = sheet.students[i];
                    return _StudentRow(
                      entry: s,
                      status: _marks[s.studentId] ?? s.status,
                      enabled: sheet.canTake && !_saving,
                      onChanged: (status) => setState(() => _marks[s.studentId] = status),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: sheet != null && sheet.canTake
          ? FloatingActionButton.extended(
              icon: _saving
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check),
              label: Text(t.save),
              onPressed: _saving ? null : () => _save(sheet),
            )
          : null,
    );
  }
}

class _StudentRow extends StatelessWidget {
  const _StudentRow({required this.entry, required this.status, required this.enabled, required this.onChanged});

  final RollEntry entry;
  final AttendanceStatus status;
  final bool enabled;
  final ValueChanged<AttendanceStatus> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final checkIn = entry.checkInAt;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: Text(entry.rollNumber == null ? '-' : context.number(int.tryParse(entry.rollNumber!) ?? 0),
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.pick(entry.nameEn, entry.nameBn), maxLines: 1, overflow: TextOverflow.ellipsis),
                if (entry.fromDevice && checkIn != null)
                  Text(t.checkedInAt(context.time(checkIn)), style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          // one tap per status: P / L / A / Leave
          for (final s in AttendanceStatus.values)
            Padding(
              padding: const EdgeInsets.only(left: 4),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: enabled ? () => onChanged(s) : null,
                child: Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: s == status ? s.color : null,
                    border: Border.all(color: s.color.withValues(alpha: s == status ? 1 : 0.4)),
                  ),
                  child: Text(
                    s.shortLabel(t),
                    style: TextStyle(color: s == status ? Colors.white : s.color, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
