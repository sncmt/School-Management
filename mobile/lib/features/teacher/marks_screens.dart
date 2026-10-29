import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attendance_status.dart';
import '../auth/auth_controller.dart';
import 'marks.dart';

void _toast(BuildContext context, String text) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

/// The teacher's marks sheets, by exam: each subject and section, open from its exam day.
class MySheetsScreen extends ConsumerWidget {
  const MySheetsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(t.examMarks)),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(mySheetsProvider.future),
        child: AsyncBody(
          value: ref.watch(mySheetsProvider),
          onRetry: () => ref.invalidate(mySheetsProvider),
          builder: (sheets) {
            if (sheets.isEmpty) {
              return ListView(padding: const EdgeInsets.all(32), children: [Text(t.noMarkSheets, textAlign: TextAlign.center)]);
            }
            final exams = <String, List<MarkSheetRef>>{};
            for (final s in sheets) {
              (exams[s.examId] ??= []).add(s);
            }
            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                for (final list in exams.values) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(4, 12, 4, 8),
                    child: Text(context.pick(list.first.examEn, list.first.examBn), style: Theme.of(context).textTheme.titleMedium),
                  ),
                  for (final s in list)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(context.pick(s.subjectEn, s.subjectBn)),
                        subtitle: Text('${s.section.label} · ${context.day(s.date)}'),
                        trailing: s.open ? const Icon(Icons.chevron_right) : Text(t.opensOn(context.day(s.date))),
                        onTap: () => context.push(
                          '/teacher/marks/${s.examSubjectId}/${s.section.id}',
                          extra: '${context.pick(s.subjectEn, s.subjectBn)} · ${s.section.label}',
                        ),
                      ),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

/// One subject's marks for one section: a total per student, or each part's marks; or absent.
class MarksEntryScreen extends ConsumerStatefulWidget {
  const MarksEntryScreen({super.key, required this.examSubjectId, required this.sectionId, this.title});

  final String examSubjectId;
  final String sectionId;
  final String? title;

  @override
  ConsumerState<MarksEntryScreen> createState() => _MarksEntryScreenState();
}

class _MarksEntryScreenState extends ConsumerState<MarksEntryScreen> {
  MarksSheet? _loaded;
  Map<String, bool> _absent = {};

  /// One box per student and part ("" for a subject without parts), keyed "enrollment|part".
  final Map<String, TextEditingController> _boxes = {};
  bool _saving = false;

  (String, String) get _key => (widget.examSubjectId, widget.sectionId);

  @override
  void dispose() {
    for (final c in _boxes.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _box(String enrollmentId, String part) => _boxes.putIfAbsent('$enrollmentId|$part', TextEditingController.new);

  String _show(num? v) => v == null ? '' : (v == v.roundToDouble() ? '${v.toInt()}' : '$v');

  void _reset(MarksSheet sheet) {
    _loaded = sheet;
    _absent = {for (final s in sheet.students) s.enrollmentId: s.isAbsent};
    for (final s in sheet.students) {
      if (sheet.parts.isEmpty) {
        _box(s.enrollmentId, '').text = s.isAbsent ? '' : _show(s.total);
      } else {
        for (final p in sheet.parts) {
          _box(s.enrollmentId, p.name).text = s.isAbsent ? '' : _show(s.parts?[p.name]);
        }
      }
    }
  }

  /// What a student's boxes add up to now; null when nothing (or not everything) is filled.
  num? _totalOf(MarksSheet sheet, String enrollmentId) {
    final names = sheet.parts.isEmpty ? [''] : sheet.parts.map((p) => p.name);
    num sum = 0;
    for (final n in names) {
      final v = num.tryParse(_box(enrollmentId, n).text.trim());
      if (v == null) return null;
      sum += v;
    }
    return sum;
  }

  Future<void> _save(MarksSheet sheet) async {
    final t = AppLocalizations.of(context);
    final rows = <Map<String, dynamic>>[];

    for (final s in sheet.students) {
      final name = context.pick(s.nameEn, s.nameBn);
      if (_absent[s.enrollmentId] == true) {
        if (!s.entered || !s.isAbsent) rows.add({'enrollmentId': s.enrollmentId, 'isAbsent': true});
        continue;
      }
      if (sheet.parts.isEmpty) {
        final text = _box(s.enrollmentId, '').text.trim();
        if (text.isEmpty) continue; // not entered yet
        final v = num.tryParse(text);
        if (v == null || v < 0 || v > sheet.fullMarks) return _toast(context, t.marksOutOfRange(name, context.number(sheet.fullMarks)));
        if (!s.entered || s.isAbsent || v != s.total) rows.add({'enrollmentId': s.enrollmentId, 'total': v});
      } else {
        final texts = {for (final p in sheet.parts) p.name: _box(s.enrollmentId, p.name).text.trim()};
        if (texts.values.every((x) => x.isEmpty)) continue;
        if (texts.values.any((x) => x.isEmpty)) return _toast(context, t.fillAllParts(name));
        final parts = <String, num>{};
        for (final p in sheet.parts) {
          final v = num.tryParse(texts[p.name]!);
          if (v == null || v < 0 || v > p.fullMarks) return _toast(context, t.marksOutOfRange('$name, ${p.name}', context.number(p.fullMarks)));
          parts[p.name] = v;
        }
        final same = s.entered && !s.isAbsent && sheet.parts.every((p) => s.parts?[p.name] == parts[p.name]);
        if (!same) rows.add({'enrollmentId': s.enrollmentId, 'parts': parts});
      }
    }
    if (rows.isEmpty) return _toast(context, t.marksSaved);

    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider)!.put<void>(
        '/exam-marks/sheet',
        body: {'examSubjectId': sheet.examSubjectId, 'sectionId': sheet.sectionId, 'marks': rows},
      );
      if (!mounted) return;
      _toast(context, t.marksSaved);
      ref.invalidate(marksSheetProvider(_key));
    } on ApiException catch (e) {
      if (mounted) _toast(context, e.isNetwork ? t.networkError : e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final value = ref.watch(marksSheetProvider(_key));
    final sheet = value.value;
    if (sheet != null && !identical(sheet, _loaded)) _reset(sheet);

    return Scaffold(
      appBar: AppBar(title: Text(widget.title ?? t.examMarks)),
      floatingActionButton: sheet != null && sheet.canEdit && sheet.students.isNotEmpty
          ? FloatingActionButton.extended(
              icon: _saving
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check),
              label: Text(t.save),
              onPressed: _saving ? null : () => _save(sheet),
            )
          : null,
      body: AsyncBody(
        value: value,
        onRetry: () => ref.invalidate(marksSheetProvider(_key)),
        builder: (sheet) => ListView(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.fullAndPass(context.number(sheet.fullMarks), context.number(sheet.passMarks)),
                        style: Theme.of(context).textTheme.titleSmall),
                    if (sheet.parts.isNotEmpty)
                      Text(
                        sheet.parts.map((p) => '${p.name} ${context.number(p.fullMarks)}').join(' · '),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    const SizedBox(height: 4),
                    Text(t.enteredCount(context.number(sheet.entered), context.number(sheet.students.length))),
                    if (!sheet.canEdit && sheet.cannotEditReason != null) ...[
                      const SizedBox(height: 6),
                      Text(sheet.cannotEditReason!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            for (final s in sheet.students) _studentRow(context, sheet, s),
          ],
        ),
      ),
    );
  }

  Widget _studentRow(BuildContext context, MarksSheet sheet, MarkStudent s) {
    final t = AppLocalizations.of(context);
    final absent = _absent[s.enrollmentId] == true;
    final enabled = sheet.canEdit && !_saving;
    final total = absent ? null : _totalOf(sheet, s.enrollmentId);
    final fail = total != null && total < sheet.passMarks;

    Widget box(String part, num full, String? label) => SizedBox(
          width: 72,
          child: TextField(
            controller: _box(s.enrollmentId, part),
            enabled: enabled,
            textAlign: TextAlign.center,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
            // the total and the pass colour follow what is typed
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(isDense: true, labelText: label, hintText: '/${_show(full)}'),
          ),
        );

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SizedBox(width: 32, child: Text(s.rollNumber ?? '-', style: const TextStyle(fontWeight: FontWeight.w600))),
                Expanded(child: Text(context.pick(s.nameEn, s.nameBn), maxLines: 2, overflow: TextOverflow.ellipsis)),
                if (total != null && sheet.parts.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Text(context.number(total),
                        style: TextStyle(fontWeight: FontWeight.bold, color: fail ? AttendanceStatus.absent.color : null)),
                  ),
                FilterChip(
                  label: Text(t.absent),
                  selected: absent,
                  selectedColor: AttendanceStatus.absent.color.withValues(alpha: 0.2),
                  onSelected: enabled ? (on) => setState(() => _absent[s.enrollmentId] = on) : null,
                ),
              ],
            ),
            if (!absent) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: sheet.parts.isEmpty
                    ? [box('', sheet.fullMarks, null)]
                    : [for (final p in sheet.parts) box(p.name, p.fullMarks, p.name)],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
