import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/models/domain_models.dart';
import 'package:flutter_app/src/screens/scan_qr_screen.dart';
import 'package:flutter_app/src/services/location_service.dart';
import 'package:flutter_app/src/theme/app_theme.dart';
import 'package:flutter_app/src/widgets/design_system_widgets.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:math' as math;
import 'package:flutter/services.dart';

class CustomerVerifyScreen extends StatefulWidget {
  const CustomerVerifyScreen({
    super.key,
    required this.deps,
    this.openScannerOnStart = false,
  });

  final AppDependencies deps;
  final bool openScannerOnStart;

  @override
  State<CustomerVerifyScreen> createState() => _CustomerVerifyScreenState();
}

class _CustomerVerifyScreenState extends State<CustomerVerifyScreen> {
  String _verificationResult = 'Waiting for scan.';
  ProductRecord? _record;
  bool _openedInitialScanner = false;
  GeoPoint? _lastScanLocation;
  String? _locationError;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.openScannerOnStart && !_openedInitialScanner) {
      _openedInitialScanner = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _openScanner());
    }
  }

  Future<void> _openScanner() async {
    final String? code = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(
        builder: (_) => const ScanQrScreen(title: 'Scan Product to Verify'),
      ),
    );
    if (!mounted || code == null || code.isEmpty) return;
    await _verifyByIdentifier(code);
  }

  Future<void> _enterSerialManually() async {
    final TextEditingController controller = TextEditingController();
    final String? value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enter Serial Number'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            labelText: 'Serial Number',
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('Verify'),
          ),
        ],
      ),
    );
    if (!mounted || value == null || value.isEmpty) return;
    await _verifyByIdentifier(value);
  }

  Future<void> _verifyByIdentifier(String identifier) async {
    final LocationResult locationResult = await widget.deps.locationService
        .getCurrentLocation();
    if (locationResult.point == null) {
      setState(() {
        _locationError =
            locationResult.error ?? 'Location unavailable. Enable GPS.';
      });
      return;
    }
    final String result = await widget.deps.traceabilityService
        .registerPublicScan(
          identifier: identifier,
          location: locationResult.point!,
        );
    setState(() {
      _verificationResult = result;
      _record = widget.deps.traceabilityService.getProduct(identifier);
      _lastScanLocation = locationResult.point;
      _locationError = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'Public Product Verification',
        subtitle:
            'No login required. Scan a product QR and review blockchain history.',
        child: ListView(
          children: <Widget>[
            const ScreenSection(
              title: 'Verify Product',
              icon: Icons.verified_user_outlined,
              child: SizedBox.shrink(),
            ),
            FilledButton.icon(
              onPressed: _openScanner,
              icon: const Icon(Icons.qr_code_scanner, size: 24),
              label: const Text('Open Camera Scanner'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _enterSerialManually,
              icon: const Icon(Icons.numbers),
              label: const Text('Enter Serial Number'),
            ),
            const SizedBox(height: 32),
            SoftCard(
              child: Padding(
                padding: const EdgeInsets.all(0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Icon(
                      _verificationResult.startsWith('Warning')
                          ? Icons.warning_amber_rounded
                          : Icons.verified_outlined,
                      color: _verificationResult.startsWith('Warning')
                          ? AppTheme.danger
                          : AppTheme.success,
                      size: 24,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text('Verification result: $_verificationResult'),
                    ),
                  ],
                ),
              ),
            ),
            if (_locationError != null) ...<Widget>[
              const SizedBox(height: 16),
              SoftCard(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Icon(Icons.location_off, color: Colors.red),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_locationError!)),
                  ],
                ),
              ),
            ],
            if (_record != null) ...<Widget>[
              const SizedBox(height: 32),
              ScreenSection(
                title: 'Product Snapshot',
                icon: Icons.inventory_2_outlined,
                child: SoftCard(
                  child: Padding(
                    padding: const EdgeInsets.all(0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          '${_record!.name} (${_record!.id})',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (_record!.serialNumber != null &&
                            _record!.serialNumber!.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 6),
                          Text('Serial: ${_record!.serialNumber}'),
                        ],
                        if (_record!.brand != null &&
                            _record!.brand!.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 6),
                          Text('Brand: ${_record!.brand}'),
                        ],
                        if (_record!.category != null &&
                            _record!.category!.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 6),
                          Text('Category: ${_record!.category}'),
                        ],
                        if (_record!.color != null &&
                            _record!.color!.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 6),
                          Text('Color: ${_record!.color}'),
                        ],
                        if (_record!.description != null &&
                            _record!.description!.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 8),
                          Text(
                            _record!.description!,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                        const SizedBox(height: 12),
                        _productStatusBadge(_record!.status),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const SectionTitle(
                title: 'Blockchain History',
                icon: Icons.history,
              ),
              const SizedBox(height: 14),
              ..._record!.events.asMap().entries.map((entry) {
                final int index = entry.key;
                final LifecycleEvent event = entry.value;
                final bool verified = widget.deps.traceabilityService
                    .isEventVerifiedOnChain(
                      productId: _record!.id,
                      event: event,
                    );
                final bool isLast = index == _record!.events.length - 1;
                return _timelineCard(event, verified, isLast);
              }),
              const SizedBox(height: 32),
              const SectionTitle(
                title: 'Public Scan History',
                icon: Icons.public,
              ),
              const SizedBox(height: 14),
              _buildShareRow(_record!.id),
              const SizedBox(height: 16),
              _buildTrustMap(_record!.id),
              const SizedBox(height: 16),
              ..._scanHistoryCards(_record!.id),
            ],
          ],
        ),
      ),
    );
  }

  Widget _timelineCard(LifecycleEvent event, bool verified, bool isLast) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(
            width: 24,
            child: Column(
              children: <Widget>[
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 120,
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withOpacity(0.25),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: SoftCard(
              child: Padding(
                padding: const EdgeInsets.all(0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      _eventTitle(event),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: <Widget>[
                        _chip('Contract: ${contractLabel(event.contract)}'),
                        _chip('Block: ${event.blockNumber}'),
                        _chip(
                          verified ? 'Verified on-chain' : 'Not verified',
                          color: verified ? AppTheme.success : AppTheme.danger,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(event.note),
                    const SizedBox(height: 6),
                    Text('When: ${_formatEventDate(event.timestamp)}'),
                    const SizedBox(height: 4),
                    Text('Where: ${_formatLocation(event.location)}'),
                    const SizedBox(height: 10),
                    InkWell(
                      onTap: () => _openTx(event.txHash),
                      child: Text(
                        'tx: ${_shortHash(event.txHash)}',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _eventTitle(LifecycleEvent event) {
    if (event.decodedMeaning == 'Purchased') {
      return 'Purchased by customer (recorded by ${roleLabel(event.by).toLowerCase()})';
    }
    return '${event.decodedMeaning} by ${roleLabel(event.by)}';
  }

  String _formatEventDate(DateTime timestamp) {
    final DateTime t = timestamp.toLocal();
    final List<String> months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[t.month - 1]} ${t.day}, ${t.year} at ${_two(t.hour)}:${_two(t.minute)}:${_two(t.second)}';
  }

  String _formatLocation(GeoPoint point) {
    final String coords =
        '${point.lat.toStringAsFixed(4)}, ${point.lng.toStringAsFixed(4)}';

    if (point.lat >= 33.57 &&
        point.lat <= 33.58 &&
        point.lng >= -7.60 &&
        point.lng <= -7.58) {
      return 'Factory Zone ($coords)';
    }
    if (point.lat >= 33.57 &&
        point.lat <= 33.58 &&
        point.lng >= -7.50 &&
        point.lng <= -7.48) {
      return 'Distributor Zone ($coords)';
    }
    if (point.lat >= 33.57 &&
        point.lat <= 33.58 &&
        point.lng >= -7.46 &&
        point.lng <= -7.44) {
      return 'Reseller Zone ($coords)';
    }

    return coords;
  }

  String _two(int value) => value.toString().padLeft(2, '0');

  Widget _chip(String label, {Color? color}) {
    final Color chipColor = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: chipColor.withOpacity(0.12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: chipColor,
        ),
      ),
    );
  }

  String _shortHash(String txHash) {
    if (txHash.length < 12) return txHash;
    return '${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 6)}';
  }

  Future<void> _openTx(String txHash) async {
    final Uri uri = Uri.parse('https://testnet.routescan.io/tx/$txHash');
    final bool opened = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open transaction link.')),
      );
    }
  }

  Widget _buildShareRow(String qrId) {
    final String url = widget.deps.traceabilityService.publicProductUrl(qrId);
    return Row(
      children: <Widget>[
        Expanded(
          child: FilledButton.icon(
            onPressed: () => _openUrl(url),
            icon: const Icon(Icons.open_in_browser_outlined),
            label: const Text('Open Public Page'),
          ),
        ),
        const SizedBox(width: 12),
        OutlinedButton.icon(
          onPressed: () => _copyLink(url),
          icon: const Icon(Icons.share_outlined),
          label: const Text('Copy Link'),
        ),
      ],
    );
  }

  Future<void> _openUrl(String url) async {
    final Uri uri = Uri.parse(url);
    final bool opened = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open public link.')),
      );
    }
  }

  Future<void> _copyLink(String url) async {
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Public link copied.')));
  }

  Widget _productStatusBadge(ProductStatus status) {
    switch (status) {
      case ProductStatus.sold:
        return const StatusBadge(
          label: 'Sold',
          color: AppTheme.sold,
          icon: Icons.sell_outlined,
        );
      case ProductStatus.atManufacturer:
      case ProductStatus.atDistributor:
      case ProductStatus.atReseller:
        return const StatusBadge(
          label: 'Verified',
          color: AppTheme.success,
          icon: Icons.verified_outlined,
        );
    }
  }

  List<Widget> _scanHistoryCards(String qrId) {
    final List<PublicScanEvent> scans = widget.deps.traceabilityService
        .publicScansFor(qrId);
    if (scans.isEmpty) {
      return <Widget>[
        SoftCard(child: const Text('No public scans recorded yet.')),
      ];
    }

    final _SuspicionCheck suspicion = _checkSuspiciousScans(scans);
    return scans.map((PublicScanEvent scan) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: SoftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (scan == scans.first && suspicion.isSuspicious)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: AppTheme.danger,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          suspicion.message,
                          style: const TextStyle(color: AppTheme.danger),
                        ),
                      ),
                    ],
                  ),
                ),
              Text(
                _formatEventDate(scan.timestamp),
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 6),
              Text('Location: ${_formatLocation(scan.location)}'),
              const SizedBox(height: 6),
              Text('Result: ${scan.result.replaceAll('_', ' ')}'),
            ],
          ),
        ),
      );
    }).toList();
  }

  Widget _buildTrustMap(String qrId) {
    final List<PublicScanEvent> scans = widget.deps.traceabilityService
        .publicScansFor(qrId);
    if (scans.isEmpty) {
      return SoftCard(
        child: const Text('Scan map will appear after a public scan.'),
      );
    }

    final List<LatLng> points = scans
        .map((s) => LatLng(s.location.lat, s.location.lng))
        .toList();
    final LatLng center = points.first;
    final _SuspicionCheck suspicion = _checkSuspiciousScans(scans);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const SectionTitle(title: 'Trust Map', icon: Icons.map_outlined),
        const SizedBox(height: 12),
        SoftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (suspicion.isSuspicious)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: AppTheme.danger,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          suspicion.message,
                          style: const TextStyle(color: AppTheme.danger),
                        ),
                      ),
                    ],
                  ),
                ),
              SizedBox(
                height: 220,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: FlutterMap(
                    options: MapOptions(initialCenter: center, initialZoom: 4),
                    children: <Widget>[
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.example.flutter_app',
                      ),
                      PolylineLayer(
                        polylines: <Polyline>[
                          Polyline(
                            points: points,
                            color: Theme.of(
                              context,
                            ).colorScheme.primary.withOpacity(0.6),
                            strokeWidth: 3,
                          ),
                        ],
                      ),
                      MarkerLayer(
                        markers: points.asMap().entries.map((entry) {
                          final int index = entry.key;
                          final LatLng point = entry.value;
                          final bool isLatest = index == 0;
                          return Marker(
                            point: point,
                            width: 40,
                            height: 40,
                            child: Icon(
                              isLatest
                                  ? Icons.location_on
                                  : Icons.location_on_outlined,
                              color: isLatest
                                  ? AppTheme.success
                                  : Theme.of(context).colorScheme.primary,
                              size: isLatest ? 30 : 24,
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  _SuspicionCheck _checkSuspiciousScans(List<PublicScanEvent> scans) {
    if (scans.length < 2) {
      return const _SuspicionCheck(false, '');
    }

    final PublicScanEvent latest = scans.first;
    final PublicScanEvent previous = scans[1];
    final double km = _distanceKm(latest.location, previous.location);
    final Duration diff = latest.timestamp.difference(previous.timestamp).abs();

    const double distanceThresholdKm = 300;
    const Duration timeThreshold = Duration(days: 7);

    if (km >= distanceThresholdKm && diff <= timeThreshold) {
      final String msg =
          'Suspicious: scanned ${km.toStringAsFixed(0)} km apart within '
          '${diff.inDays} day(s).';
      return _SuspicionCheck(true, msg);
    }

    return const _SuspicionCheck(false, '');
  }

  double _distanceKm(GeoPoint a, GeoPoint b) {
    const double earthRadius = 6371;
    final double dLat = _degToRad(b.lat - a.lat);
    final double dLon = _degToRad(b.lng - a.lng);
    final double lat1 = _degToRad(a.lat);
    final double lat2 = _degToRad(b.lat);
    final double h =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.sin(dLon / 2) *
            math.sin(dLon / 2) *
            math.cos(lat1) *
            math.cos(lat2);
    return earthRadius * 2 * math.asin(math.sqrt(h));
  }

  double _degToRad(double deg) => deg * math.pi / 180.0;
}

class _SuspicionCheck {
  const _SuspicionCheck(this.isSuspicious, this.message);
  final bool isSuspicious;
  final String message;
}
