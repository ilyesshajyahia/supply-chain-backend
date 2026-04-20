import 'package:flutter/material.dart';
import 'package:flutter_app/src/theme/app_theme.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ScanQrScreen extends StatefulWidget {
  const ScanQrScreen({super.key, required this.title});

  final String title;

  @override
  State<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends State<ScanQrScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled || capture.barcodes.isEmpty) return;
    final String? raw = capture.barcodes.first.rawValue;
    if (raw == null || raw.trim().isEmpty) return;
    _handled = true;
    Navigator.of(context).pop(raw.trim());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Stack(
        children: <Widget>[
          MobileScanner(controller: _controller, onDetect: _onDetect),
          Positioned.fill(
            child: IgnorePointer(
              child: Center(
                child: Container(
                  width: 260,
                  height: 260,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.94),
                borderRadius: BorderRadius.circular(20),
                boxShadow: AppTheme.softShadow,
              ),
              child: Row(
                children: <Widget>[
                  Icon(
                    Icons.qr_code_scanner,
                    color: Theme.of(context).colorScheme.primary,
                    size: 24,
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Point the camera at the product QR or serial barcode.',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
