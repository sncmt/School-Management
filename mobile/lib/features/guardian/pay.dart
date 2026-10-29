import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../auth/auth_controller.dart';

/*
 * Paying fees online through the school's SSLCommerz store (server: CheckoutService):
 *   options -> the fees owed now and the school's online charge
 *   start   -> an SSLCommerz page for the chosen fees (opened in the app)
 *   result  -> what became of it; while it is still waiting the server asks SSLCommerz
 * Only shown when the school has saved its store and switched online payment on.
 */

/// "1234.50" -> 123450 paisa: money is added up in whole paisa, never in floating point.
int paisaOf(String amount) => ((double.tryParse(amount) ?? 0) * 100).round();

/// 123450 -> "1234.50", for the money formatter.
String amountOf(int paisa) => (paisa / 100).toStringAsFixed(2);

class PayableFee {
  PayableFee({required this.id, required this.nameEn, this.nameBn, this.month, this.year, this.description, required this.remaining});

  final String id;
  final String nameEn;
  final String? nameBn;
  final String? month;
  final int? year;
  final String? description;

  /// What is still owed on it ("500.00").
  final String remaining;

  factory PayableFee.fromJson(Map<String, dynamic> json) {
    final type = json['feeType'] as Map<String, dynamic>;
    return PayableFee(
      id: json['id'] as String,
      nameEn: type['nameEn'] as String,
      nameBn: type['nameBn'] as String?,
      month: json['month'] as String?,
      year: json['year'] as int?,
      description: json['description'] as String?,
      remaining: json['remaining'] as String,
    );
  }
}

/// GET /family/pay/:studentId.
class PayOptions {
  PayOptions({required this.enabled, required this.chargePercent, required this.fees});

  final bool enabled;

  /// Added to what the guardian pays, in percent ("1.50"); 0 when the school absorbs it.
  final String chargePercent;
  final List<PayableFee> fees;

  /// The online charge on an amount, rounded to the paisa as the server does (half up).
  int chargeOn(int paisa) => (paisa * (double.tryParse(chargePercent) ?? 0) / 100).round();

  factory PayOptions.fromJson(Map<String, dynamic> json) => PayOptions(
        enabled: json['enabled'] == true,
        chargePercent: json['chargePercent'] as String? ?? '0.00',
        fees: [for (final f in json['fees'] as List) PayableFee.fromJson(f as Map<String, dynamic>)],
      );
}

final payOptionsProvider = FutureProvider.autoDispose.family<PayOptions, String>((ref, studentId) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/family/pay/$studentId');
  return PayOptions.fromJson(json);
});

/// A started payment: where to send the guardian, and how to look it up afterwards.
class StartedPayment {
  StartedPayment({required this.tranId, required this.gatewayUrl, required this.total});

  final String tranId;
  final String gatewayUrl;
  final String total;
}

/// Throws ApiException (fees no longer owed, the store unreachable...).
Future<StartedPayment> startPayment(ApiClient api, String studentId, List<String> feeIds) async {
  final json = await api.post<Map<String, dynamic>>('/family/pay', body: {'studentId': studentId, 'feeIds': feeIds});
  return StartedPayment(
    tranId: json['tranId'] as String,
    gatewayUrl: json['gatewayUrl'] as String,
    total: json['total'] as String,
  );
}

enum PayStatus { pending, paid, failed, cancelled }

/// GET /family/pay/result/:tranId.
class PayResult {
  PayResult({required this.status, required this.total, required this.refundAmount, this.failReason, this.paymentId, this.receiptNo});

  final PayStatus status;
  final String total;

  /// Paid while nothing (or less) was owed any more: the school refunds this much.
  final String refundAmount;
  final String? failReason;

  /// The money receipt, once recorded.
  final String? paymentId;
  final String? receiptNo;

  factory PayResult.fromJson(Map<String, dynamic> json) {
    final payment = json['payment'] as Map<String, dynamic>?;
    return PayResult(
      status: switch (json['status']) {
        'PAID' => PayStatus.paid,
        'FAILED' => PayStatus.failed,
        'CANCELLED' => PayStatus.cancelled,
        _ => PayStatus.pending,
      },
      total: json['total'] as String? ?? '0.00',
      refundAmount: json['refundAmount'] as String? ?? '0.00',
      failReason: json['failReason'] as String?,
      paymentId: payment?['id'] as String?,
      receiptNo: payment?['receiptNo']?.toString(),
    );
  }
}

Future<PayResult> paymentResult(ApiClient api, String tranId) async =>
    PayResult.fromJson(await api.get<Map<String, dynamic>>('/family/pay/result/$tranId'));
