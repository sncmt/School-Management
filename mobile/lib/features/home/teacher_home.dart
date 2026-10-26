import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../auth/auth_controller.dart';

/// Phase 4: today's classes, attendance, homework and marks.
class TeacherHome extends StatelessWidget {
  const TeacherHome({super.key, required this.me});

  final Me me;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(t.welcome(me.fullname), style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 48),
        const Icon(Icons.construction_rounded, size: 56),
        const SizedBox(height: 12),
        Text(t.teacherComingSoon, textAlign: TextAlign.center),
      ],
    );
  }
}
