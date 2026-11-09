import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'config.dart';

/// A newer app than this one, from the latest GitHub Release ("app-v1.0.1-b42").
class AppUpdate {
  const AppUpdate({required this.version});

  /// What users see: "1.0.1".
  final String version;
}

final _tag = RegExp(r'^app-v(.+)-b(\d+)$');

/// This app's version and build ("1.0.0", "6"), for Settings and error details.
final appInfoProvider = FutureProvider<PackageInfo>((ref) => PackageInfo.fromPlatform());

/// Checked once per launch. null: up to date, offline, or a debug build (whose build number
/// means nothing). Never fails: a check that can't be done just shows nothing.
final appUpdateProvider = FutureProvider<AppUpdate?>((ref) async {
  if (kDebugMode) return null;
  try {
    final info = await PackageInfo.fromPlatform();
    final response = await Dio(BaseOptions(connectTimeout: const Duration(seconds: 10), receiveTimeout: const Duration(seconds: 10)))
        .get<Map<String, dynamic>>(AppRelease.latestApi, options: Options(headers: {'Accept': 'application/vnd.github+json'}));
    final match = _tag.firstMatch(response.data?['tag_name'] as String? ?? '');
    if (match == null) return null;
    final latest = int.parse(match.group(2)!);
    final mine = int.tryParse(info.buildNumber) ?? 0;
    return latest > mine ? AppUpdate(version: match.group(1)!) : null;
  } catch (_) {
    return null;
  }
});

/// The banner was closed: not shown again until the next launch.
class UpdateDismissed extends Notifier<bool> {
  @override
  bool build() => false;

  void dismiss() => state = true;
}

final updateDismissedProvider = NotifierProvider<UpdateDismissed, bool>(UpdateDismissed.new);
