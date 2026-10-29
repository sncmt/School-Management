import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'ui.dart';

/// A roll-call status as the server sends it.
enum AttendanceStatus {
  present,
  late,
  absent,
  leave;

  static AttendanceStatus? parse(String? value) => switch (value) {
        'PRESENT' => present,
        'LATE' => late,
        'ABSENT' => absent,
        'LEAVE' => leave,
        _ => null,
      };

  /// The website's colours: green present, amber late, red absent; blue for leave.
  Color get color => switch (this) {
        present => const Color(0xFF2E7D32),
        late => const Color(0xFFB26A00),
        absent => const Color(0xFFC62828),
        leave => const Color(0xFF1565C0),
      };

  String label(AppLocalizations t) => switch (this) {
        present => t.present,
        late => t.late,
        absent => t.absent,
        leave => t.leave,
      };

  /// One or two letters, for the roll-call buttons: P / L / A / Lv.
  String shortLabel(AppLocalizations t) => switch (this) {
        present => t.presentShort,
        late => t.lateShort,
        absent => t.absentShort,
        leave => t.leaveShort,
      };
}

/// A small coloured label: "Present", "Absent"...
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final AttendanceStatus status;

  @override
  Widget build(BuildContext context) => Pill(status.label(AppLocalizations.of(context)), color: status.color);
}
