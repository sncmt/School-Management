import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../l10n/app_localizations.dart';
import '../auth/auth_controller.dart';

/// GET /family: the children on this account, with their class this year (and, for the
/// screens of phase 3, attendance, dues, homework and admit cards).
final familyHomeProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref.watch(apiClientProvider)!.get<Map<String, dynamic>>('/family'),
);

class GuardianHome extends ConsumerWidget {
  const GuardianHome({super.key, required this.me});

  final Me me;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final home = ref.watch(familyHomeProvider);
    final children = (home.value?['children'] as List?)?.cast<Map<String, dynamic>>();

    return RefreshIndicator(
      onRefresh: () => ref.refresh(familyHomeProvider.future),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(t.welcome(me.fullname), style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 24),
          Text(t.myChildren, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (children != null)
            if (children.isEmpty) Text(t.noChildren) else ...children.map((c) => _ChildCard(child: c))
          else if (home.hasError)
            _LoadError(error: home.error!, onRetry: () => ref.invalidate(familyHomeProvider))
          else
            const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
        ],
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  const _ChildCard({required this.child});

  final Map<String, dynamic> child;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final bangla = Localizations.localeOf(context).languageCode == 'bn';
    final name = (bangla ? child['nameBn'] as String? : null) ?? child['nameEn'] as String;
    final enrollment = child['enrollment'] as Map<String, dynamic>?;
    final className = (enrollment?['class'] as Map?)?['name'] as String?;
    final section = enrollment?['section'] as Map?;
    final classLabel = [className, if (section != null && section['isDefault'] != true) section['name']].whereType<String>().join(' · ');
    final photo = child['photo'] as String?;

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          foregroundImage: photo == null ? null : NetworkImage(photo),
          child: Text(name.characters.first),
        ),
        title: Text(name),
        subtitle: enrollment == null ? null : Text(t.classAndRoll(classLabel, '${enrollment['rollNumber'] ?? '-'}')),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final e = error;
    return Column(
      children: [
        Text(e is ApiException && !e.isNetwork ? e.message : t.networkError, textAlign: TextAlign.center),
        TextButton(onPressed: onRetry, child: Text(t.retry)),
      ],
    );
  }
}
