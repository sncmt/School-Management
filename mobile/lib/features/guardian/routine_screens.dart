import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/school_logo.dart';
import 'family.dart';
import 'routine.dart';

/// A child's week, a tab per school day, opening on today.
class RoutineScreen extends ConsumerWidget {
  const RoutineScreen({super.key, required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final child = ref.watch(familyHomeProvider).value?.child(childId);
    final value = ref.watch(routineProvider(childId));
    final routine = value.value;
    final days = routine?.schoolDays ?? const <int>[];

    final title = child == null
        ? Text(t.classRoutine)
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t.classRoutine),
              Text(context.pick(child.nameEn, child.nameBn), style: Theme.of(context).textTheme.bodySmall),
            ],
          );

    // loading, failed, or nothing to show
    if (routine == null || days.isEmpty || routine.periods.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: title),
        body: value.hasValue
            ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(t.noRoutine)))
            : AsyncBody(value: value, onRetry: () => ref.invalidate(routineProvider(childId)), builder: (_) => const SizedBox()),
      );
    }

    final today = DateTime.now().weekday % 7; // Dart: Monday 1 .. Sunday 7
    return DefaultTabController(
      length: days.length,
      initialIndex: days.contains(today) ? days.indexOf(today) : 0,
      child: Scaffold(
        appBar: AppBar(
          title: title,
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [for (final d in days) Tab(text: context.weekdayName(d))],
          ),
        ),
        body: TabBarView(children: [for (final d in days) _Day(routine: routine, weekday: d)]),
      ),
    );
  }
}

class _Day extends StatelessWidget {
  const _Day({required this.routine, required this.weekday});

  final Routine routine;
  final int weekday;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        for (final p in routine.periods)
          Builder(builder: (context) {
            final entry = p.isBreak ? null : routine.at(weekday, p.number);
            final time = '${context.clock(p.startTime)} – ${context.clock(p.endTime)}';
            final periodName = context.pick(p.nameEn, p.nameBn);

            if (p.isBreak) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Icon(Icons.free_breakfast_outlined, size: 18, color: muted),
                    const SizedBox(width: 8),
                    Text(periodName.isEmpty ? t.breakTime : periodName, style: TextStyle(color: muted)),
                    const Spacer(),
                    Text(time, style: TextStyle(color: muted)),
                  ],
                ),
              );
            }
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(child: Text(context.number(p.number))),
                title: Text(entry == null ? t.noClass : context.pick(entry.subjectEn, entry.subjectBn),
                    style: entry == null ? TextStyle(color: muted) : null),
                subtitle: Text([time, if (entry?.teacherEn != null) context.pick(entry!.teacherEn, entry.teacherBn)].join('\n')),
                isThreeLine: entry?.teacherEn != null,
              ),
            );
          }),
      ],
    );
  }
}

/// A child's admit card, as the school prints it: exam, student, dates, seat and rules.
class AdmitCardScreen extends ConsumerWidget {
  const AdmitCardScreen({super.key, required this.childId, required this.examId});

  final String childId;
  final String examId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final key = (childId, examId);

    return Scaffold(
      appBar: AppBar(title: Text(t.admitCard)),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(admitCardProvider(key).future),
        child: AsyncBody(
          value: ref.watch(admitCardProvider(key)),
          onRetry: () => ref.invalidate(admitCardProvider(key)),
          builder: (card) {
            final klass = [card.className, card.sectionName].whereType<String>().join(' · ');
            final group = context.pick(card.groupEn, card.groupBn);
            final photo = card.photo;
            final first = card.firstDay;
            final last = card.lastDay;

            Widget row(String label, String value) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 110, child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
                      Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
                    ],
                  ),
                );

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        SchoolLogo(url: card.schoolLogo, size: 56),
                        const SizedBox(height: 6),
                        Text(context.pick(card.schoolEn, card.schoolBn),
                            textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 4),
                        Text(
                          [context.pick(card.examEn, card.examBn), ?card.year].join(' · '),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const Divider(height: 28),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                children: [
                                  row(t.studentName, context.pick(card.studentEn, card.studentBn)),
                                  if (klass.isNotEmpty) row(t.className, klass),
                                  if (group.isNotEmpty) row(t.groupName, group),
                                  row(t.roll, card.rollNumber ?? '-'),
                                ],
                              ),
                            ),
                            if (photo != null)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(photo, width: 72, height: 90, fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => const SizedBox.shrink()),
                              ),
                          ],
                        ),
                        if (first != null)
                          row(t.examDates, first == last || last == null ? context.day(first) : '${context.day(first)} – ${context.day(last)}'),
                        if (card.seatNo != null)
                          row(t.seat, t.roomSeat([card.room, card.building].whereType<String>().join(', '), card.seatNo!)),
                      ],
                    ),
                  ),
                ),
                if (card.rules.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(t.examRules, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final (i, rule) in card.rules.indexed)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [Text('${context.number(i + 1)}. '), Expanded(child: Text(rule))],
                      ),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
