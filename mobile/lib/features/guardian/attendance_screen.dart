import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import 'child_screen.dart';
import 'family.dart';

/// A child's attendance as a month calendar: each day in its status's colour, holidays and
/// the weekly off day greyed out. Tap a day for its details.
class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key, required this.childId});

  final String childId;

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  final DateTime _thisMonth = DateTime(DateTime.now().year, DateTime.now().month);
  late DateTime _month = _thisMonth;
  String? _selected;

  String get _monthKey => '${_month.year}-${_month.month.toString().padLeft(2, '0')}';

  void _moveMonth(int by) => setState(() {
        _month = DateTime(_month.year, _month.month + by);
        _selected = null;
      });

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final key = (widget.childId, _monthKey);
    final child = ref.watch(familyHomeProvider).value?.child(widget.childId);

    return Scaffold(
      appBar: AppBar(
        title: Text(t.attendance),
        bottom: child == null
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(24),
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(context.pick(child.nameEn, child.nameBn)),
                ),
              ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(attendanceMonthProvider(key).future),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                IconButton(icon: const Icon(Icons.chevron_left), onPressed: () => _moveMonth(-1)),
                Expanded(
                  child: Text(
                    context.monthYear(_month),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                // nothing to see after this month
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: _month.isBefore(_thisMonth) ? () => _moveMonth(1) : null,
                ),
              ],
            ),
            const SizedBox(height: 8),
            AsyncBody(
              value: ref.watch(attendanceMonthProvider(key)),
              onRetry: () => ref.invalidate(attendanceMonthProvider(key)),
              builder: (month) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _MonthGrid(
                    month: _month,
                    days: month.days,
                    selected: _selected,
                    onTap: (date) => setState(() => _selected = date),
                  ),
                  const SizedBox(height: 12),
                  const _Legend(),
                  _MonthHolidays(days: month.days),
                  if (_selected != null) ...[
                    const SizedBox(height: 12),
                    _DayDetail(day: month.days.firstWhere((d) => d.date == _selected)),
                  ],
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          StatusCounts(counts: month.counts),
                          if (month.percentage != null) ...[
                            const SizedBox(height: 12),
                            Text(
                              t.attendanceRate(context.number(month.percentage!)),
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({required this.month, required this.days, required this.selected, required this.onTap});

  final DateTime month;
  final List<AttendanceDay> days;
  final String? selected;
  final void Function(String date) onTap;

  @override
  Widget build(BuildContext context) {
    final material = MaterialLocalizations.of(context);
    final firstWeekday = material.firstDayOfWeekIndex; // 0 = Sunday
    // DateTime.weekday: Monday 1 .. Sunday 7 -> 0 = Sunday
    final leading = (DateTime(month.year, month.month).weekday % 7 - firstWeekday + 7) % 7;
    final today = DateTime.now();
    final todayKey =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    return Column(
      children: [
        Row(
          children: [
            for (var i = 0; i < 7; i++)
              Expanded(
                child: Center(
                  child: Text(
                    material.narrowWeekdays[(firstWeekday + i) % 7],
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        GridView.count(
          crossAxisCount: 7,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            for (var i = 0; i < leading; i++) const SizedBox.shrink(),
            for (final day in days)
              _DayCell(
                day: day,
                isToday: day.date == todayKey,
                isSelected: day.date == selected,
                onTap: () => onTap(day.date),
              ),
          ],
        ),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({required this.day, required this.isToday, required this.isSelected, required this.onTap});

  final AttendanceDay day;
  final bool isToday;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final status = day.status;
    final background = status?.color ?? (day.isOff ? scheme.surfaceContainerHighest : null);
    final foreground = status != null ? Colors.white : (day.isOff ? scheme.onSurfaceVariant : scheme.onSurface);

    return Padding(
      padding: const EdgeInsets.all(3),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: background,
            border: isSelected
                ? Border.all(color: scheme.onSurface, width: 2)
                : isToday
                    ? Border.all(color: scheme.primary, width: 2)
                    : null,
          ),
          child: Text(
            context.number(DateTime.parse(day.date).day),
            style: TextStyle(color: foreground, fontWeight: status != null ? FontWeight.w600 : null),
          ),
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    Widget dot(Color color, String label) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        );
    return Wrap(
      spacing: 12,
      runSpacing: 6,
      alignment: WrapAlignment.center,
      children: [
        for (final s in AttendanceStatus.values) dot(s.color, s.label(t)),
        dot(Theme.of(context).colorScheme.surfaceContainerHighest, t.holiday),
      ],
    );
  }
}

/// The month's named holidays (not the weekly off day), a run of days as one line.
class _MonthHolidays extends StatelessWidget {
  const _MonthHolidays({required this.days});

  final List<AttendanceDay> days;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final runs = <({String name, String from, String to})>[];
    for (final d in days) {
      if (!d.isOff || d.offReason == 'WEEKLY_HOLIDAY') continue;
      final name = context.pick(d.offNameEn, d.offNameBn);
      final label = name.isEmpty ? t.holiday : name;
      final last = runs.lastOrNull;
      // the next day of the same holiday extends it
      if (last != null &&
          last.name == label &&
          DateTime.parse(d.date).difference(DateTime.parse(last.to)).inDays == 1) {
        runs[runs.length - 1] = (name: label, from: last.from, to: d.date);
      } else {
        runs.add((name: label, from: d.date, to: d.date));
      }
    }
    if (runs.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Text(t.holidaysThisMonth, style: Theme.of(context).textTheme.titleSmall),
            ),
            for (final r in runs)
              ListTile(
                dense: true,
                leading: const Icon(Icons.event_busy_outlined),
                title: Text(r.name),
                trailing: Text(r.from == r.to ? context.day(r.from) : '${context.day(r.from)} – ${context.day(r.to)}'),
              ),
          ],
        ),
      ),
    );
  }
}

/// What the tapped day was: its status and check-in time, or the holiday.
class _DayDetail extends StatelessWidget {
  const _DayDetail({required this.day});

  final AttendanceDay day;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final status = day.status;
    final checkIn = day.checkInAt;
    final note = day.note;

    final String text;
    if (status != null) {
      text = checkIn != null ? t.checkedInAt(context.time(checkIn)) : '';
    } else if (day.isOff) {
      final name = context.pick(day.offNameEn, day.offNameBn);
      text = day.offReason == 'WEEKLY_HOLIDAY' ? t.weeklyHoliday : (name.isEmpty ? t.holiday : name);
    } else {
      text = t.noRollCall;
    }

    return Card(
      child: ListTile(
        title: Text(context.weekdayDay(day.date)),
        subtitle: Text([text, ?note].where((s) => s.isNotEmpty).join('\n')),
        trailing: status == null ? null : StatusChip(status: status),
      ),
    );
  }
}
