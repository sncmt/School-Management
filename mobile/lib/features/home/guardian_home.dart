import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import '../../widgets/child_avatar.dart';
import '../../widgets/ui.dart';
import '../auth/auth_controller.dart';
import '../guardian/family.dart';

/// A greeting, then a card per child with the day at a glance (today's attendance, this
/// month's presence, fees due); then the school's coming holidays. A child opens their page.
class GuardianHome extends ConsumerWidget {
  const GuardianHome({super.key, required this.me});

  final Me me;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(familyHomeProvider.future),
      child: AsyncBody(
        value: ref.watch(familyHomeProvider),
        onRetry: () => ref.invalidate(familyHomeProvider),
        builder: (home) => ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            FadeSlideIn(child: _Greeting(name: me.fullname)),
            SectionHeader(t.myChildren),
            if (home.children.isEmpty) EmptyState(icon: Icons.family_restroom_rounded, message: t.noChildren),
            for (final (i, child) in home.children.indexed) FadeSlideIn(index: i + 1, child: _ChildCard(child: child)),
            if (home.upcoming.isNotEmpty) ...[
              SectionHeader(t.upcomingHolidays),
              FadeSlideIn(
                index: home.children.length + 1,
                child: Card(
                  child: Column(
                    children: [
                      for (final (i, h) in home.upcoming.indexed) ...[
                        if (i > 0) const Divider(height: 1, indent: 72),
                        ListTile(
                          leading: _DateBadge(date: h.from),
                          title: Text(context.pick(h.nameEn, h.nameBn)),
                          subtitle: Text(h.from == h.to ? context.weekdayDay(h.from) : '${context.day(h.from)} – ${context.day(h.to)}'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(greeting(t), style: TextStyle(color: context.palette.muted, fontSize: 15)),
          const SizedBox(height: 2),
          Text(name, style: Theme.of(context).textTheme.headlineSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

/// A day of the month in a small calendar-like square: "12 / Oct".
class _DateBadge extends StatelessWidget {
  const _DateBadge({required this.date});

  final String date;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final parts = context.day(date).split(' ');
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(color: primary.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(12)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(parts.first, style: TextStyle(color: primary, fontWeight: FontWeight.w700, fontSize: 16, height: 1.1)),
          if (parts.length > 1) Text(parts.last, style: TextStyle(color: primary, fontSize: 11, height: 1.1)),
        ],
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  const _ChildCard({required this.child});

  final Child child;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final today = child.today;
    final presentDays = (child.month[AttendanceStatus.present] ?? 0) + (child.month[AttendanceStatus.late] ?? 0);

    return Card(
      child: InkWell(
        onTap: () => context.push('/child/${child.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                children: [
                  ChildAvatar(child: child, radius: 26),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(context.pick(child.nameEn, child.nameBn), style: Theme.of(context).textTheme.titleMedium),
                        if (child.className != null)
                          Text(classLine(context, child), style: TextStyle(color: context.palette.muted, fontSize: 13.5)),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: context.palette.muted),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(color: context.palette.field, borderRadius: BorderRadius.circular(Radii.control)),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      _Fact(
                        label: t.today,
                        child: today != null
                            ? Text(today.label(t), style: TextStyle(color: today.color, fontWeight: FontWeight.w700))
                            : Text('—', style: TextStyle(color: context.palette.muted, fontWeight: FontWeight.w700)),
                      ),
                      const VerticalDivider(width: 1),
                      _Fact(label: t.thisMonth, child: Text(t.daysCount(context.number(presentDays)), style: const TextStyle(fontWeight: FontWeight.w700))),
                      const VerticalDivider(width: 1),
                      _Fact(
                        label: t.feesDue,
                        child: Text(
                          child.hasDues ? context.money(child.duesTotal) : '✓',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: child.hasDues ? AttendanceStatus.absent.color : AttendanceStatus.present.color,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One fact of a child's card: a small label over its value.
class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(label, style: TextStyle(color: context.palette.muted, fontSize: 12)),
          const SizedBox(height: 2),
          DefaultTextStyle.merge(style: const TextStyle(fontSize: 15), child: FittedBox(fit: BoxFit.scaleDown, child: child)),
        ],
      ),
    );
  }
}

/// "Class Six · A · Roll 12".
String classLine(BuildContext context, Child child) {
  final t = AppLocalizations.of(context);
  final className = [child.className, child.sectionName].whereType<String>().join(' · ');
  return t.classAndRoll(className, child.rollNumber ?? '-');
}
