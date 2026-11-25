import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/attachment_list.dart';
import '../../widgets/notice_text.dart';
import '../../widgets/paged_list_view.dart';
import '../../widgets/ui.dart';
import 'family.dart';
import 'homework.dart';

/// All of a child's homework, the latest due first.
class HomeworkListScreen extends ConsumerWidget {
  const HomeworkListScreen({super.key, required this.childId});

  final String childId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final provider = homeworkListProvider(childId);
    final child = ref.watch(familyHomeProvider).value?.child(childId);

    return Scaffold(
      appBar: AppBar(
        title: Text(t.homework),
        bottom: child == null
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(24),
                child: Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(context.pick(child.nameEn, child.nameBn))),
              ),
      ),
      body: PagedListView<Homework>(
        value: ref.watch(provider),
        empty: t.noHomeworkYet,
        onRefresh: () => ref.refresh(provider.future),
        onLoadMore: () => ref.read(provider.notifier).loadMore(),
        onRetry: () => ref.invalidate(provider),
        itemBuilder: (context, hw) => HomeworkTile(childId: childId, homework: hw),
      ),
    );
  }
}

/// A homework line: subject and title, due date, and the teacher's tick once checked.
class HomeworkTile extends StatelessWidget {
  const HomeworkTile({super.key, required this.childId, required this.homework, this.inCard = true});

  final String childId;
  final Homework homework;

  /// false inside another card (the child's page).
  final bool inCard;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final check = homework.check;
    final tile = ListTile(
      contentPadding: inCard ? null : EdgeInsets.zero,
      title: Text(homework.title),
      subtitle: Text('${context.pick(homework.subjectEn, homework.subjectBn)} · ${t.dueOn(context.day(homework.dueDate))}'),
      trailing: check == null ? const Icon(Icons.chevron_right) : CheckChip(status: check.status),
      onTap: () => context.push('/child/$childId/homework/${homework.id}', extra: homework),
    );
    return inCard ? Card(margin: const EdgeInsets.only(bottom: 8), child: tile) : tile;
  }
}

class CheckChip extends StatelessWidget {
  const CheckChip({super.key, required this.status});

  final CheckStatus status;

  @override
  Widget build(BuildContext context) => Pill(status.label(AppLocalizations.of(context)), color: status.color);
}

/// One homework: what to do, its files, and the teacher's check.
class HomeworkDetailScreen extends StatelessWidget {
  const HomeworkDetailScreen({super.key, required this.homework});

  /// Handed over by the list; null when the page was opened some other way.
  final Homework? homework;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final hw = homework;
    if (hw == null) return Scaffold(appBar: AppBar(), body: Center(child: Text(t.noHomeworkYet)));
    final check = hw.check;
    final instructions = hw.instructions;
    final fullMarks = hw.fullMarks;

    return Scaffold(
      appBar: AppBar(title: Text(context.pick(hw.subjectEn, hw.subjectBn))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(hw.title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            runSpacing: 4,
            children: [
              Text(t.assignedOn(context.day(hw.assignedOn))),
              Text(t.dueOn(context.day(hw.dueDate)), style: const TextStyle(fontWeight: FontWeight.w600)),
              if (fullMarks != null) Text(t.fullMarks(context.number(fullMarks))),
            ],
          ),
          const Divider(height: 32),
          if (instructions != null && instructions.trim().isNotEmpty) NoticeText(instructions),
          if (hw.attachments.isNotEmpty) ...[
            Text(t.attachments, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            AttachmentList(attachments: hw.attachments),
          ],
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t.teacherCheck, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  if (check == null)
                    Text(t.notCheckedYet)
                  else ...[
                    Row(
                      children: [
                        CheckChip(status: check.status),
                        if (check.marks != null) ...[
                          const SizedBox(width: 12),
                          Text(
                            fullMarks == null
                                ? context.number(check.marks!)
                                : '${context.number(check.marks!)} / ${context.number(fullMarks)}',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ],
                      ],
                    ),
                    if (check.comment?.isNotEmpty ?? false) ...[
                      const SizedBox(height: 8),
                      Text('“${check.comment}”', style: const TextStyle(fontStyle: FontStyle.italic)),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
