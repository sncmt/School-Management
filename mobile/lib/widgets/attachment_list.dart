import 'package:flutter/material.dart';

import '../core/format.dart';
import '../core/open_link.dart';

/// A file attached to homework or a notice. `url` is a signed link that expires, so it is
/// only used straight after the list was loaded.
class Attachment {
  Attachment({required this.name, required this.contentType, required this.size, this.url});

  final String name;
  final String contentType;
  final int size;

  /// null when the file can't be linked (storage switched off).
  final String? url;

  factory Attachment.fromJson(Map<String, dynamic> json) => Attachment(
        name: json['name'] as String,
        contentType: json['contentType'] as String? ?? '',
        size: json['size'] as int? ?? 0,
        url: json['url'] as String?,
      );

  static List<Attachment> listFrom(Object? json) =>
      [for (final a in (json as List?) ?? const []) Attachment.fromJson(a as Map<String, dynamic>)];
}

class AttachmentList extends StatelessWidget {
  const AttachmentList({super.key, required this.attachments});

  final List<Attachment> attachments;

  IconData _icon(String type) => type.startsWith('image/')
      ? Icons.image_outlined
      : type == 'application/pdf'
          ? Icons.picture_as_pdf_outlined
          : Icons.insert_drive_file_outlined;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final a in attachments)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(_icon(a.contentType)),
              title: Text(a.name, maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(context.fileSize(a.size)),
              trailing: const Icon(Icons.open_in_new),
              enabled: a.url != null,
              onTap: a.url == null ? null : () => openLink(context, a.url!),
            ),
          ),
      ],
    );
  }
}
