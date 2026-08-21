import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthService authService = AuthService();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('SETTINGS', style: TextStyle(color: Color(0xFF1E0A3C), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          ListTile(
            leading: const Icon(Icons.person, color: Color(0xFF2C1065)),
            title: const Text('Account Profile'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.security, color: Color(0xFF2C1065)),
            title: const Text('Security & Anti-Cheat'),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip, color: Color(0xFF2C1065)),
            title: const Text('Privacy Policy'),
            onTap: () {},
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
            onTap: () async {
              await authService.signOut();
            },
          ),
        ],
      ),
    );
  }
}
