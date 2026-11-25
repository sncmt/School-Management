import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/auth_controller.dart';
import '../features/guardian/family.dart';
import '../features/language/locale_controller.dart';
import '../features/school/school.dart';
import '../router.dart';
import 'api_client.dart';

/// For the snack bar of a notification that arrives while the app is open.
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// Push notifications. While someone is logged in, this phone is registered with the school's
/// server (again when Firebase changes the token or the user changes language); logging out
/// stops them. The server writes the text; tapping a notification opens what it is about.
class PushController {
  PushController(this._ref) {
    _subscriptions = [
      // The classic registration token, which the server sends to (firebase-admin sendEach).
      // firebase_messaging 17 prefers installation IDs (register / onRegistered); moving to them
      // means sending to FIDs on the server too.
      // ignore: deprecated_member_use
      FirebaseMessaging.instance.onTokenRefresh.listen((_) => _register()),
      FirebaseMessaging.onMessageOpenedApp.listen(_open),
      FirebaseMessaging.onMessage.listen(_showInApp),
    ];
    _ref.listen(authProvider, (_, next) => _onAuth(next.value), fireImmediately: true);
    _ref.listen(localeProvider, (_, _) => _register());
    // tapped while the app was closed: opened once the session is checked
    FirebaseMessaging.instance.getInitialMessage().then((m) {
      if (m != null) _open(m);
    });
  }

  final Ref _ref;
  late final List<StreamSubscription<Object?>> _subscriptions;

  /// Where this phone is registered: the school's code and the token, to remove it on logout
  /// (when the school may already be forgotten).
  String? _schoolCode;
  String? _token;

  /// A tapped notification waiting for the login check to finish.
  RemoteMessage? _pending;

  void dispose() {
    for (final s in _subscriptions) {
      s.cancel();
    }
  }

  bool get _loggedIn => _ref.read(authProvider).value?.me != null;

  void _onAuth(AuthState? auth) {
    if (auth?.me != null) {
      _register();
      final pending = _pending;
      _pending = null;
      // after the router has moved on to the home screen
      if (pending != null) WidgetsBinding.instance.addPostFrameCallback((_) => _open(pending));
    } else if (auth != null) {
      _unregister();
    }
  }

  Future<void> _register() async {
    if (!_loggedIn) return;
    final api = _ref.read(apiClientProvider);
    final school = _ref.read(schoolProvider);
    if (api == null || school == null) return;
    try {
      // Android 13+ asks the user once; before that, notifications are simply on
      await FirebaseMessaging.instance.requestPermission();
      // ignore: deprecated_member_use (the registration token: see the constructor)
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      final language = (_ref.read(localeProvider)?.languageCode ?? 'bn') == 'en' ? 'EN' : 'BN';
      await api.post<void>('/notification/devices', body: {'token': token, 'language': language, 'platform': 'android'});
      _token = token;
      _schoolCode = school.code;
    } catch (error) {
      // no network, no Google Play services: tried again on the next login or language change
      debugPrint('[push] register failed: $error');
    }
  }

  Future<void> _unregister() async {
    final token = _token;
    final code = _schoolCode;
    _token = null;
    _schoolCode = null;
    if (token == null || code == null) return;
    try {
      // no login needed: the session is already over
      await schoolDio(code).post<void>('/notification/devices/remove', data: {'token': token});
    } catch (error) {
      debugPrint('[push] unregister failed: $error');
    }
  }

  /// The screen a notification is about: the child's attendance, payments, or their page.
  String? _routeOf(RemoteMessage m) {
    final studentId = m.data['studentId'] as String?;
    if (studentId == null || studentId.isEmpty) return null;
    return switch (m.data['type']) {
      'STUDENT_PRESENT' || 'STUDENT_ABSENT' || 'STUDENT_LATE' => '/child/$studentId/attendance',
      'PAYMENT_RECEIVED' || 'PAYMENT_CANCELLED' || 'FEE_DUE' => '/child/$studentId/payments',
      _ => '/child/$studentId',
    };
  }

  void _open(RemoteMessage m) {
    if (!_loggedIn) {
      _pending = m;
      return;
    }
    _ref.invalidate(familyHomeProvider);
    final route = _routeOf(m);
    if (route != null) _ref.read(routerProvider).push(route);
  }

  /// The app is open: Android shows nothing by itself, so a snack bar does, and the home's data refreshes.
  void _showInApp(RemoteMessage m) {
    _ref.invalidate(familyHomeProvider);
    final text = m.notification?.body;
    if (text == null) return;
    final route = _routeOf(m);
    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Text(text),
        duration: const Duration(seconds: 6),
        action: route == null
            ? null
            : SnackBarAction(label: '›', onPressed: () => _ref.read(routerProvider).push(route)),
      ),
    );
  }
}

final pushProvider = Provider<PushController>((ref) {
  final controller = PushController(ref);
  ref.onDispose(controller.dispose);
  return controller;
});
