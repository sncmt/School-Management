import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/paged.dart';
import '../../l10n/app_localizations.dart';
import '../auth/auth_controller.dart';

/// How a payment was made.
enum PaymentMethod {
  cash,
  mobileBanking,
  online;

  static PaymentMethod parse(String? value) => switch (value) {
        'MOBILE_BANKING' => mobileBanking,
        'ONLINE' => online,
        _ => cash,
      };

  String label(AppLocalizations t) => switch (this) {
        cash => t.methodCash,
        mobileBanking => t.methodMobileBanking,
        online => t.methodOnline,
      };
}

/// A money receipt in a child's history (GET /family/payments).
class Payment {
  Payment({
    required this.id,
    required this.receiptNo,
    required this.amount,
    required this.method,
    required this.cancelled,
    required this.paidAt,
  });

  final String id;
  final String receiptNo;
  final String amount;
  final PaymentMethod method;

  /// The school cancelled the receipt: the money no longer counts.
  final bool cancelled;
  final String paidAt;

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
        id: json['id'] as String,
        receiptNo: json['receiptNo']?.toString() ?? '',
        amount: json['amount'] as String,
        method: PaymentMethod.parse(json['method'] as String?),
        cancelled: json['status'] == 'CANCELLED',
        paidAt: json['paidAt'] as String,
      );
}

/// A child's receipts, newest first, 20 at a time.
class PaymentList extends PagedNotifier<Payment> {
  PaymentList(this.studentId);

  final String studentId;

  @override
  Future<(List<Payment>, int)> fetch(int page) async {
    final json = await ref.read(apiClientProvider)!.get<Map<String, dynamic>>(
      '/family/payments',
      query: {'studentId': studentId, 'page': page},
    );
    return pageOf(json, Payment.fromJson);
  }
}

final paymentListProvider =
    AsyncNotifierProvider.autoDispose.family<PaymentList, Paged<Payment>, String>(PaymentList.new);

// ------------------------------------------------------------------------- receipt

/// One money receipt in full (GET /family/payments/:id/receipt), as the school prints it.
class Receipt {
  Receipt({
    required this.receiptNo,
    required this.amount,
    required this.method,
    required this.cancelled,
    required this.paidAt,
    this.transactionRef,
    this.receivedBy,
    this.schoolEn,
    this.schoolBn,
    this.schoolLogo,
    required this.studentEn,
    this.studentBn,
    this.admissionNo,
    this.className,
    this.rollNumber,
    this.year,
    required this.lines,
  });

  final String receiptNo;
  final String amount;
  final PaymentMethod method;
  final bool cancelled;
  final String paidAt;
  final String? transactionRef;
  final String? receivedBy;
  final String? schoolEn;
  final String? schoolBn;
  final String? schoolLogo;
  final String studentEn;
  final String? studentBn;
  final String? admissionNo;
  final String? className;
  final String? rollNumber;
  final String? year;

  /// What the money paid: each fee and its share.
  final List<ReceiptLine> lines;

  factory Receipt.fromJson(Map<String, dynamic> json) {
    final school = json['school'] as Map<String, dynamic>?;
    final student = json['student'] as Map<String, dynamic>;
    final enrollment = json['enrollment'] as Map<String, dynamic>?;
    final section = enrollment?['section'] as Map<String, dynamic>?;
    final className = [
      (enrollment?['class'] as Map?)?['name'] as String?,
      if (section != null && section['isDefault'] != true) section['name'] as String?,
    ].whereType<String>().join(' · ');
    return Receipt(
      receiptNo: json['receiptNo']?.toString() ?? '',
      amount: json['amount'].toString(),
      method: PaymentMethod.parse(json['method'] as String?),
      cancelled: json['status'] == 'CANCELLED',
      paidAt: json['paidAt'] as String,
      transactionRef: json['transactionRef'] as String?,
      receivedBy: json['receivedByName'] as String?,
      schoolEn: school?['nameEn'] as String?,
      schoolBn: school?['nameBn'] as String?,
      schoolLogo: school?['logo'] as String?,
      studentEn: student['nameEn'] as String,
      studentBn: student['nameBn'] as String?,
      admissionNo: student['admissionNo']?.toString(),
      className: className.isEmpty ? null : className,
      rollNumber: enrollment?['rollNumber']?.toString(),
      year: (enrollment?['academicYear'] as Map?)?['name'] as String?,
      lines: [for (final a in json['allocations'] as List) ReceiptLine.fromJson(a as Map<String, dynamic>)],
    );
  }
}

class ReceiptLine {
  ReceiptLine({required this.feeEn, this.feeBn, this.month, this.year, this.description, this.feeYear, required this.amount});

  final String feeEn;
  final String? feeBn;

  /// "JAN".."DEC" for a monthly fee.
  final String? month;
  final int? year;
  final String? description;

  /// The fee's academic year (a one-time fee from another year shows it).
  final String? feeYear;
  final String amount;

  factory ReceiptLine.fromJson(Map<String, dynamic> json) {
    final fee = json['studentFee'] as Map<String, dynamic>;
    final type = fee['feeType'] as Map<String, dynamic>;
    return ReceiptLine(
      feeEn: type['nameEn'] as String,
      feeBn: type['nameBn'] as String?,
      month: fee['month'] as String?,
      year: fee['year'] as int?,
      description: fee['description'] as String?,
      feeYear: (fee['academicYear'] as Map?)?['name'] as String?,
      // a Decimal from the server: "500" or "500.00"
      amount: json['amount'].toString(),
    );
  }
}

final receiptProvider = FutureProvider.autoDispose.family<Receipt, String>((ref, paymentId) async {
  final json = await ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/family/payments/$paymentId/receipt');
  return Receipt.fromJson(json);
});
