// File generated for the Power Fan Network Firebase project.
// Android configuration is based on the real google-services.json.

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'Power Fan Network is currently configured for Android only.',
      );
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;

      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      case TargetPlatform.fuchsia:
        throw UnsupportedError(
          'Power Fan Network Firebase configuration is currently '
          'available for Android only.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyB98nKyylZ57fM8OZkbDaiNPHf0KhJCimE',
    appId: '1:983417377998:android:26e41e5de6f1668c90ac9f',
    messagingSenderId: '983417377998',
    projectId: 'fanmining-dcdc0',
    storageBucket: 'fanmining-dcdc0.firebasestorage.app',
  );
}
