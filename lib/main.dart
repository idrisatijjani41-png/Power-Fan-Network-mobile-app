import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'screens/main_navigation_screen.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const PowerFanNetworkApp());
}

class PowerFanNetworkApp extends StatelessWidget {
  const PowerFanNetworkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'POWER FAN NETWORK',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFF8F9FA),
        primaryColor: const Color(0xFF2C1065),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2C1065),
          primary: const Color(0xFF2C1065),
        ),
        useMaterial3: true,
      ),
      home: const AuthInitializer(),
    );
  }
}

class AuthInitializer extends StatelessWidget {
  const AuthInitializer({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthService authService = AuthService();

    return StreamBuilder(
      stream: authService.authStateChanges,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (!snapshot.hasData) {
          // Auto sign-in anonymously if not logged in
          authService.signInAnonymously();
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        return const MainNavigationScreen();
      },
    );
  }
}
