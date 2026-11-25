import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import '../../widgets/paged_list_view.dart';
import '../../widgets/school_logo.dart';
import '../../widgets/ui.dart';
import 'family.dart';
import 'payments.dart';

/// A child's fee payments, newest first: each money receipt, at the office or online.
class PaymentHistoryScreen extends ConsumerWidget {
  const PaymentHistoryScreen({super.key, required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final provider = paymentListProvider(childId);
    final child = ref.watch(familyHomeProvider).value?.child(childId);

    return Scaffold(
      appBar: AppBar(
        title: Text(t.paymentHistory),
        bottom: child == null
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(24),
                child: Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(context.pick(child.nameEn, child.nameBn))),
              ),
      ),
      body: PagedListView<Payment>(
        value: ref.watch(provider),
        empty: t.noPayments,
        onRefresh: () => ref.refresh(provider.future),
        onLoadMore: () => ref.read(provider.notifier).loadMore(),
        onRetry: () => ref.invalidate(provider),
        itemBuilder: (context, p) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(p.method == PaymentMethod.cash ? Icons.payments_outlined : Icons.phone_android_outlined),
            title: Text(
              context.money(p.amount),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                decoration: p.cancelled ? TextDecoration.lineThrough : null,
              ),
            ),
            subtitle: Text('${context.date(p.paidAt)} · ${p.method.label(t)}\n${t.receiptNo(p.receiptNo)}'),
            isThreeLine: true,
            trailing: p.cancelled ? _CancelledTag() : const Icon(Icons.chevron_right),
            onTap: () => context.push('/child/$childId/payments/${p.id}'),
          ),
        ),
      ),
    );
  }
}

class _CancelledTag extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Pill(AppLocalizations.of(context).cancelled, color: AttendanceStatus.absent.color);
}

/// One money receipt, as the school prints it: who paid, for what, how much.
class ReceiptScreen extends ConsumerWidget {
  const ReceiptScreen({super.key, required this.paymentId});

  final String paymentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(t.moneyReceipt)),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(receiptProvider(paymentId).future),
        child: AsyncBody(
          value: ref.watch(receiptProvider(paymentId)),
          onRetry: () => ref.invalidate(receiptProvider(paymentId)),
          builder: (r) {
            final muted = Theme.of(context).textTheme.bodySmall;

            Widget row(String label, String value) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 120, child: Text(label, style: muted)),
                      Expanded(child: Text(value)),
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
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SchoolLogo(url: r.schoolLogo, size: 48),
                        const SizedBox(height: 4),
                        Text(context.pick(r.schoolEn, r.schoolBn),
                            textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 4),
                        Text(t.moneyReceipt, textAlign: TextAlign.center, style: Theme.of(context).textTheme.labelLarge),
                        if (r.cancelled) ...[const SizedBox(height: 8), Center(child: _CancelledTag())],
                        const Divider(height: 24),
                        row(t.receiptNoLabel, r.receiptNo),
                        row(t.paidOn, '${context.date(r.paidAt)}, ${context.time(r.paidAt)}'),
                        row(t.studentName, context.pick(r.studentEn, r.studentBn)),
                        if (r.className != null) row(t.className, r.className!),
                        if (r.rollNumber != null) row(t.roll, r.rollNumber!),
                        if (r.year != null) row(t.academicYear, r.year!),
                        row(t.paymentMethod, r.method.label(t)),
                        if (r.transactionRef != null && r.transactionRef!.isNotEmpty) row(t.transactionId, r.transactionRef!),
                        if (r.receivedBy != null) row(t.receivedBy, r.receivedBy!),
                        const Divider(height: 24),
                        for (final line in r.lines)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                Expanded(child: Text(_lineLabel(context, line))),
                                Text(context.money(line.amount)),
                              ],
                            ),
                          ),
                        const Divider(height: 24),
                        Row(
                          children: [
                            Expanded(child: Text(t.total, style: Theme.of(context).textTheme.titleMedium)),
                            Text(
                              context.money(r.amount),
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    decoration: r.cancelled ? TextDecoration.lineThrough : null,
                                  ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  /// "Tuition fee · Oct 2026", "Admission fee · 2026", or the fee's own note.
  String _lineLabel(BuildContext context, ReceiptLine line) {
    final name = context.pick(line.feeEn, line.feeBn);
    final month = line.month;
    final year = line.year;
    final detail = month != null && year != null
        ? context.feeMonth(month, year)
        : [line.description, line.feeYear].whereType<String>().where((s) => s.isNotEmpty).join(' · ');
    return detail.isEmpty ? name : '$name · $detail';
  }
}
