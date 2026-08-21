import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('WALLET', style: TextStyle(color: Color(0xFF1E0A3C), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: StreamBuilder<DocumentSnapshot>(
        stream: FirebaseFirestore.instance.collection('users').doc(user?.uid).snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());

          final data = snapshot.data!.data() as Map<String, dynamic>? ?? {};
          final fanBalance = (data['fanBalance'] as num?)?.toDouble() ?? 0.0;
          final afamBalance = (data['afamBalance'] as num?)?.toDouble() ?? 0.0;

          return Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    title: const Text('FAN Mined Balance'),
                    subtitle: Text('${fanBalance.toStringAsFixed(4)} FAN'),
                    leading: const Icon(Icons.monetization_on, color: Color(0xFF2C1065)),
                  ),
                ),
                const SizedBox(height: 10),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    title: const Text('AFAM Token (Migration Target)'),
                    subtitle: Text('${afamBalance.toStringAsFixed(4)} AFAM'),
                    leading: const Icon(Icons.token, color: Colors.orange),
                  ),
                ),
                const SizedBox(height: 30),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.purple.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Text(
                      'TOKEN MIGRATION & WITHDRAWALS ARE COMING SOON',
                      style: TextStyle(color: Color(0xFF2C1065), fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
