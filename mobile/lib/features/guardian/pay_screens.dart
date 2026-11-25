import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import '../../widgets/ui.dart';
import '../auth/auth_controller.dart';
import 'family.dart';
import 'pay.dart';
import 'payments.dart';

// SSLCommerz takes payments of ৳10 or more
const _minimumPaisa = 1000;

String _feeLabel(BuildContext context, PayableFee fee) {
  final name = context.pick(fee.nameEn, fee.nameBn);
  final month = fee.month;
  final year = fee.year;
  final detail = month != null && year != null ? context.feeMonth(month, year) : fee.description;
  return detail == null || detail.isEmpty ? name : '$name · $detail';
}

// ---------------------------------------------------------------------- choose

/// What the guardian pays now: the fees owed (all ticked to begin with), the school's online
/// charge, and the total. Then the SSLCommerz page.
class PayFeesScreen extends ConsumerStatefulWidget {
  const PayFeesScreen({super.key, required this.childId});

  final String childId;

  @override
  ConsumerState<PayFeesScreen> createState() => _PayFeesScreenState();
}

class _PayFeesScreenState extends ConsumerState<PayFeesScreen> {
  /// The ticked fees; null until the list loads (then: all of them).
  Set<String>? _chosen;
  bool _starting = false;

  Future<void> _pay(PayOptions options) async {
    final t = AppLocalizations.of(context);
    setState(() => _starting = true);
    try {
      final started = await startPayment(ref.read(apiClientProvider)!, widget.childId, _chosen!.toList());
      if (!mounted) return;
      context.push('/child/${widget.childId}/pay/gateway', extra: started);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.isNetwork ? t.networkError : e.message)));
      // a fee paid at the office meanwhile: the list is out of date
      if (e.statusCode == 409) ref.invalidate(payOptionsProvider(widget.childId));
    } finally {
      if (mounted) setState(() => _starting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final value = ref.watch(payOptionsProvider(widget.childId));
    final options = value.value;
    if (options != null && _chosen == null) _chosen = {for (final f in options.fees) f.id};

    final chosen = _chosen ?? const <String>{};
    final subtotal = options == null
        ? 0
        : options.fees.where((f) => chosen.contains(f.id)).fold(0, (sum, f) => sum + paisaOf(f.remaining));
    final charge = options?.chargeOn(subtotal) ?? 0;
    final total = subtotal + charge;
    final tooSmall = subtotal > 0 && total < _minimumPaisa;

    return Scaffold(
      appBar: AppBar(title: Text(t.payFees)),
      bottomNavigationBar: options == null || options.fees.isEmpty || !options.enabled
          ? null
          : SafeArea(
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border(top: BorderSide(color: context.palette.hairline)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _SumRow(label: t.feesLabel, amount: context.money(amountOf(subtotal))),
                    if (charge > 0)
                      _SumRow(label: t.onlineCharge(context.number(double.parse(options.chargePercent))), amount: context.money(amountOf(charge))),
                    const Divider(height: 18),
                    _SumRow(label: t.total, amount: context.money(amountOf(total)), strong: true),
                    if (tooSmall) ...[
                      const SizedBox(height: 6),
                      Text(t.minimumOnline, style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 13)),
                    ],
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      icon: _starting
                          ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                          : const Icon(Icons.lock_outline_rounded),
                      label: Text(t.payAmount(context.money(amountOf(total)))),
                      onPressed: _starting || subtotal == 0 || tooSmall ? null : () => _pay(options),
                    ),
                    const SizedBox(height: 6),
                    Text(t.securedBySslcommerz, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ),
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(payOptionsProvider(widget.childId)),
        builder: (options) {
          if (!options.enabled || options.fees.isEmpty) {
            return EmptyState(icon: Icons.payments_outlined, message: t.nothingToPayOnline);
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            children: [
              Text(t.chooseFees, style: TextStyle(color: context.palette.muted)),
              const SizedBox(height: 12),
              Card(
                child: Column(
                  children: [
                    for (final (i, fee) in options.fees.indexed) ...[
                      if (i > 0) const Divider(height: 1, indent: 56),
                      CheckboxListTile(
                        controlAffinity: ListTileControlAffinity.leading,
                        value: chosen.contains(fee.id),
                        onChanged: _starting ? null : (on) => setState(() => on! ? _chosen!.add(fee.id) : _chosen!.remove(fee.id)),
                        title: Text(_feeLabel(context, fee)),
                        secondary: Text(context.money(fee.remaining), style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SumRow extends StatelessWidget {
  const _SumRow({required this.label, required this.amount, this.strong = false});

  final String label;
  final String amount;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final style = strong
        ? Theme.of(context).textTheme.titleMedium
        : TextStyle(color: context.palette.muted);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [Expanded(child: Text(label, style: style)), Text(amount, style: style)]),
    );
  }
}

// ----------------------------------------------------------------------- gateway

/// The SSLCommerz page, inside the app. When it sends the payer back to the school (or that
/// return can't load, as in testing), this closes and asks the server what happened: the
/// server confirms with SSLCommerz itself, so the result never depends on the return trip.
class PaymentGatewayScreen extends ConsumerStatefulWidget {
  const PaymentGatewayScreen({super.key, required this.childId, required this.payment});

  final String childId;
  final StartedPayment payment;

  @override
  ConsumerState<PaymentGatewayScreen> createState() => _PaymentGatewayScreenState();
}

class _PaymentGatewayScreenState extends ConsumerState<PaymentGatewayScreen> {
  late final WebViewController _web;
  int _progress = 0;
  bool _finished = false;

  /// The school's page for this payment, where SSLCommerz's return ends up.
  static bool _isReturn(String url) => url.contains('/fees/payment/');

  /// SSLCommerz posting the payer back to our server.
  static bool _isCallback(String url) => url.contains('/pay/sslcommerz/');

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) => mounted ? setState(() => _progress = p) : null,
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            // bKash, Nagad, bank apps: their own app opens
            if (uri != null && uri.scheme != 'http' && uri.scheme != 'https') {
              launchUrl(uri, mode: LaunchMode.externalApplication);
              return NavigationDecision.prevent;
            }
            if (_isReturn(request.url)) {
              _finish();
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
          onPageStarted: (url) {
            if (_isReturn(url)) _finish();
          },
          onWebResourceError: (error) {
            final url = error.url ?? '';
            if (error.isForMainFrame != false && (_isCallback(url) || _isReturn(url))) _finish();
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.payment.gatewayUrl));
  }

  void _finish() {
    if (_finished || !mounted) return;
    _finished = true;
    context.pushReplacement('/child/${widget.childId}/pay/result/${widget.payment.tranId}');
  }

  Future<void> _confirmLeave() async {
    final t = AppLocalizations.of(context);
    final leave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.leavePayment),
        content: Text(t.leavePaymentBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t.stay)),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(t.leave)),
        ],
      ),
    );
    // leaving still shows what became of it: it may have been paid already
    if (leave == true) _finish();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _web.canGoBack()) {
          await _web.goBack();
        } else {
          await _confirmLeave();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.close_rounded), onPressed: _confirmLeave),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t.payFees),
              Text(context.money(widget.payment.total), style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          actions: [Padding(padding: const EdgeInsets.only(right: 16), child: Icon(Icons.lock_rounded, color: AttendanceStatus.present.color, size: 20))],
          bottom: _progress < 100
              ? PreferredSize(preferredSize: const Size.fromHeight(2), child: LinearProgressIndicator(value: _progress / 100, minHeight: 2))
              : null,
        ),
        body: WebViewWidget(controller: _web),
      ),
    );
  }
}

// ------------------------------------------------------------------------ result

/// What became of a payment. While SSLCommerz hasn't answered, the server is asked again a few
/// times (it checks with SSLCommerz each time).
class PaymentResultScreen extends ConsumerStatefulWidget {
  const PaymentResultScreen({super.key, required this.childId, required this.tranId});

  final String childId;
  final String tranId;

  @override
  ConsumerState<PaymentResultScreen> createState() => _PaymentResultScreenState();
}

class _PaymentResultScreenState extends ConsumerState<PaymentResultScreen> {
  static const _tries = 6;
  static const _wait = Duration(seconds: 3);

  PayResult? _result;
  ApiException? _error;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    setState(() {
      _checking = true;
      _error = null;
    });
    final api = ref.read(apiClientProvider)!;
    for (var i = 0; i < _tries && mounted; i++) {
      try {
        final result = await paymentResult(api, widget.tranId);
        if (!mounted) return;
        setState(() => _result = result);
        if (result.status != PayStatus.pending) break;
      } on ApiException catch (e) {
        if (mounted) setState(() => _error = e);
        break;
      }
      await Future<void>.delayed(_wait);
    }
    if (!mounted) return;
    setState(() => _checking = false);
    // the dues, the payable fees and the history have changed
    ref.invalidate(familyHomeProvider);
    ref.invalidate(payOptionsProvider(widget.childId));
    ref.invalidate(paymentListProvider(widget.childId));
  }

  /// Back past the fee list to the child's page; then, if given, on to `next` from there.
  void _done({String? next}) {
    final router = GoRouter.of(context);
    if (router.canPop()) router.pop();
    if (router.canPop()) router.pop();
    if (next != null) router.push(next);
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final result = _result;
    final error = _error;
    final refund = result == null ? 0 : paisaOf(result.refundAmount);

    final (IconData icon, Color color, String title, String? body) = switch (result?.status) {
      _ when _checking && (result == null || result.status == PayStatus.pending) =>
        (Icons.hourglass_top_rounded, Theme.of(context).colorScheme.primary, t.checkingPayment, null),
      PayStatus.paid => (
          Icons.check_circle_rounded,
          AttendanceStatus.present.color,
          t.paymentSuccess,
          refund > 0 ? t.paidButRefund(context.money(result!.refundAmount)) : null,
        ),
      PayStatus.failed => (Icons.cancel_rounded, AttendanceStatus.absent.color, t.paymentFailed, result!.failReason),
      PayStatus.cancelled => (Icons.remove_circle_outline_rounded, AttendanceStatus.late.color, t.paymentNotCompleted, null),
      _ when error != null => (Icons.cloud_off_rounded, AttendanceStatus.absent.color, error.isNetwork ? t.networkError : error.message, null),
      _ => (Icons.schedule_rounded, AttendanceStatus.late.color, t.paymentPending, t.paymentPendingBody),
    };

    return PopScope(
      canPop: !_checking,
      child: Scaffold(
        appBar: AppBar(automaticallyImplyLeading: false),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                const Spacer(),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 350),
                  transitionBuilder: (child, a) => ScaleTransition(scale: a, child: FadeTransition(opacity: a, child: child)),
                  child: _checking && (result == null || result.status == PayStatus.pending)
                      ? const SizedBox.square(key: ValueKey('wait'), dimension: 72, child: CircularProgressIndicator(strokeWidth: 3))
                      : IconBadge(icon, key: ValueKey(icon), color: color, size: 88),
                ),
                const SizedBox(height: 24),
                Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall),
                if (result != null && result.status == PayStatus.paid) ...[
                  const SizedBox(height: 8),
                  Text(context.money(result.total), style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: color)),
                  if (result.receiptNo != null) Text(t.receiptNo(result.receiptNo!), style: TextStyle(color: context.palette.muted)),
                ],
                if (body != null) ...[
                  const SizedBox(height: 12),
                  Text(body, textAlign: TextAlign.center, style: TextStyle(color: context.palette.muted)),
                ],
                const Spacer(),
                if (!_checking) ...[
                  if (result?.paymentId != null)
                    FilledButton.icon(
                      icon: const Icon(Icons.receipt_long_rounded),
                      label: Text(t.viewReceipt),
                      onPressed: () => _done(next: '/child/${widget.childId}/payments/${result!.paymentId}'),
                    ),
                  if (result?.status == PayStatus.pending || error != null)
                    FilledButton.icon(icon: const Icon(Icons.refresh_rounded), label: Text(t.checkAgain), onPressed: _check),
                  const SizedBox(height: 10),
                  OutlinedButton(onPressed: () => _done(), child: Text(t.done)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
