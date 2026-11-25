import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
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
    final dayValue = ref.watch(myDayProvider);

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
          // The tools always show, even while today's classes load or fail to load.
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
          const SizedBox(height: 16),
          _TodaySection(day: dayValue, onRetry: () => ref.invalidate(myDayProvider)),
        ],
      ),
    );
  }
}

/// Today's card and classes, with its own spinner or error so the rest of the home stays usable.
class _TodaySection extends StatelessWidget {
  const _TodaySection({required this.day, required this.onRetry});

  final AsyncValue<TeacherDay> day;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final data = day.value;
    if (data == null) {
      final error = day.error;
      if (error == null) {
        return const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()));
      }
      final message = switch (error) {
        ApiException(isNetwork: true) => t.networkError,
        ApiException e => e.message,
        _ => t.somethingWentWrong,
      };
      return Column(
        children: [
          EmptyState(icon: Icons.cloud_off_rounded, message: message),
          const SizedBox(height: 8),
          FilledButton.tonal(onPressed: onRetry, child: Text(t.retry)),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FadeSlideIn(index: 1, child: _TodayCard(day: data)),
        if (data.isSchoolDay) ...[
          SectionHeader(t.todaysClasses),
          if (data.classes.isEmpty) EmptyState(icon: Icons.free_breakfast_outlined, message: t.noClassesToday),
          for (final (i, c) in data.classes.indexed) FadeSlideIn(index: i + 3, child: ClassTile(item: c)),
        ],
      ],
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
