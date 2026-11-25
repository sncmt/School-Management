import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../core/open_link.dart';

/// A notice's (or homework's) text, as the website shows it (client NoticeText.tsx): plain
/// text with a few marks, never HTML. A blank line between paragraphs, **bold**, a line
/// starting with "- " is a list item, and web links can be tapped.
class NoticeText extends StatefulWidget {
  const NoticeText(this.body, {super.key});

  final String body;

  @override
  State<NoticeText> createState() => _NoticeTextState();
}

final _inline = RegExp(r'''(\*\*[^*\n]+\*\*|https?://[^\s<>()]+[^\s<>().,;:!?'"])''');
final _item = RegExp(r'^\s*[-•]\s+');

class _NoticeTextState extends State<NoticeText> {
  // one per link on screen; replaced on every build and released with the widget
  final List<TapGestureRecognizer> _taps = [];

  void _releaseTaps() {
    for (final tap in _taps) {
      tap.dispose();
    }
    _taps.clear();
  }

  @override
  void dispose() {
    _releaseTaps();
    super.dispose();
  }

  List<InlineSpan> _spans(String text, Color linkColor) {
    final spans = <InlineSpan>[];
    var at = 0;
    for (final match in _inline.allMatches(text)) {
      if (match.start > at) spans.add(TextSpan(text: text.substring(at, match.start)));
      final part = match.group(0)!;
      if (part.startsWith('**')) {
        spans.add(TextSpan(text: part.substring(2, part.length - 2), style: const TextStyle(fontWeight: FontWeight.bold)));
      } else {
        final tap = TapGestureRecognizer()..onTap = () => openLink(context, part);
        _taps.add(tap);
        spans.add(TextSpan(
          text: part,
          style: TextStyle(color: linkColor, decoration: TextDecoration.underline),
          recognizer: tap,
        ));
      }
      at = match.end;
    }
    if (at < text.length) spans.add(TextSpan(text: text.substring(at)));
    return spans;
  }

  /// Paragraphs split at blank lines; inside one, each run of "- " lines is a list.
  List<({bool list, List<String> rows})> _blocks() {
    final blocks = <({bool list, List<String> rows})>[];
    final body = widget.body.replaceAll('\r\n', '\n').trim();
    for (final chunk in body.split(RegExp(r'\n\s*\n'))) {
      ({bool list, List<String> rows})? current;
      for (final row in chunk.split('\n')) {
        final list = _item.hasMatch(row);
        final text = list ? row.replaceFirst(_item, '') : row;
        if (current != null && current.list == list) {
          current.rows.add(text);
        } else {
          current = (list: list, rows: [text]);
          blocks.add(current);
        }
      }
    }
    return blocks;
  }

  @override
  Widget build(BuildContext context) {
    _releaseTaps();
    final style = Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.5);
    final linkColor = Theme.of(context).colorScheme.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final block in _blocks())
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: block.list
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final row in block.rows)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('•  ', style: style),
                            Expanded(child: Text.rich(TextSpan(children: _spans(row, linkColor)), style: style)),
                          ],
                        ),
                    ],
                  )
                : Text.rich(TextSpan(children: _spans(block.rows.join('\n'), linkColor)), style: style),
          ),
      ],
    );
  }
}
