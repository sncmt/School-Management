import 'package:flutter_test/flutter_test.dart';
import 'package:sncmt/features/school/school.dart';

void main() {
  group('normalizeSchoolCode', () {
    test('accepts the code however it is typed', () {
      expect(normalizeSchoolCode('abc'), 'abc');
      expect(normalizeSchoolCode('  ABC '), 'abc');
      expect(normalizeSchoolCode('abc.sncmt.com'), 'abc');
      expect(normalizeSchoolCode('https://abc.sncmt.com/login'), 'abc');
      expect(normalizeSchoolCode('my-school2'), 'my-school2');
    });

    test('refuses what can never be a code', () {
      expect(normalizeSchoolCode(''), isNull);
      expect(normalizeSchoolCode('a b'), isNull);
      expect(normalizeSchoolCode('-abc'), isNull);
      expect(normalizeSchoolCode('স্কুল'), isNull);
    });
  });
}
