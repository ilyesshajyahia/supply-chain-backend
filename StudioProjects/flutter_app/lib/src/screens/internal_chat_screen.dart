import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/models/domain_models.dart';
import 'package:flutter_app/src/widgets/design_system_widgets.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';

class InternalChatScreen extends StatefulWidget {
  const InternalChatScreen({super.key, required this.deps, required this.user});

  final AppDependencies deps;
  final UserAccount user;

  @override
  State<InternalChatScreen> createState() => _InternalChatScreenState();
}

class _InternalChatScreenState extends State<InternalChatScreen> {
  final TextEditingController _threadController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  bool _loading = false;
  bool _sending = false;
  String? _error;
  List<InternalChatMessage> _messages = <InternalChatMessage>[];
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _refreshTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (!mounted || _loading || _sending) return;
      _loadMessages(silent: true);
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _threadController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  String? get _qrIdOrNull {
    final String value = _threadController.text.trim();
    return value.isEmpty ? null : value;
  }

  Future<void> _loadMessages({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    final List<InternalChatMessage> rows = await widget.deps.traceabilityService
        .listInternalChatMessages(qrId: _qrIdOrNull, limit: 100);
    if (!mounted) return;
    setState(() {
      if (!silent) _loading = false;
      _messages = rows;
      if (!silent && rows.isEmpty) {
        _error = 'No messages found for this thread yet.';
      } else if (rows.isNotEmpty) {
        _error = null;
      }
    });
  }

  Future<void> _sendMessage() async {
    final String text = _messageController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    final String result = await widget.deps.traceabilityService
        .sendInternalChatMessage(text: text, qrId: _qrIdOrNull);
    if (!mounted) return;
    if (result != 'Message sent.') {
      setState(() {
        _sending = false;
        _error = result;
      });
      return;
    }
    _messageController.clear();
    await _loadMessages();
    if (!mounted) return;
    setState(() => _sending = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'Internal Chat',
        subtitle:
            'Chat with manufacturer, distributor, and reseller users in your organization.',
        child: Column(
          children: <Widget>[
            SoftCard(
              child: Column(
                children: <Widget>[
                  TextField(
                    controller: _threadController,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Product Thread QR ID (optional)',
                      prefixIcon: Icon(Icons.qr_code),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _loading ? null : _loadMessages,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Load Thread'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_error != null) ...<Widget>[
              AlertBanner(message: _error!),
              const SizedBox(height: 10),
            ],
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty
                  ? const Center(child: Text('No messages yet.'))
                  : ListView.separated(
                      itemCount: _messages.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final InternalChatMessage m = _messages[index];
                        final bool mine = m.byUserId == widget.user.id;
                        return Align(
                          alignment: mine
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            constraints: const BoxConstraints(maxWidth: 520),
                            child: SoftCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Row(
                                    children: <Widget>[
                                      Text(
                                        '${m.byName} - ${roleLabel(m.byRole)}',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleSmall,
                                      ),
                                      const Spacer(),
                                      Text(
                                        _timeLabel(m.createdAt),
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                  if (m.qrId != null) ...<Widget>[
                                    const SizedBox(height: 6),
                                    Text(
                                      'Thread: ${m.qrId}',
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall,
                                    ),
                                  ],
                                  const SizedBox(height: 8),
                                  Text(m.text),
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: Text(
                                      _seenLabel(m, mine),
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 10),
            SoftCard(
              child: Column(
                children: <Widget>[
                  TextField(
                    controller: _messageController,
                    minLines: 1,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Type a message',
                      prefixIcon: Icon(Icons.chat_bubble_outline),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _sending ? null : _sendMessage,
                          icon: const Icon(Icons.send),
                          label: Text(_sending ? 'Sending...' : 'Send'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _timeLabel(DateTime t) {
    final DateTime x = t.toLocal();
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(x.hour)}:${two(x.minute)}';
  }

  String _seenLabel(InternalChatMessage m, bool mine) {
    if (!mine) {
      return m.seenByMe ? 'Seen' : 'Delivered';
    }
    final int others = m.seenByCount > 0 ? m.seenByCount - 1 : 0;
    if (others <= 0) return 'Sent';
    if (others == 1) return 'Seen by 1';
    return 'Seen by $others';
  }
}
