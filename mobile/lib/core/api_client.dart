import 'package:dio/dio.dart';

import 'config.dart';
import 'storage.dart';

/// A failed API call: the server's message, or `isNetwork` when the server couldn't be reached.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.isNetwork = false, this.detail});

  final String message;
  final int? statusCode;
  final bool isNetwork;

  /// What exactly went wrong (timeout, refused...), shown in debug builds only.
  final String? detail;

  factory ApiException.from(DioException e) {
    final response = e.response;
    if (response == null) {
      return ApiException('Network error', isNetwork: true, detail: '${e.type.name}: ${e.message ?? e.error}');
    }
    final data = response.data;
    final message = data is Map && data['message'] is String ? data['message'] as String : 'Something went wrong';
    return ApiException(message, statusCode: response.statusCode);
  }

  @override
  String toString() => message;
}

/// A bare client for one school: no login. For the school lookup and the auth endpoints.
Dio schoolDio(String schoolCode) => Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl(schoolCode),
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'X-Client': 'mobile', ...ApiConfig.hostHeader(schoolCode)},
      ),
    );

/// The logged-in client for one school. Adds the access token to every call; when the
/// server answers 401 it refreshes the session once and repeats the call.
class ApiClient {
  ApiClient({required String schoolCode, required this.tokens, required this.onSessionExpired})
      : _dio = schoolDio(schoolCode),
        _bare = schoolDio(schoolCode) {
    _dio.interceptors.add(InterceptorsWrapper(onRequest: _addToken, onError: _refreshOn401));
  }

  final Dio _dio;

  // the refresh call goes around the interceptors, so a refused refresh can't wait on itself
  final Dio _bare;
  final TokenStore tokens;

  /// The session is over (refresh refused): the app goes back to the login screen.
  final void Function() onSessionExpired;

  /// Calls that must never carry or refresh the session (login, logout).
  static const _noAuth = 'noAuth';
  static const _retried = 'retried';

  Future<bool>? _refreshing;

  /// GET, answering the response's `data`.
  Future<T> get<T>(String path, {Map<String, dynamic>? query}) =>
      _send(() => _dio.get<Map<String, dynamic>>(path, queryParameters: query));

  /// POST, answering the response's `data`.
  Future<T> post<T>(String path, {Object? body, bool noAuth = false}) => _send(
        () => _dio.post<Map<String, dynamic>>(path, data: body, options: Options(extra: {_noAuth: noAuth})),
      );

  /// PUT, answering the response's `data`.
  Future<T> put<T>(String path, {Object? body}) => _send(() => _dio.put<Map<String, dynamic>>(path, data: body));

  /// DELETE, answering the response's `data`.
  Future<T> delete<T>(String path) => _send(() => _dio.delete<Map<String, dynamic>>(path));

  /// Uploads one file from the phone in the "file" field (multipart), answering `data`.
  Future<T> upload<T>(String path, String filePath, {String? fileName}) => _send(
        () async => _dio.post<Map<String, dynamic>>(
          path,
          data: FormData.fromMap({'file': await MultipartFile.fromFile(filePath, filename: fileName)}),
          // a photo over a slow connection takes a while
          options: Options(sendTimeout: const Duration(minutes: 2)),
        ),
      );

  Future<T> _send<T>(Future<Response<Map<String, dynamic>>> Function() call) async {
    try {
      final response = await call();
      return response.data?['data'] as T;
    } on DioException catch (e) {
      throw ApiException.from(e);
    }
  }

  void _addToken(RequestOptions options, RequestInterceptorHandler handler) {
    final token = tokens.accessToken;
    if (options.extra[_noAuth] != true && token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _refreshOn401(DioException e, ErrorInterceptorHandler handler) async {
    final options = e.requestOptions;
    final canRefresh = e.response?.statusCode == 401 && options.extra[_noAuth] != true && options.extra[_retried] != true;
    if (!canRefresh) return handler.next(e);

    if (!await refresh()) return handler.next(e);

    try {
      options.extra[_retried] = true;
      options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
      handler.resolve(await _dio.fetch(options));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  /// One refresh at a time: calls that fail together share it. Sending two refreshes with
  /// the same token would make the server answer the second with 409.
  Future<bool> refresh() => _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<bool> _doRefresh() async {
    final refreshToken = tokens.refreshToken;
    if (refreshToken == null) return false;
    try {
      final data = await _send<Map<String, dynamic>>(
        () => _bare.post<Map<String, dynamic>>('/auth/school/refresh', data: {'refreshToken': refreshToken}),
      );
      await tokens.save(data['tokens'] as Map<String, dynamic>);
      return true;
    } on ApiException catch (e) {
      // refused (expired, logged out elsewhere, removed from the school): the session is over.
      // No network: keep the tokens and try again on the next call.
      if (e.statusCode == 401 || e.statusCode == 403) {
        await tokens.clear();
        onSessionExpired();
      }
      return false;
    }
  }
}
