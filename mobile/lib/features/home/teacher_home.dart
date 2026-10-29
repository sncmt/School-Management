import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/ui.dart';
import '../auth/auth_controller.dart';
import '../teacher/teacher.dart';
import '../teacher/teacher_screens.dart';

/// The teacher's day: a greeting, today at a glance, the tools (routine, attendance with the
/// school's permission, homework, marks), then today's classes in time order.
class TeacherHome extends ConsumerWidget {
  const TeacherHome({super.key, required this.me});

  final Me me;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final canMark = me.permissions.contains('attendance:mark');

    return RefreshIndicator(
      onRefresh: () => ref.refresh(myDayProvider.future),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          FadeSlideIn(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 4, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(greeting(t), style: TextStyle(color: context.palette.muted, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(me.fullname, style: Theme.of(context).textTheme.headlineSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ),
          AsyncBody(
            value: ref.watch(myDayProvider),
            onRetry: () => ref.invalidate(myDayProvider),
            builder: (day) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FadeSlideIn(index: 1, child: _TodayCard(day: day)),
                const SizedBox(height: 16),
                FadeSlideIn(
                  index: 2,
                  child: ShortcutGrid(
                    children: [
                      ShortcutTile(icon: Icons.calendar_view_week_rounded, label: t.weeklyRoutine, onTap: () => context.push('/teacher/week')),
                      if (canMark)
                        ShortcutTile(icon: Icons.fact_check_rounded, label: t.takeAttendance, onTap: () => context.push('/teacher/attendance')),
                      ShortcutTile(icon: Icons.menu_book_rounded, label: t.homework, onTap: () => context.push('/teacher/homework')),
                      ShortcutTile(icon: Icons.edit_note_rounded, label: t.examMarks, onTap: () => context.push('/teacher/marks')),
                    ],
                  ),
                ),
                if (day.isSchoolDay) ...[
                  SectionHeader(t.todaysClasses),
                  if (day.classes.isEmpty) EmptyState(icon: Icons.free_breakfast_outlined, message: t.noClassesToday),
                  for (final (i, c) in day.classes.indexed) FadeSlideIn(index: i + 3, child: ClassTile(item: c)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Today in the school's colour: the date, and how many classes (or the holiday).
class _TodayCard extends StatelessWidget {
  const _TodayCard({required this.day});

  final TeacherDay day;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final primary = Theme.of(context).colorScheme.primary;
    final taking = day.classes.where((c) => c.held && !c.coveredByOther).length;
    final holiday = context.pick(day.offEn, day.offBn);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Radii.card),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [primary, Color.lerp(primary, Colors.black, 0.3)!],
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.weekdayDay(day.date), style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                const SizedBox(height: 6),
                Text(
                  day.isSchoolDay ? t.classesToday(context.number(taking)) : (holiday.isEmpty ? t.holiday : holiday),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                ),
              ],
            ),
          ),
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(16)),
            child: Icon(day.isSchoolDay ? Icons.school_rounded : Icons.beach_access_rounded, color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }
}
