import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'package:wakelock_plus/wakelock_plus.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'dart:async';
import 'dart:io';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: ThirdEyeApp()
  ));
}

enum AppState { idl, scanning, permissions, rotating, monitoring, completed }

class ThirdEyeApp extends StatefulWidget {
  const ThirdEyeApp({super.key});

  @override
  State<ThirdEyeApp> createState() => _ThirdEyeAppState();
}

class _ThirdEyeAppState extends State<ThirdEyeApp> with WidgetsBindingObserver {
  AppState _currentState = AppState.idl;
  String? assessmentId;
  String? email;
  String? candidateId;
  String? baseUrl;
  RtcEngine? _engine;
  IO.Socket? _socket;
  bool _isProcessingScan = false;
  bool _isSettingUpMonitoring = false;
  Timer? _snapshotTimer;
  String? _serverIp;
  bool _isAssessmentStarted = false;

  final String appId = "81046807a7844e549be400e41013e7bf"; 
  static const Color virtusaOrange = Color(0xFFFF5A09);
  static const Color virtusaBlack = Color(0xFF000000);

  final String virtusaLogoSvg = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 56">
  <text x="6" y="44" font-family="'Helvetica Neue', Arial" font-size="44" font-weight="500" letter-spacing="-1.5" fill="#000000">virtusa</text>
</svg>
''';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cleanup();
    super.dispose();
  }

  @override
  void didChangeMetrics() {
    // Relying on OrientationBuilder for reliable UI-based transition
  }

  Future<void> _cleanup() async {
    try {
      _snapshotTimer?.cancel();
      await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
      WakelockPlus.disable();
      _socket?.disconnect();
      await _engine?.leaveChannel();
      await _engine?.release();
      _engine = null;
    } catch (e) {
      debugPrint("Cleanup error: $e");
    }
  }

  Future<void> _handleScan(String qrData) async {
    if (_isProcessingScan) return;
    _isProcessingScan = true;
    try {
      final Map<String, dynamic> session = jsonDecode(qrData);
      assessmentId = session['assessment_id']?.toString().trim().toLowerCase();
      email = session['email']?.toString().trim().toLowerCase();
      candidateId = session['candidate_id']?.toString().trim().toLowerCase(); // LOWERCASE FOR CONSISTENCY
      _serverIp = session['server_ip']?.toString().trim() ?? "";

      if (_serverIp == "localhost" || _serverIp!.isEmpty) {
        throw Exception("Invalid Server IP. Please access the laptop via its Network IP.");
      }
      
      // Handle both Railway (HTTPS/443) and Localhost (HTTP/8000)
      if (_serverIp!.contains("railway.app") || _serverIp!.contains("up.railway.app")) {
        baseUrl = "https://$_serverIp";
      } else {
        baseUrl = "http://$_serverIp:8000";
      }
      
      // Briefly show loading/permissions state while native dialogs are up
      setState(() => _currentState = AppState.permissions);
      await _setupPermissions();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
      setState(() => _currentState = AppState.idl);
    } finally {
      _isProcessingScan = false;
    }
  }

  Future<void> _setupPermissions() async {
    // Sequential Permissions
    final cameraStatus = await Permission.camera.request();
    final micStatus = await Permission.microphone.request();
    
    if (cameraStatus.isDenied || micStatus.isDenied) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text("Camera and Microphone permissions are required to proceed."),
        backgroundColor: Colors.red,
      ));
      setState(() => _currentState = AppState.idl);
      return;
    }

    // Only ask DND if absolutely needed
    if (await Permission.accessNotificationPolicy.isDenied) {
      debugPrint("Requesting DND permission...");
      await Permission.accessNotificationPolicy.request();
    }
    
    WakelockPlus.enable();
    
    // Allow rotation now!
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    
    setState(() => _currentState = AppState.rotating);
  }

  Future<void> _startMonitoring() async {
    if (_isSettingUpMonitoring || _currentState == AppState.monitoring) return;
    
    // Switch state immediately so the user knows setup started
    setState(() => _currentState = AppState.monitoring);

    try {
      _isSettingUpMonitoring = true;
      debugPrint("Starting Monitoring Setup...");
      
      debugPrint("Setup Agora Engine...");
      final engine = createAgoraRtcEngine();
      await engine.initialize(RtcEngineContext(appId: appId));
      await engine.enableVideo();
      await engine.disableAudio(); // COMPLETELY DISABLE AUDIO PER USER REQUEST
      await engine.startPreview();
      
      // CRITICAL: Set engine and update state here so AgoraVideoView can render the face immediately!
      setState(() {
        _engine = engine;
      });
      debugPrint("Agora Preview Started and Engine Assigned");

      // Set up snapshot handler
      engine.registerEventHandler(
        RtcEngineEventHandler(
          onSnapshotTaken: (connection, uid, filePath, width, height, errCode) async {
            if (errCode == 0) {
              _uploadSnapshot(filePath);
            }
          },
        ),
      );

      // Now perform network-dependent tasks asynchronously to not block the UI
      _completeNetworkSetup(engine);

    } catch (e) {
      debugPrint("Monitoring Setup Error: $e");
      WakelockPlus.disable();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text("Setup Failed: $e"),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 5),
      ));
      setState(() => _currentState = AppState.idl);
    } finally {
      _isSettingUpMonitoring = false;
    }
  }

  Future<void> _completeNetworkSetup(RtcEngine engine) async {
    try {
      debugPrint("Setup Socket...");
      _socket = IO.io(baseUrl!, IO.OptionBuilder()
        .setTransports(['websocket'])
        .setReconnectionAttempts(5)
        .build());

      _socket!.onConnect((_) {
        debugPrint("Socket Connected!");
        final joinData = {'assessment_id': assessmentId, 'email': email};
        _socket!.emit('join_room', joinData);
        _socket!.emit('mobile_ready', joinData);
      });

      _socket!.on('cleanup_mobile', (_) => _finishAssessment());
      
      _socket!.on('start_mobile_stream', (data) async {
          debugPrint("SYNC SIGNAL RECEIVED: Starting Agora Stream...");
          final channelName = "${assessmentId}_$candidateId";
          final response = await http.get(Uri.parse("$baseUrl/agora/token?channelName=$channelName"));
          final token = jsonDecode(response.body)['token'];
          
          await engine.joinChannel(
            token: token,
            channelId: channelName,
            uid: 2,
            options: const ChannelMediaOptions(
              clientRoleType: ClientRoleType.clientRoleBroadcaster,
              publishCameraTrack: true,
              publishMicrophoneTrack: false,
            ),
          );
          debugPrint("Joined Agora Channel: $channelName as UID 2");
          setState(() => _isAssessmentStarted = true);
          _startSnapshotTimer();
      });

      debugPrint("Socket listeners ready. Waiting for 'start_mobile_stream' signal from Laptop...");
    } catch (e) {
      debugPrint("Network Setup Error: $e");
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text("Cloud Connection Failed: $e. Monitoring might not be visible to proctor."),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 8),
      ));
    }
  }

  void _finishAssessment() {
    _cleanup();
    setState(() => _currentState = AppState.completed);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PopScope(
        canPop: false,
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text("Assessment Complete", style: TextStyle(fontWeight: FontWeight.bold)),
          content: const Text("Monitoring has finished. You may now exit the application."),
          actions: [
            ElevatedButton(
              onPressed: () => SystemNavigator.pop(), 
              style: ElevatedButton.styleFrom(
                backgroundColor: virtusaBlack, 
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))
              ),
              child: const Text("Exit App")
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return OrientationBuilder(
      builder: (context, orientation) {
        if (_currentState == AppState.rotating && orientation == Orientation.landscape && !_isSettingUpMonitoring) {
          Future.microtask(() => _startMonitoring());
        }
        
        return PopScope(
          canPop: _currentState == AppState.idl,
          child: Scaffold(
            backgroundColor: Colors.white,
            appBar: (_currentState == AppState.monitoring) ? null : AppBar(
              title: SvgPicture.string(virtusaLogoSvg, height: 28),
              centerTitle: false,
              backgroundColor: Colors.white,
              elevation: 0,
            ),
            body: _buildBody(),
          ),
        );
      },
    );
  }

  Widget _buildBody() {
    switch (_currentState) {
      case AppState.idl:
        return _buildHome();
      case AppState.scanning:
        return _buildScanner();
      case AppState.permissions:
        return const Center(child: CircularProgressIndicator(color: virtusaOrange));
      case AppState.rotating:
        return _buildRotationInstruction();
      case AppState.monitoring:
        return _buildMonitoringFeed();
      case AppState.completed:
        return const Center(child: Text("Assessment Complete"));
    }
  }

  Widget _buildHome() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              "Welcome to Titans Assessment Monitoring",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: virtusaBlack),
            ),
            const SizedBox(height: 20),
            const Text(
              "Securely monitor your session with a secondary feed.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 16),
            ),
            const SizedBox(height: 60),
            ElevatedButton.icon(
              onPressed: () => setState(() => _currentState = AppState.scanning),
              icon: const Icon(Icons.qr_code_scanner_rounded),
              label: const Text("Scan QR Code"),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 56),
                backgroundColor: virtusaBlack,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScanner() {
    return Stack(
      children: [
        MobileScanner(
          onDetect: (capture) {
            final barcodes = capture.barcodes;
            if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
              _handleScan(barcodes.first.rawValue!);
            }
          },
        ),
        Container(
          color: Colors.black.withOpacity(0.4),
          child: Column(
            children: [
              const SizedBox(height: 100),
              const Center(
                child: Text(
                  "Scan QR code",
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const Spacer(),
              Center(
                child: Container(
                  width: 260,
                  height: 260,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white.withOpacity(0.5), width: 1),
                    borderRadius: BorderRadius.circular(40),
                  ),
                  child: Stack(
                    children: [
                      Positioned(top: 0, left: 0, child: _scanCorner(0, 0)),
                      Positioned(top: 0, right: 0, child: _scanCorner(0, 1)),
                      Positioned(bottom: 0, left: 0, child: _scanCorner(1, 0)),
                      Positioned(bottom: 0, right: 0, child: _scanCorner(1, 1)),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ],
    );
  }


  Widget _buildRotationInstruction() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.screen_rotation_rounded, size: 100, color: virtusaOrange),
            const SizedBox(height: 40),
            const Text(
              "Switch to Landscape",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              "Please rotate your phone to Landscape mode to enter the monitoring dashboard.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonitoringFeed() {
    if (_engine == null) return Container(color: Colors.black, child: const Center(child: CircularProgressIndicator()));
    return Container(
      color: Colors.black,
      child: AgoraVideoView(
        controller: VideoViewController(
          rtcEngine: _engine!,
          canvas: const VideoCanvas(uid: 0),
        ),
      ),
    );
  }

  Widget _scanCorner(int v, int h) {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.white, width: 6, style: v == 0 ? BorderStyle.solid : BorderStyle.none),
          bottom: BorderSide(color: Colors.white, width: 6, style: v == 1 ? BorderStyle.solid : BorderStyle.none),
          left: BorderSide(color: Colors.white, width: 6, style: h == 0 ? BorderStyle.solid : BorderStyle.none),
          right: BorderSide(color: Colors.white, width: 6, style: h == 1 ? BorderStyle.solid : BorderStyle.none),
        ),
      ),
    );
  }

  void _startSnapshotTimer() {
    _snapshotTimer?.cancel();
    _snapshotTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) async {
      try {
        final tempDir = Directory.systemTemp;
        final filePath = "${tempDir.path}/side_snapshot.jpg";
        if (_engine != null) {
          await _engine!.takeSnapshot(uid: 0, filePath: filePath);
        }
      } catch (e) {
         debugPrint("Snapshot take error: $e");
      }
    });
  }

  Future<void> _uploadSnapshot(String filePath) async {
    if (!_isAssessmentStarted) return; // EXTRA SAFETY: Do not upload if not synced
    try {
      final file = File(filePath);
      if (!await file.exists()) return;
      
      final bytes = await file.readAsBytes();
      final base64Image = "data:image/jpeg;base64,${base64Encode(bytes)}";
      
      // Send to analytics server on port 8002
      final url = "$baseUrl/video/frame/mobile";
      
      await http.post(
        Uri.parse(url),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "image": base64Image,
          "assessment_id": assessmentId,
          "email_id": email,
          "device_type": "mobile"
        }),
      ).timeout(const Duration(milliseconds: 100));
    } catch (e) {
      // Background fails silently
    }
  }
}
