import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Formatting in the app's language: Bangla digits and month names under `bn`.
extension Formats on BuildContext {
  String get _locale => Localizations.localeOf(this).languageCode;

  bool get isBangla => _locale == 'bn';

  /// The server's money ("1234.50") as "৳1,234.50", grouped the Bangladeshi way (1,00,000).
  String money(String amount) {
    final value = double.tryParse(amount) ?? 0;
    return '৳${NumberFormat('#,##,##0.##', _locale).format(value)}';
  }

  /// A plain number in the app's digits.
  String number(num value) => NumberFormat.decimalPattern(_locale).format(value);

  /// "2026-10-28" -> "28 Oct".
  String day(String date) => DateFormat.MMMd(_locale).format(DateTime.parse(date));

  /// "2026-10-28" -> "Wed, 28 Oct".
  String weekdayDay(String date) => DateFormat.MMMEd(_locale).format(DateTime.parse(date));

  /// A moment from the server (UTC) as the phone's local date: "28 Oct 2026".
  String date(String isoDateTime) => DateFormat.yMMMd(_locale).format(DateTime.parse(isoDateTime).toLocal());

  /// A file size: "240 KB", "1.2 MB".
  String fileSize(int bytes) => bytes < 1024 * 1024
      ? '${number((bytes / 1024).ceil())} KB'
      : '${NumberFormat('0.#', _locale).format(bytes / (1024 * 1024))} MB';

  /// A moment from the server (UTC) as the phone's local time: "9:05 AM".
  String time(String isoDateTime) => DateFormat.jm(_locale).format(DateTime.parse(isoDateTime).toLocal());

  /// A period's "HH:mm" as the phone shows times: "9:30 AM".
  String clock(String hhmm) {
    final [h, m] = hhmm.split(':').map(int.parse).toList();
    return DateFormat.jm(_locale).format(DateTime(2000, 1, 1, h, m));
  }

  /// The weekday's name, 0 = Sunday (the server's numbering).
  String weekdayName(int weekday) => DateFormat.EEEE(_locale).format(DateTime(2024, 1, 7 + weekday)); // 7 Jan 2024: a Sunday

  /// "October 2026".
  String monthYear(DateTime month) => DateFormat.yMMMM(_locale).format(month);

  /// The server's fee month ("JAN".."DEC") with its year: "Jan 2026".
  String feeMonth(String month, int year) {
    final index = _months.indexOf(month);
    return index < 0 ? '$month $year' : DateFormat.yMMM(_locale).format(DateTime(year, index + 1));
  }

  /// English or Bangla name, whichever the app shows, falling back to the English one.
  String pick(String? en, String? bn) => (isBangla && (bn?.isNotEmpty ?? false) ? bn : en) ?? bn ?? '';
}

const _months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
