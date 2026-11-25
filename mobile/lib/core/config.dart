/// Where a school's API lives.
///
/// Release: `https://<code>.sncmt.com/api/v1`, the school's own site, whose Next.js server
/// forwards /api/v1 to Express. The server learns the school from that host name.
///
/// Development: run with `--dart-define=API_ORIGIN=http://localhost:5000` after
/// `adb reverse tcp:5000 tcp:5000`. Express is then called directly, and the school goes in
/// the Host header (`<code>.localhost`), the same way the browser reaches abc.localhost.
class ApiConfig {
  static const devOrigin = String.fromEnvironment('API_ORIGIN');
  static const rootDomain = String.fromEnvironment('ROOT_DOMAIN', defaultValue: 'sncmt.com');

  static bool get isDev => devOrigin.isNotEmpty;

  static String baseUrl(String schoolCode) =>
      isDev ? '$devOrigin/api/v1' : 'https://$schoolCode.$rootDomain/api/v1';

  static Map<String, String> hostHeader(String schoolCode) =>
      isDev ? {'Host': '$schoolCode.localhost'} : const {};

  /// The school's website, as people type it.
  static String website(String schoolCode) => '$schoolCode.$rootDomain';
}

/// Where the app itself is published until it is on Google Play: the releases of the public repo
/// sncmt/sncmt-app, which holds only the app files (.github/workflows/build-android-apk.yml).
/// The website's /app page links here too.
class AppRelease {
  static const repo = 'sncmt/sncmt-app';
  static const latestApi = 'https://api.github.com/repos/$repo/releases/latest';
  static const downloadUrl = 'https://github.com/$repo/releases/latest/download/sncmt.apk';
}
