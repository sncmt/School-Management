import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import '../../widgets/child_avatar.dart';
import '../../widgets/ui.dart';
import '../home/guardian_home.dart';
import 'family.dart';
import 'homework_screens.dart';
import 'result_screens.dart';
import 'results.dart';

/// One child's page: attendance today and this month, fees due, homework due soon and the
/// admit cards the school has released. From the same GET /family as the home.
class ChildScreen extends ConsumerWidget {
  const ChildScreen({super.key, required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final home = ref.watch(familyHomeProvider);

    return Scaffold(
      appBar: AppBar(),
      body: RefreshIndicator(
        onRefresh: () {
          ref.invalidate(resultsProvider(childId));
          return ref.refresh(familyHomeProvider.future);
        },
        child: AsyncBody(
          value: home,
          onRetry: () => ref.invalidate(familyHomeProvider),
          builder: (home) {
            final child = home.child(childId);
            if (child == null) return Center(child: Text(t.noChildren));
            final base = '/child/${child.id}';
            final sections = [
              _AttendanceCard(child: child),
              _FeesCard(child: child, onlinePayment: home.onlinePayment),
              _HomeworkCard(child: child),
              _Section(icon: Icons.emoji_events_outlined, title: t.results, children: [ResultList(childId: child.id)]),
              if (child.admitCards.isNotEmpty) _AdmitCardsCard(child: child),
            ];
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              children: [
                FadeSlideIn(child: _Header(child: child)),
                const SizedBox(height: 20),
                FadeSlideIn(
                  index: 1,
                  child: ShortcutGrid(
                    children: [
                      ShortcutTile(icon: Icons.event_available_rounded, label: t.attendance, onTap: () => context.push('$base/attendance')),
                      ShortcutTile(icon: Icons.menu_book_rounded, label: t.homework, onTap: () => context.push('$base/homework')),
                      ShortcutTile(icon: Icons.schedule_rounded, label: t.classRoutine, onTap: () => context.push('$base/routine')),
                      ShortcutTile(icon: Icons.receipt_long_rounded, label: t.paymentHistory, onTap: () => context.push('$base/payments')),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                for (final (i, section) in sections.indexed) FadeSlideIn(index: i + 2, child: section),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.child});

  final Child child;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.35), width: 2),
          ),
          child: ChildAvatar(child: child, radius: 42),
        ),
        const SizedBox(height: 12),
        Text(context.pick(child.nameEn, child.nameBn), textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall),
        if (child.className != null) ...[
          const SizedBox(height: 6),
          Pill(classLine(context, child), color: Theme.of(context).colorScheme.primary),
        ],
      ],
    );
  }
}

/// A card with a title row and an optional action at its end.
class _Section extends StatelessWidget {
  const _Section({required this.icon, required this.title, required this.children, this.action});

  final IconData icon;
  final String title;
  final List<Widget> children;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconBadge(icon, size: 34),
                const SizedBox(width: 12),
                Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
                ?action,
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard({required this.child});

  final Child child;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final today = child.today;
    final checkIn = child.checkInAt;

    return _Section(
      icon: Icons.fact_check_outlined,
      title: t.attendance,
      action: TextButton(onPressed: () => context.push('/child/${child.id}/attendance'), child: Text(t.seeAll)),
      children: [
        Row(
          children: [
            Text('${t.today}: '),
            if (today != null) StatusChip(status: today) else Text(t.notMarkedYet),
            if (checkIn != null) ...[const SizedBox(width: 8), Text(t.checkedInAt(context.time(checkIn)))],
          ],
        ),
        const SizedBox(height: 12),
        Text(t.thisMonth, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 6),
        StatusCounts(counts: child.month),
      ],
    );
  }
}

/// Present / late / absent / leave counts side by side.
class StatusCounts extends StatelessWidget {
  const StatusCounts({super.key, required this.counts});

  final Map<AttendanceStatus, int> counts;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Row(
      children: [
        for (final status in AttendanceStatus.values)
          Expanded(
            child: Column(
              children: [
                Text(
                  context.number(counts[status] ?? 0),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: status.color, fontWeight: FontWeight.w600),
                ),
                Text(status.label(t), style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
      ],
    );
  }
}

class _FeesCard extends StatelessWidget {
  const _FeesCard({required this.child, required this.onlinePayment});

  final Child child;

  /// The school takes fees online (its store is set and switched on).
  final bool onlinePayment;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return _Section(
      icon: Icons.payments_outlined,
      title: t.feesDue,
      action: child.hasDues
          ? Text(
              context.money(child.duesTotal),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AttendanceStatus.absent.color),
            )
          : null,
      children: [
        if (!child.hasDues) Text(t.noDues),
        for (final fee in child.fees)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(child: Text(_feeLabel(context, fee))),
                Text(context.money(fee.due)),
              ],
            ),
          ),
        // only when the school has set up its SSLCommerz store and switched online payment on
        if (onlinePayment && child.hasDues) ...[
          const SizedBox(height: 12),
          FilledButton.icon(
            icon: const Icon(Icons.payment_rounded),
            label: Text(t.payOnline),
            onPressed: () => context.push('/child/${child.id}/pay'),
          ),
        ],
        Align(
          alignment: AlignmentDirectional.centerEnd,
          child: TextButton.icon(
            icon: const Icon(Icons.receipt_long_outlined, size: 18),
            label: Text(t.paymentHistory),
            onPressed: () => context.push('/child/${child.id}/payments'),
          ),
        ),
      ],
    );
  }

  /// "Tuition fee · Oct 2026", or the fee's own description for a one-time fee.
  String _feeLabel(BuildContext context, Fee fee) {
    final name = context.pick(fee.nameEn, fee.nameBn);
    final month = fee.month;
    final year = fee.year;
    final detail = month != null && year != null ? context.feeMonth(month, year) : fee.description;
    return detail == null || detail.isEmpty ? name : '$name · $detail';
  }
}

class _HomeworkCard extends StatelessWidget {
  const _HomeworkCard({required this.child});

  final Child child;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return _Section(
      icon: Icons.menu_book_outlined,
      title: t.homeworkDueSoon,
      action: TextButton(onPressed: () => context.push('/child/${child.id}/homework'), child: Text(t.seeAll)),
      children: [
        if (child.homework.isEmpty) Text(t.noHomework),
        for (final hw in child.homework) HomeworkTile(childId: child.id, homework: hw, inCard: false),
      ],
    );
  }
}

class _AdmitCardsCard extends StatelessWidget {
  const _AdmitCardsCard({required this.child});

  final Child child;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return _Section(
      icon: Icons.badge_outlined,
      title: t.admitCards,
      children: [
        for (final exam in child.admitCards)
          ListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            leading: const Icon(Icons.description_outlined),
            title: Text(context.pick(exam.nameEn, exam.nameBn)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/child/${child.id}/admit-card/${exam.id}'),
          ),
      ],
    );
  }
}
