import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/async_body.dart';
import '../../widgets/attachment_list.dart';
import '../../widgets/notice_text.dart';
import '../../widgets/paged_list_view.dart';
import '../auth/auth_controller.dart';
import '../guardian/homework.dart';
import 'homework_manage.dart';

String _dayKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

void _toast(BuildContext context, String text) =>
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

String _errorText(BuildContext context, ApiException e) => e.isNetwork ? AppLocalizations.of(context).networkError : e.message;

/// Up to 5 files per homework (the server's limit).
const _maxFiles = 5;

/// A photo from the camera or the gallery; null when the teacher backs out.
Future<XFile?> _pickPhoto(BuildContext context) async {
  final t = AppLocalizations.of(context);
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    builder: (context) => SafeArea(
      child: Wrap(
        children: [
          ListTile(leading: const Icon(Icons.photo_camera_outlined), title: Text(t.camera), onTap: () => Navigator.pop(context, ImageSource.camera)),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: Text(t.gallery), onTap: () => Navigator.pop(context, ImageSource.gallery)),
        ],
      ),
    ),
  );
  if (source == null) return null;
  // the server shrinks it to 2000 px anyway: no need to send a 12 MP original
  return ImagePicker().pickImage(source: source, maxWidth: 2000, maxHeight: 2000, imageQuality: 85);
}

// ----------------------------------------------------------------------------- list

/// The teacher's homework, the latest due first, with how many were ticked.
class TeacherHomeworkListScreen extends ConsumerWidget {
  const TeacherHomeworkListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(t.homework)),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: Text(t.giveHomework),
        onPressed: () => context.push('/teacher/homework/new'),
      ),
      body: PagedListView<GivenHomework>(
        value: ref.watch(myHomeworkProvider),
        empty: t.noHomeworkYet,
        onRefresh: () => ref.refresh(myHomeworkProvider.future),
        onLoadMore: () => ref.read(myHomeworkProvider.notifier).loadMore(),
        onRetry: () => ref.invalidate(myHomeworkProvider),
        itemBuilder: (context, hw) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text(hw.title),
            subtitle: Text(
              '${context.pick(hw.subjectEn, hw.subjectBn)} · ${hw.sectionLabel}\n'
              '${t.dueOn(context.day(hw.dueDate))}',
            ),
            isThreeLine: true,
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final s in [CheckStatus.done, CheckStatus.notDone])
                  if (hw.checked[s]! > 0)
                    Text('${s.label(t)} ${context.number(hw.checked[s]!)}', style: TextStyle(color: s.color, fontSize: 12)),
              ],
            ),
            onTap: () => context.push('/teacher/homework/${hw.id}'),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------- give

/// Give homework: subject, sections, title, what to do, due date, optional full marks
/// and photos (a page of the book).
class GiveHomeworkScreen extends ConsumerStatefulWidget {
  const GiveHomeworkScreen({super.key});

  @override
  ConsumerState<GiveHomeworkScreen> createState() => _GiveHomeworkScreenState();
}

class _GiveHomeworkScreenState extends ConsumerState<GiveHomeworkScreen> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _instructions = TextEditingController();
  final _fullMarks = TextEditingController();
  SubjectOption? _subject;
  final Set<String> _sectionIds = {};
  DateTime _due = DateUtils.dateOnly(DateTime.now()).add(const Duration(days: 1));
  final List<XFile> _photos = [];
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _instructions.dispose();
    _fullMarks.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = AppLocalizations.of(context);
    if (!_form.currentState!.validate()) return;
    if (_sectionIds.isEmpty) return _toast(context, t.chooseSection);

    setState(() => _saving = true);
    final api = ref.read(apiClientProvider)!;
    try {
      final created = await api.post<Map<String, dynamic>>('/homework', body: {
        'classSubjectId': _subject!.classSubjectId,
        'sectionIds': _sectionIds.toList(),
        'title': _title.text.trim(),
        'instructions': _instructions.text.trim(),
        'dueDate': _dayKey(_due),
        'fullMarks': _fullMarks.text.trim().isEmpty ? null : num.parse(_fullMarks.text.trim()),
      });
      final id = created['id'] as String;
      // the homework exists now: a photo that fails to upload can be added again from its page
      for (final photo in _photos) {
        try {
          await api.upload<void>('/homework/$id/attachments', photo.path, fileName: photo.name);
        } on ApiException catch (e) {
          if (mounted) _toast(context, _errorText(context, e));
        }
      }
      if (!mounted) return;
      ref.invalidate(myHomeworkProvider);
      _toast(context, t.homeworkGiven);
      context.pushReplacement('/teacher/homework/$id');
    } on ApiException catch (e) {
      if (mounted) _toast(context, _errorText(context, e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final options = ref.watch(homeworkOptionsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(t.giveHomework)),
      body: AsyncBody(
        value: options,
        onRetry: () => ref.invalidate(homeworkOptionsProvider),
        builder: (subjects) {
          if (subjects.isEmpty) {
            return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(t.noSubjectsToTeach, textAlign: TextAlign.center)));
          }
          final subject = _subject;
          return Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                DropdownButtonFormField<SubjectOption>(
                  initialValue: subject,
                  isExpanded: true,
                  decoration: InputDecoration(labelText: t.subjectLabel),
                  items: [
                    for (final s in subjects)
                      DropdownMenuItem(
                        value: s,
                        child: Text(
                          [s.className, context.pick(s.subjectEn, s.subjectBn), if (s.groupEn != null) context.pick(s.groupEn, s.groupBn)]
                              .join(' · '),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  validator: (v) => v == null ? t.required : null,
                  onChanged: (s) => setState(() {
                    _subject = s;
                    _sectionIds
                      ..clear()
                      // one section: nothing to choose
                      ..addAll(s != null && s.sections.length == 1 ? [s.sections.first.id] : const []);
                  }),
                ),
                if (subject != null && subject.sections.length > 1) ...[
                  const SizedBox(height: 16),
                  Text(t.sectionsLabel, style: Theme.of(context).textTheme.labelLarge),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final sec in subject.sections)
                        FilterChip(
                          label: Text(sec.sectionName ?? sec.className),
                          selected: _sectionIds.contains(sec.id),
                          onSelected: (on) => setState(() => on ? _sectionIds.add(sec.id) : _sectionIds.remove(sec.id)),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 16),
                TextFormField(
                  controller: _title,
                  decoration: InputDecoration(labelText: t.titleLabel),
                  maxLength: 200,
                  validator: (v) => (v == null || v.trim().length < 2) ? t.required : null,
                ),
                TextFormField(
                  controller: _instructions,
                  decoration: InputDecoration(labelText: t.instructionsOptional, alignLabelWithHint: true),
                  minLines: 3,
                  maxLines: 8,
                  maxLength: 5000,
                ),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.event),
                  title: Text(t.dueDateLabel),
                  subtitle: Text(context.weekdayDay(_dayKey(_due))),
                  trailing: const Icon(Icons.edit_calendar_outlined),
                  onTap: () async {
                    final today = DateUtils.dateOnly(DateTime.now());
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _due,
                      firstDate: today,
                      lastDate: today.add(const Duration(days: 180)),
                    );
                    if (picked != null) setState(() => _due = picked);
                  },
                ),
                TextFormField(
                  controller: _fullMarks,
                  decoration: InputDecoration(labelText: t.fullMarksOptional),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                  validator: (v) {
                    final text = v?.trim() ?? '';
                    if (text.isEmpty) return null;
                    final n = num.tryParse(text);
                    return n == null || n <= 0 || n > 1000 ? t.invalidNumber : null;
                  },
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final (i, _) in _photos.indexed)
                      InputChip(
                        avatar: const Icon(Icons.image_outlined),
                        label: Text('${t.photo} ${context.number(i + 1)}'),
                        onDeleted: () => setState(() => _photos.removeAt(i)),
                      ),
                    if (_photos.length < _maxFiles)
                      ActionChip(
                        avatar: const Icon(Icons.add_a_photo_outlined),
                        label: Text(t.addPhoto),
                        onPressed: () async {
                          final photo = await _pickPhoto(context);
                          if (photo != null) setState(() => _photos.add(photo));
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _saving ? null : _submit,
                  child: _saving
                      ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                      : Text(t.giveHomework),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// --------------------------------------------------------------------------- ticks

/// One homework for its teacher: what was given, then every student to tick.
class TeacherHomeworkScreen extends ConsumerStatefulWidget {
  const TeacherHomeworkScreen({super.key, required this.homeworkId});

  final String homeworkId;

  @override
  ConsumerState<TeacherHomeworkScreen> createState() => _TeacherHomeworkScreenState();
}

class _TeacherHomeworkScreenState extends ConsumerState<TeacherHomeworkScreen> {
  /// The ticks as the teacher has them now, by enrollment; reset from each sheet that loads.
  Map<String, CheckStatus?> _status = {};
  final Map<String, TextEditingController> _marks = {};
  HomeworkSheet? _loaded;
  bool _busy = false;

  @override
  void dispose() {
    for (final c in _marks.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _reset(HomeworkSheet sheet) {
    _loaded = sheet;
    _status = {for (final s in sheet.students) s.enrollmentId: s.status};
    for (final s in sheet.students) {
      (_marks[s.enrollmentId] ??= TextEditingController()).text = s.marks == null ? '' : '${s.marks}';
    }
  }

  bool _graded(CheckStatus? s) => s == CheckStatus.done || s == CheckStatus.late;

  Future<void> _save(HomeworkSheet sheet) async {
    final t = AppLocalizations.of(context);
    final full = sheet.fullMarks;
    final checks = <Map<String, dynamic>>[];
    for (final s in sheet.students) {
      final status = _status[s.enrollmentId];
      final text = _marks[s.enrollmentId]!.text.trim();
      final marks = full != null && _graded(status) && text.isNotEmpty ? num.tryParse(text) : null;
      if (marks != null && marks > full!) return _toast(context, t.marksUpTo(context.number(full)));
      if (status == s.status && marks == (_graded(status) ? s.marks : null)) continue;
      checks.add({
        'enrollmentId': s.enrollmentId,
        'status': status == null ? null : checkCode(status),
        if (full != null) 'marks': marks,
      });
    }
    if (checks.isEmpty) return _toast(context, t.checksSaved);

    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider)!.put<void>('/homework/${sheet.id}/checks', body: {'checks': checks});
      if (!mounted) return;
      _toast(context, t.checksSaved);
      ref.invalidate(homeworkSheetProvider(widget.homeworkId));
      ref.invalidate(myHomeworkProvider);
    } on ApiException catch (e) {
      if (mounted) _toast(context, _errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addPhoto() async {
    final photo = await _pickPhoto(context);
    if (photo == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider)!.upload<void>('/homework/${widget.homeworkId}/attachments', photo.path, fileName: photo.name);
      ref.invalidate(homeworkSheetProvider(widget.homeworkId));
    } on ApiException catch (e) {
      if (mounted) _toast(context, _errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final t = AppLocalizations.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(t.deleteHomeworkConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t.cancel)),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(t.delete)),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ref.read(apiClientProvider)!.delete<void>('/homework/${widget.homeworkId}');
      ref.invalidate(myHomeworkProvider);
      if (mounted) context.pop();
    } on ApiException catch (e) {
      if (mounted) _toast(context, _errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final value = ref.watch(homeworkSheetProvider(widget.homeworkId));
    final sheet = value.value;
    if (sheet != null && !identical(sheet, _loaded)) _reset(sheet);
    final canManage = sheet?.canManage ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(sheet == null ? t.homework : context.pick(sheet.subjectEn, sheet.subjectBn)),
        actions: [
          if (canManage)
            IconButton(icon: const Icon(Icons.delete_outline), tooltip: t.deleteHomework, onPressed: _busy ? null : _delete),
        ],
      ),
      floatingActionButton: canManage && sheet!.students.isNotEmpty
          ? FloatingActionButton.extended(
              icon: _busy
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check),
              label: Text(t.save),
              onPressed: _busy ? null : () => _save(sheet),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(homeworkSheetProvider(widget.homeworkId).future),
        child: AsyncBody(
          value: value,
          onRetry: () => ref.invalidate(homeworkSheetProvider(widget.homeworkId)),
          builder: (sheet) {
            final instructions = sheet.instructions;
            final full = sheet.fullMarks;
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                Text(sheet.title, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text('${sheet.sectionLabel} · ${t.dueOn(context.day(sheet.dueDate))}'
                    '${full == null ? '' : ' · ${t.fullMarks(context.number(full))}'}'),
                const Divider(height: 28),
                if (instructions != null && instructions.trim().isNotEmpty) NoticeText(instructions),
                if (sheet.attachments.isNotEmpty) AttachmentList(attachments: sheet.attachments),
                if (canManage && sheet.attachments.length < _maxFiles)
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton.icon(
                      icon: const Icon(Icons.add_a_photo_outlined),
                      label: Text(t.addPhoto),
                      onPressed: _busy ? null : _addPhoto,
                    ),
                  ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: Text(t.studentsCount(context.number(sheet.students.length)), style: Theme.of(context).textTheme.titleMedium)),
                    if (canManage)
                      TextButton(
                        // everyone not ticked yet did it
                        onPressed: () => setState(() {
                          for (final id in _status.keys) {
                            _status[id] ??= CheckStatus.done;
                          }
                        }),
                        child: Text(t.markAllDone),
                      ),
                  ],
                ),
                for (final s in sheet.students)
                  _TickRow(
                    student: s,
                    status: _status[s.enrollmentId],
                    marks: full == null ? null : _marks[s.enrollmentId],
                    enabled: canManage && !_busy,
                    // tapping the chosen tick again clears it
                    onChanged: (status) => setState(() => _status[s.enrollmentId] = _status[s.enrollmentId] == status ? null : status),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TickRow extends StatelessWidget {
  const _TickRow({required this.student, required this.status, required this.marks, required this.enabled, required this.onChanged});

  final HomeworkStudent student;
  final CheckStatus? status;

  /// null for homework without marks.
  final TextEditingController? marks;
  final bool enabled;
  final ValueChanged<CheckStatus> onChanged;

  static const _icons = {
    CheckStatus.done: Icons.check,
    CheckStatus.late: Icons.schedule,
    CheckStatus.notDone: Icons.close,
    CheckStatus.excused: Icons.remove,
  };

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final graded = status == CheckStatus.done || status == CheckStatus.late;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 32, child: Text(student.rollNumber ?? '-', style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(child: Text(context.pick(student.nameEn, student.nameBn), maxLines: 2, overflow: TextOverflow.ellipsis)),
          if (marks != null)
            SizedBox(
              width: 52,
              child: TextField(
                controller: marks,
                enabled: enabled && graded,
                textAlign: TextAlign.center,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                decoration: InputDecoration(isDense: true, hintText: t.marksShort, contentPadding: const EdgeInsets.symmetric(vertical: 8)),
              ),
            ),
          for (final s in CheckStatus.values)
            Padding(
              padding: const EdgeInsets.only(left: 4),
              child: Tooltip(
                message: s.label(t),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: enabled ? () => onChanged(s) : null,
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: s == status ? s.color : null,
                      border: Border.all(color: s.color.withValues(alpha: s == status ? 1 : 0.4)),
                    ),
                    child: Icon(_icons[s], size: 18, color: s == status ? Colors.white : s.color),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
