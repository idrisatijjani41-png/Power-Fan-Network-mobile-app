import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Sign In / Register Anonymously or with Credentials
  Future<UserCredential?> signInAnonymously() async {
    try {
      UserCredential credential = await _auth.signInAnonymously();
      
      // Check if user doc exists, create if new
      final userDoc = await _db.collection('users').doc(credential.user!.uid).get();
      if (!userDoc.exists) {
        await _db.collection('users').doc(credential.user!.uid).set({
          'email': '',
          'fanBalance': 0.0,
          'afamBalance': 0.0,
          'referralCode': credential.user!.uid.substring(0, 8).toUpperCase(),
          'referralCount': 0,
          'kycLevel': 0,
          'consecutiveCheckIns': 0,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
      return credential;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
