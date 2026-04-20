import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter_app/src/models/domain_models.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class TraceabilityService {
  TraceabilityService({
    http.Client? httpClient,
    this.backendBaseUrl = 'http://localhost:4000/api/v1',
    this.sepoliaRpcUrl =
        'https://sepolia.infura.io/v3/f95db635bb254bfbae4a945cc1492f3f',
    this.registryAddress = '0x83a81b551f111c9340aa813f92465d2cc81d8994',
    this.lifecycleAddress = '0x31f5c2712961e3ffc559bfda45b620560752839b',
  }) : _httpClient = httpClient ?? http.Client();

  final http.Client _httpClient;
  final String backendBaseUrl;
  final String sepoliaRpcUrl;
  final String registryAddress;
  final String lifecycleAddress;

  final Map<String, ProductRecord> _products = <String, ProductRecord>{};
  final Map<String, String> _productIdentifierToQr = <String, String>{};
  final Map<String, Set<String>> _verifiedTxHashesByProduct =
      <String, Set<String>>{};
  final Map<String, List<PublicScanEvent>> _publicScansByQr =
      <String, List<PublicScanEvent>>{};

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  String? _authToken;
  String? _authUserId;

  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'auth_user_id';

  ProductRecord? getProduct(String id) {
    final String key = id.trim();
    if (key.isEmpty) return null;
    final String? qr = _productIdentifierToQr[key];
    if (qr != null && qr.isNotEmpty) return _products[qr];
    return _products[key];
  }

  String publicProductUrl(String qrId) {
    String base = backendBaseUrl;
    base = base.replaceFirst(RegExp(r'/api/v1/?$'), '');
    return '$base/public/qr/$qrId';
  }

  Future<void> checkBackendHealth() async {
    final Uri uri = Uri.parse('$backendBaseUrl/health');
    final http.Response response = await _httpClient
        .get(uri)
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) {
      throw StateError('Backend health returned ${response.statusCode}');
    }

    final Map<String, dynamic> json =
        jsonDecode(response.body) as Map<String, dynamic>;
    if (json['ok'] != true) {
      throw StateError('Backend health response invalid');
    }
  }

  Future<Map<String, dynamic>?> getSystemHealth() async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/health/details');
      final http.Response response = await _httpClient.get(uri);
      if (response.statusCode != 200) return null;
      final Map<String, dynamic> json =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (json['ok'] != true) return null;
      return json;
    } catch (_) {
      return null;
    }
  }

  Future<String> signupWithEmailVerification({
    required String name,
    required String email,
    required String role,
    required String orgId,
    required String password,
  }) async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/auth/signup');
      final http.Response response = await _httpClient.post(
        uri,
        headers: <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, String>{
          'name': name.trim(),
          'email': email.trim().toLowerCase(),
          'role': role,
          'orgId': orgId.trim(),
          'password': password,
        }),
      );

      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data =
            (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        return (data['message'] as String?) ??
            'Signup successful. Check your email.';
      }

      return (body['message'] as String?) ??
          'Signup failed (${response.statusCode}).';
    } catch (_) {
      return 'Backend unreachable. Check server connection and try again.';
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/auth/login');
      final http.Response response = await _httpClient.post(
        uri,
        headers: <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, String>{
          'email': email.trim().toLowerCase(),
          'password': password,
        }),
      );

      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data =
            (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        _authToken = data['token'] as String?;
        final Map<String, dynamic> user =
            (data['user'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        _authUserId = user['id'] as String?;
        await _persistSession(token: _authToken, userId: _authUserId);
        return <String, dynamic>{
          'ok': true,
          'token': data['token'],
          'user': data['user'],
        };
      }

      return <String, dynamic>{
        'ok': false,
        'message': (body['message'] as String?) ?? 'Login failed',
      };
    } catch (_) {
      return <String, dynamic>{
        'ok': false,
        'message':
            'Backend unreachable. Check server connection and try again.',
      };
    }
  }

  Future<void> logout() async {
    _authToken = null;
    _authUserId = null;
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userIdKey);
  }

  Future<Map<String, dynamic>?> restoreSession() async {
    final String? token = await _secureStorage.read(key: _tokenKey);
    if (token == null || token.isEmpty) return null;
    _authToken = token;
    _authUserId = await _secureStorage.read(key: _userIdKey);

    Map<String, dynamic>? profile = await getProfile();
    if (profile != null) return profile;
    final bool refreshed = await refreshToken();
    if (!refreshed) return null;
    profile = await getProfile();
    return profile;
  }

  Future<Map<String, dynamic>?> getProfile() async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/auth/me');
      http.Response response = await _httpClient.get(
        uri,
        headers: _authorizedHeaders(),
      );
      if (response.statusCode == 401 && await refreshToken()) {
        response = await _httpClient.get(uri, headers: _authorizedHeaders());
      }
      if (response.statusCode != 200) return null;
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (body['ok'] != true) return null;
      return body['data'] as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  Future<bool> refreshToken() async {
    if (_authToken == null || _authToken!.isEmpty) return false;
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/auth/refresh');
      final http.Response response = await _httpClient.post(
        uri,
        headers: _authorizedHeaders(),
      );
      if (response.statusCode != 200) return false;
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (body['ok'] != true) return false;
      final Map<String, dynamic> data =
          (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      _authToken = data['token'] as String?;
      final Map<String, dynamic> user =
          (data['user'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      _authUserId = user['id'] as String?;
      await _persistSession(token: _authToken, userId: _authUserId);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> listOrgUsers() async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/org/users');
      http.Response response = await _httpClient.get(
        uri,
        headers: _authorizedHeaders(),
      );
      if (response.statusCode == 401 && await refreshToken()) {
        response = await _httpClient.get(uri, headers: _authorizedHeaders());
      }
      if (response.statusCode != 200) return <Map<String, dynamic>>[];
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (body['ok'] != true) return <Map<String, dynamic>>[];
      final List<dynamic> data = body['data'] as List<dynamic>? ?? <dynamic>[];
      return data.map((dynamic item) => item as Map<String, dynamic>).toList();
    } catch (_) {
      return <Map<String, dynamic>>[];
    }
  }

  Future<bool> setUserActive({
    required String userId,
    required bool isActive,
  }) async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/org/users/$userId/active');
      http.Response response = await _httpClient.patch(
        uri,
        headers: _authorizedHeaders(),
        body: jsonEncode(<String, dynamic>{'isActive': isActive}),
      );
      if (response.statusCode == 401 && await refreshToken()) {
        response = await _httpClient.patch(
          uri,
          headers: _authorizedHeaders(),
          body: jsonEncode(<String, dynamic>{'isActive': isActive}),
        );
      }
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  Future<List<InternalChatMessage>> listInternalChatMessages({
    String? qrId,
    int limit = 50,
  }) async {
    try {
      final String queryQr = (qrId == null || qrId.trim().isEmpty)
          ? ''
          : '&qrId=${Uri.encodeQueryComponent(qrId.trim())}';
      final Uri uri = Uri.parse(
        '$backendBaseUrl/chat/messages?limit=$limit$queryQr',
      );
      http.Response response = await _httpClient.get(
        uri,
        headers: _authorizedHeaders(),
      );
      if (response.statusCode == 401 && await refreshToken()) {
        response = await _httpClient.get(uri, headers: _authorizedHeaders());
      }
      if (response.statusCode != 200) return <InternalChatMessage>[];
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (body['ok'] != true) return <InternalChatMessage>[];
      final List<dynamic> rows = body['data'] as List<dynamic>? ?? <dynamic>[];
      return rows.map((dynamic item) {
        final Map<String, dynamic> raw = item as Map<String, dynamic>;
        final String? qr = raw['qrId'] as String?;
        return InternalChatMessage(
          id: (raw['id'] as String?) ?? (raw['_id'] as String?) ?? '',
          qrId: qr,
          byUserId: (raw['byUserId'] as String?) ?? '',
          byName: raw['byName'] as String? ?? 'User',
          byRole: actorRoleFromKey(raw['byRole'] as String? ?? 'customer'),
          text: raw['text'] as String? ?? '',
          createdAt:
              DateTime.tryParse(raw['createdAt'] as String? ?? '') ??
              DateTime.now(),
          seenByCount: (raw['seenByCount'] as num?)?.toInt() ?? 0,
          seenByMe: raw['seenByMe'] == true,
        );
      }).toList();
    } catch (_) {
      return <InternalChatMessage>[];
    }
  }

  Future<String> sendInternalChatMessage({
    required String text,
    String? qrId,
  }) async {
    try {
      final Map<String, dynamic> payload = <String, dynamic>{'text': text};
      if (qrId != null && qrId.trim().isNotEmpty) {
        payload['qrId'] = qrId.trim();
      }

      final Uri uri = Uri.parse('$backendBaseUrl/chat/messages');
      http.Response response = await _httpClient.post(
        uri,
        headers: _authorizedHeaders(),
        body: jsonEncode(payload),
      );
      if (response.statusCode == 401 && await refreshToken()) {
        response = await _httpClient.post(
          uri,
          headers: _authorizedHeaders(),
          body: jsonEncode(payload),
        );
      }
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return 'Message sent.';
      }
      return (body['message'] as String?) ??
          'Could not send message (${response.statusCode}).';
    } catch (_) {
      return 'Backend unreachable. Check server connection and try again.';
    }
  }

  Future<String> requestPasswordReset({required String email}) async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/auth/request-password-reset');
      final http.Response response = await _httpClient.post(
        uri,
        headers: <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, String>{'email': email.trim().toLowerCase()}),
      );
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data =
            (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        return (data['message'] as String?) ??
            'If the account exists, a reset link has been sent.';
      }
      return (body['message'] as String?) ??
          'Reset request failed (${response.statusCode}).';
    } catch (_) {
      return 'Backend unreachable. Check server connection and try again.';
    }
  }

  Future<String> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/auth/reset-password');
      final http.Response response = await _httpClient.post(
        uri,
        headers: <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, String>{
          'token': token,
          'password': newPassword,
        }),
      );
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data =
            (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        return (data['message'] as String?) ??
            'Password reset successful. You can now log in.';
      }
      return (body['message'] as String?) ??
          'Reset failed (${response.statusCode}).';
    } catch (_) {
      return 'Backend unreachable. Check server connection and try again.';
    }
  }

  Future<String> resendVerificationEmail({required String email}) async {
    try {
      final Uri uri = Uri.parse('$backendBaseUrl/auth/resend-verification');
      final http.Response response = await _httpClient.post(
        uri,
        headers: <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, String>{'email': email.trim().toLowerCase()}),
      );

      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data =
            (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        return (data['message'] as String?) ?? 'Verification email sent.';
      }

      return (body['message'] as String?) ??
          'Resend failed (${response.statusCode}).';
    } catch (_) {
      return 'Backend unreachable. Check server connection and try again.';
    }
  }

  Future<String> verifyEmailToken({required String token}) async {
    try {
      final Uri uri = Uri.parse(
        '$backendBaseUrl/auth/verify-email?token=${Uri.encodeQueryComponent(token)}',
      );
      final http.Response response = await _httpClient.get(uri);
      final Map<String, dynamic> body =
          jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final Map<String, dynamic> data =
            (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
        return (data['message'] as String?) ?? 'Email verified successfully.';
      }
      return (body['message'] as String?) ?? 'Verification failed.';
    } catch (_) {
      return 'Backend unreachable. Check server connection and try again.';
    }
  }

  Future<String> processActorScan({
    required UserAccount account,
    required String productId,
    required GeoPoint location,
    Geofence? allowedAreaOverride,
    int? productIdOnChain,
    String? productName,
    String? serialNumber,
    String? brand,
    String? category,
    String? color,
    String? description,
    bool finalizeSale = false,
  }) async {
    final Geofence allowedArea = allowedAreaOverride ?? account.allowedArea;
    if (!allowedArea.contains(location)) {
      return 'Denied: you are outside ${allowedArea.label}.';
    }
    if (_authToken == null && _authUserId == null) {
      return 'Unauthorized. Please login first.';
    }

    try {
      if (account.role == ActorRole.manufacturer) {
        if (productName == null || productName.trim().isEmpty) {
          return 'Product name is required for registration.';
        }
        final int chainId =
            productIdOnChain ??
            int.tryParse(productId) ??
            _deterministicOnChainId(productId);
        final http.Response response = await _httpClient.post(
          Uri.parse('$backendBaseUrl/products/register'),
          headers: _authorizedHeaders(),
          body: jsonEncode(<String, dynamic>{
            'qrId': productId,
            'productIdOnChain': chainId,
            'name': productName.trim(),
            if (serialNumber != null && serialNumber.trim().isNotEmpty)
              'serialNumber': serialNumber.trim(),
            if (brand != null && brand.trim().isNotEmpty) 'brand': brand.trim(),
            if (category != null && category.trim().isNotEmpty)
              'category': category.trim(),
            if (color != null && color.trim().isNotEmpty) 'color': color.trim(),
            if (description != null && description.trim().isNotEmpty)
              'description': description.trim(),
            'longitude': location.lng,
            'latitude': location.lat,
          }),
        );
        return await _handleActorApiResponseWithRetry(
          response,
          () => _httpClient.post(
            Uri.parse('$backendBaseUrl/products/register'),
            headers: _authorizedHeaders(),
            body: jsonEncode(<String, dynamic>{
              'qrId': productId,
              'productIdOnChain': chainId,
              'name': productName.trim(),
              if (serialNumber != null && serialNumber.trim().isNotEmpty)
                'serialNumber': serialNumber.trim(),
              if (brand != null && brand.trim().isNotEmpty)
                'brand': brand.trim(),
              if (category != null && category.trim().isNotEmpty)
                'category': category.trim(),
              if (color != null && color.trim().isNotEmpty)
                'color': color.trim(),
              if (description != null && description.trim().isNotEmpty)
                'description': description.trim(),
              'longitude': location.lng,
              'latitude': location.lat,
            }),
          ),
        );
      }

      if (account.role == ActorRole.distributor) {
        final http.Response response = await _httpClient.post(
          Uri.parse('$backendBaseUrl/products/transfer'),
          headers: _authorizedHeaders(),
          body: jsonEncode(<String, dynamic>{
            'qrId': productId,
            'longitude': location.lng,
            'latitude': location.lat,
          }),
        );
        return await _handleActorApiResponseWithRetry(
          response,
          () => _httpClient.post(
            Uri.parse('$backendBaseUrl/products/transfer'),
            headers: _authorizedHeaders(),
            body: jsonEncode(<String, dynamic>{
              'qrId': productId,
              'longitude': location.lng,
              'latitude': location.lat,
            }),
          ),
        );
      }

      if (account.role == ActorRole.reseller) {
        final String endpoint = finalizeSale
            ? '$backendBaseUrl/products/finalize-sale'
            : '$backendBaseUrl/products/transfer';
        final http.Response response = await _httpClient.post(
          Uri.parse(endpoint),
          headers: _authorizedHeaders(),
          body: jsonEncode(<String, dynamic>{
            'qrId': productId,
            'longitude': location.lng,
            'latitude': location.lat,
          }),
        );
        return await _handleActorApiResponseWithRetry(
          response,
          () => _httpClient.post(
            Uri.parse(endpoint),
            headers: _authorizedHeaders(),
            body: jsonEncode(<String, dynamic>{
              'qrId': productId,
              'longitude': location.lng,
              'latitude': location.lat,
            }),
          ),
        );
      }

      return 'Customers cannot write blockchain events.';
    } catch (_) {
      return 'Backend unreachable. Check server connection and try again.';
    }
  }

  List<ProductRecord> listProducts() =>
      _products.values.toList()..sort((a, b) => b.id.compareTo(a.id));

  bool isEventVerifiedOnChain({
    required String productId,
    required LifecycleEvent event,
  }) {
    final Set<String> verified =
        _verifiedTxHashesByProduct[productId] ?? <String>{};
    return verified.contains(event.txHash.toLowerCase());
  }

  List<PublicScanEvent> publicScansFor(String qrId) =>
      _publicScansByQr[qrId] ?? <PublicScanEvent>[];

  Future<String> registerPublicScan({
    required String identifier,
    required GeoPoint location,
  }) async {
    try {
      final http.Response scanResponse = await _httpClient.post(
        Uri.parse('$backendBaseUrl/scans/public'),
        headers: <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, dynamic>{
          'identifier': identifier,
          'longitude': location.lng,
          'latitude': location.lat,
        }),
      );
      if (scanResponse.statusCode < 200 || scanResponse.statusCode >= 300) {
        return 'Scan failed (${scanResponse.statusCode}).';
      }

      final ProductRecord? record = await _fetchHistoryFromBackend(identifier);
      if (record == null) {
        await _fetchPublicScanHistory(identifier);
        return 'Unknown product identifier.';
      }
      final int verifiedCount = await _verifyEventsOnChain(record);
      await _fetchPublicScanHistory(record.id);
      if (verifiedCount == record.events.length) {
        return 'Product verified on-chain.';
      }
      return 'Warning: ${record.events.length - verifiedCount} event(s) not verified on-chain.';
    } catch (_) {
      return 'Verification failed: could not reach backend or blockchain.';
    }
  }

  Future<void> _fetchPublicScanHistory(String identifier) async {
    final Uri uri = Uri.parse(
      '$backendBaseUrl/scans/public/${Uri.encodeComponent(identifier)}/history',
    );
    final http.Response response = await _httpClient.get(uri);
    if (response.statusCode != 200) return;
    final Map<String, dynamic> json =
        jsonDecode(response.body) as Map<String, dynamic>;
    if (json['ok'] != true) return;
    final Map<String, dynamic> data = json['data'] as Map<String, dynamic>;
    final List<dynamic> scansRaw =
        data['scans'] as List<dynamic>? ?? <dynamic>[];
    final List<PublicScanEvent> scans = scansRaw.map((dynamic item) {
      final Map<String, dynamic> raw = item as Map<String, dynamic>;
      final Map<String, dynamic> location =
          raw['location'] as Map<String, dynamic>? ?? <String, dynamic>{};
      final List<dynamic> coordinates =
          location['coordinates'] as List<dynamic>? ?? <dynamic>[0, 0];
      return PublicScanEvent(
        timestamp:
            DateTime.tryParse(raw['timestamp'] as String? ?? '') ??
            DateTime.now(),
        location: GeoPoint(
          (coordinates.length > 1 ? coordinates[1] : 0).toDouble(),
          (coordinates.isNotEmpty ? coordinates[0] : 0).toDouble(),
        ),
        result: raw['result'] as String? ?? 'verified',
      );
    }).toList();
    _publicScansByQr[identifier] = scans;
  }

  Future<ProductRecord?> _fetchHistoryFromBackend(String identifier) async {
    final Uri uri = Uri.parse(
      '$backendBaseUrl/products/${Uri.encodeComponent(identifier)}/history',
    );
    final http.Response response = await _httpClient.get(uri);
    if (response.statusCode == 404) return null;
    if (response.statusCode != 200) {
      throw StateError('Backend returned ${response.statusCode}');
    }
    final Map<String, dynamic> json =
        jsonDecode(response.body) as Map<String, dynamic>;
    if (json['ok'] != true) throw StateError('Backend response not ok');

    final Map<String, dynamic> data = json['data'] as Map<String, dynamic>;
    final Map<String, dynamic> product =
        data['product'] as Map<String, dynamic>;
    final List<dynamic> eventsRaw = data['events'] as List<dynamic>;
    final List<LifecycleEvent> events = eventsRaw
        .map((dynamic item) => _eventFromBackend(item as Map<String, dynamic>))
        .toList();

    final ProductRecord record = ProductRecord(
      id: product['qrId'] as String,
      name: product['name'] as String,
      status: _statusFromBackend(product['status'] as String),
      currentOwner: _roleFromBackend(product['currentOwnerRole'] as String),
      events: events,
      serialNumber: product['serialNumber'] as String?,
      brand: product['brand'] as String?,
      category: product['category'] as String?,
      color: product['color'] as String?,
      description: product['description'] as String?,
    );
    _products[record.id] = record;
    _productIdentifierToQr[record.id] = record.id;
    _productIdentifierToQr[identifier] = record.id;
    if (record.serialNumber != null && record.serialNumber!.isNotEmpty) {
      _productIdentifierToQr[record.serialNumber!] = record.id;
    }
    return record;
  }

  LifecycleEvent _eventFromBackend(Map<String, dynamic> raw) {
    final String action = raw['action'] as String? ?? '';
    final Map<String, dynamic> meta =
        (raw['meta'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final Map<String, dynamic> location =
        raw['location'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final List<dynamic> coordinates =
        location['coordinates'] as List<dynamic>? ?? <dynamic>[0, 0];
    final String decoded =
        (meta['eventType'] as String?) ?? _defaultDecodedFromAction(action);
    final String normalizedDecoded = decoded == 'Retail'
        ? 'Distributed'
        : decoded;
    final String txHash = raw['txHash'] as String? ?? '';
    final int blockNumber = (raw['blockNumber'] as num?)?.toInt() ?? 0;

    return LifecycleEvent(
      action: _actionFromBackend(action),
      by: _roleFromBackend(raw['byRole'] as String? ?? 'customer'),
      location: GeoPoint(
        (coordinates.length > 1 ? coordinates[1] : 0).toDouble(),
        (coordinates.isNotEmpty ? coordinates[0] : 0).toDouble(),
      ),
      timestamp:
          DateTime.tryParse(raw['timestamp'] as String? ?? '') ??
          DateTime.now(),
      note: _noteFromDecoded(normalizedDecoded),
      txHash: txHash,
      blockNumber: blockNumber,
      contract: decoded == 'Manufactured'
          ? ContractSource.lifecycle
          : action == 'created'
          ? ContractSource.registry
          : ContractSource.lifecycle,
      decodedMeaning: normalizedDecoded,
    );
  }

  Future<int> _verifyEventsOnChain(ProductRecord record) async {
    final List<LifecycleEvent> eventsToCheck = record.events
        .where((LifecycleEvent e) => e.txHash.isNotEmpty)
        .toList();
    final List<Future<bool>> checks = eventsToCheck
        .map(_verifySingleEventOnChain)
        .toList();
    final List<bool> results = await Future.wait(checks);
    final Set<String> verified = <String>{};
    for (int i = 0; i < results.length; i++) {
      if (results[i]) verified.add(eventsToCheck[i].txHash.toLowerCase());
    }
    _verifiedTxHashesByProduct[record.id] = verified;
    return verified.length;
  }

  Future<bool> _verifySingleEventOnChain(LifecycleEvent event) async {
    final Uri uri = Uri.parse(sepoliaRpcUrl);
    final Map<String, dynamic> payload = <String, dynamic>{
      'jsonrpc': '2.0',
      'method': 'eth_getTransactionReceipt',
      'params': <dynamic>[event.txHash],
      'id': 1,
    };
    final http.Response response = await _httpClient.post(
      uri,
      headers: <String, String>{'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (response.statusCode != 200) return false;
    final Map<String, dynamic> data =
        jsonDecode(response.body) as Map<String, dynamic>;
    final Map<String, dynamic>? receipt =
        data['result'] as Map<String, dynamic>?;
    if (receipt == null) return false;

    final String status = (receipt['status'] as String? ?? '').toLowerCase();
    if (status != '0x1') return false;

    final String to = (receipt['to'] as String? ?? '').toLowerCase();
    final String expectedContract =
        (event.contract == ContractSource.registry
                ? registryAddress
                : lifecycleAddress)
            .toLowerCase();
    if (to != expectedContract) return false;

    final int chainBlock =
        int.tryParse(
          (receipt['blockNumber'] as String? ?? '0x0').replaceFirst('0x', ''),
          radix: 16,
        ) ??
        0;
    return chainBlock == event.blockNumber;
  }

  Future<Geofence?> fetchActiveZone({
    required ActorRole role,
    String orgId = 'org_001',
  }) async {
    final Uri uri = Uri.parse(
      '$backendBaseUrl/zones/active?role=${roleKey(role)}&orgId=$orgId',
    );
    final http.Response response = await _httpClient.get(uri);
    if (response.statusCode != 200) return null;
    final Map<String, dynamic> json =
        jsonDecode(response.body) as Map<String, dynamic>;
    if (json['ok'] != true) return null;
    final List<dynamic> zones = json['data'] as List<dynamic>;
    if (zones.isEmpty) return null;

    final Map<String, dynamic> first = zones.first as Map<String, dynamic>;
    final String label = first['name'] as String? ?? '${roleLabel(role)} Zone';
    final Map<String, dynamic> geometry =
        first['geometry'] as Map<String, dynamic>? ?? <String, dynamic>{};
    final List<dynamic> rings =
        geometry['coordinates'] as List<dynamic>? ?? <dynamic>[];
    if (rings.isEmpty) return null;
    final List<dynamic> ring = rings.first as List<dynamic>;
    if (ring.isEmpty) return null;

    double minLng = 180;
    double maxLng = -180;
    double minLat = 90;
    double maxLat = -90;
    for (final dynamic point in ring) {
      final List<dynamic> p = point as List<dynamic>;
      if (p.length < 2) continue;
      final double lng = (p[0] as num).toDouble();
      final double lat = (p[1] as num).toDouble();
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    if (minLng > maxLng || minLat > maxLat) return null;

    final GeoPoint center = GeoPoint(
      (minLat + maxLat) / 2,
      (minLng + maxLng) / 2,
    );
    final double latRadiusKm = ((maxLat - minLat).abs() * 111) / 2;
    final double lngRadiusKm =
        ((maxLng - minLng).abs() * 111 * math.cos(center.lat * 0.01745)) / 2;
    final double radiusKm =
        (latRadiusKm > lngRadiusKm ? latRadiusKm : lngRadiusKm) + 0.2;
    return Geofence(center: center, radiusKm: radiusKm, label: label);
  }

  Map<String, String> _authorizedHeaders() {
    final Map<String, String> headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (_authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    if (_authUserId != null && _authUserId!.isNotEmpty) {
      headers['x-user-id'] = _authUserId!;
    }
    return headers;
  }

  Future<String> _handleActorApiResponseWithRetry(
    http.Response response,
    Future<http.Response> Function() retryRequest,
  ) async {
    if (response.statusCode == 401 && await refreshToken()) {
      final http.Response retry = await retryRequest();
      return _handleActorApiResponse(retry);
    }
    return _handleActorApiResponse(response);
  }

  String _handleActorApiResponse(http.Response response) {
    final Map<String, dynamic> body =
        jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final Map<String, dynamic> data =
          (body['data'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      _upsertProductFromBackend(data);
      return 'Blockchain write OK: ${_statusLabelFromBackend(data['status'] as String? ?? '')}';
    }
    return (body['message'] as String?) ??
        'Request failed (${response.statusCode}).';
  }

  Future<void> _persistSession({
    required String? token,
    required String? userId,
  }) async {
    if (token != null && token.isNotEmpty) {
      await _secureStorage.write(key: _tokenKey, value: token);
    }
    if (userId != null && userId.isNotEmpty) {
      await _secureStorage.write(key: _userIdKey, value: userId);
    }
  }

  void _upsertProductFromBackend(Map<String, dynamic> data) {
    final String qrId = data['qrId'] as String? ?? '';
    if (qrId.isEmpty) return;
    final ProductRecord current =
        _products[qrId] ??
        ProductRecord(
          id: qrId,
          name: data['name'] as String? ?? qrId,
          status: ProductStatus.atManufacturer,
          currentOwner: ActorRole.manufacturer,
          events: <LifecycleEvent>[],
          serialNumber: data['serialNumber'] as String?,
          brand: data['brand'] as String?,
          category: data['category'] as String?,
          color: data['color'] as String?,
          description: data['description'] as String?,
        );
    final ProductRecord updated = ProductRecord(
      id: qrId,
      name: data['name'] as String? ?? current.name,
      status: _statusFromBackend(
        data['status'] as String? ?? 'at_manufacturer',
      ),
      currentOwner: _roleFromBackend(
        data['currentOwnerRole'] as String? ?? 'manufacturer',
      ),
      events: current.events,
      serialNumber: data['serialNumber'] as String? ?? current.serialNumber,
      brand: data['brand'] as String? ?? current.brand,
      category: data['category'] as String? ?? current.category,
      color: data['color'] as String? ?? current.color,
      description: data['description'] as String? ?? current.description,
    );
    updated.soldScanCount = current.soldScanCount;
    _products[qrId] = updated;
    _productIdentifierToQr[qrId] = qrId;
    if (updated.serialNumber != null && updated.serialNumber!.isNotEmpty) {
      _productIdentifierToQr[updated.serialNumber!] = qrId;
    }
  }

  int _deterministicOnChainId(String qrId) {
    int hash = 0;
    for (final int c in qrId.codeUnits) {
      hash = (hash * 31 + c) % 1000000000;
    }
    return hash == 0 ? 1 : hash;
  }

  String _statusLabelFromBackend(String status) {
    switch (status) {
      case 'at_manufacturer':
        return 'product registered at manufacturer';
      case 'at_retailer':
      case 'at_distributor':
        return 'transferred to distributor';
      case 'at_reseller':
        return 'transferred to reseller';
      case 'sold':
        return 'sale finalized';
      default:
        return 'operation completed';
    }
  }

  ProductStatus _statusFromBackend(String status) {
    switch (status) {
      case 'at_manufacturer':
        return ProductStatus.atManufacturer;
      case 'at_retailer':
      case 'at_distributor':
        return ProductStatus.atDistributor;
      case 'at_reseller':
        return ProductStatus.atReseller;
      case 'sold':
        return ProductStatus.sold;
      default:
        return ProductStatus.atManufacturer;
    }
  }

  ActorRole _roleFromBackend(String role) {
    switch (role) {
      case 'manufacturer':
        return ActorRole.manufacturer;
      case 'retailer':
      case 'distributor':
        return ActorRole.distributor;
      case 'reseller':
        return ActorRole.reseller;
      default:
        return ActorRole.customer;
    }
  }

  LifecycleAction _actionFromBackend(String action) {
    switch (action) {
      case 'created':
        return LifecycleAction.created;
      case 'sold':
        return LifecycleAction.sold;
      default:
        return LifecycleAction.transferred;
    }
  }

  String _defaultDecodedFromAction(String action) {
    switch (action) {
      case 'created':
        return 'Manufactured';
      case 'transferred_to_retailer':
      case 'transferred_to_distributor':
        return 'Distributed';
      case 'transferred_to_reseller':
        return 'Resold';
      case 'sold':
        return 'Purchased';
      default:
        return 'Unknown';
    }
  }

  String _noteFromDecoded(String decoded) {
    switch (decoded) {
      case 'Manufactured':
        return 'Product created on-chain.';
      case 'Distributed':
        return 'Transfer to distributor recorded on-chain.';
      case 'Resold':
        return 'Transfer to reseller recorded on-chain.';
      case 'Purchased':
        return 'Sale finalized on-chain.';
      default:
        return 'Event anchored on-chain.';
    }
  }
}
