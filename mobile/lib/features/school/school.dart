import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/storage.dart';

/// The school this phone uses, as its public site describes it.
class School {
  const School({required this.code, required this.nameEn, this.nameBn, this.accentColor, this.logo});

  final String code;
  final String nameEn;
  final String? nameBn;
  final String? accentColor;

  /// A signed link that expires: shown on the screens that just fetched it, never relied on later.
  final String? logo;

  String name(Locale locale) => locale.languageCode == 'bn' && (nameBn?.isNotEmpty ?? false) ? nameBn! : nameEn;

  factory School.fromSite(Map<String, dynamic> site) => School(
        code: site['subdomain'] as String,
        nameEn: site['nameEn'] as String,
        nameBn: site['nameBn'] as String?,
        accentColor: site['accentColor'] as String?,
        logo: site['logo'] as String?,
      );

  factory School.fromJson(Map<String, dynamic> json) => School(
        code: json['code'] as String,
        nameEn: json['nameEn'] as String,
        nameBn: json['nameBn'] as String?,
        accentColor: json['accentColor'] as String?,
      );

  Map<String, dynamic> toJson() => {'code': code, 'nameEn': nameEn, 'nameBn': nameBn, 'accentColor': accentColor};
}

/// "ABC", " abc.sncmt.com ", "https://abc.sncmt.com/login" -> "abc"; null when it can't be a code.
String? normalizeSchoolCode(String input) {
  var text = input.trim().toLowerCase().replaceFirst(RegExp(r'^https?://'), '');
  text = text.split('/').first.split('.').first;
  return RegExp(r'^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$').hasMatch(text) ? text : null;
}

/// The school's public site info (name, logo, colour), or null when no active school has the code.
Future<School?> lookupSchool(String code) async {
  try {
    final response = await schoolDio(code).get<Map<String, dynamic>>('/school/site/$code');
    return School.fromSite(response.data!['data'] as Map<String, dynamic>);
  } on DioException catch (e) {
    if (e.response?.statusCode == 404) return null;
    throw ApiException.from(e);
  }
}

/// The school chosen on this phone; null until the user enters its code.
class SchoolController extends Notifier<School?> {
  @override
  School? build() {
    final saved = ref.read(prefsProvider).getString(PrefKeys.school);
    return saved == null ? null : School.fromJson(jsonDecode(saved) as Map<String, dynamic>);
  }

  Future<void> choose(School school) async {
    await ref.read(prefsProvider).setString(PrefKeys.school, jsonEncode(school.toJson()));
    state = school;
  }

  Future<void> forget() async {
    await ref.read(prefsProvider).remove(PrefKeys.school);
    state = null;
  }
}

final schoolProvider = NotifierProvider<SchoolController, School?>(SchoolController.new);
