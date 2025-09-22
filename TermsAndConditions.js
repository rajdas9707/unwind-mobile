// TermsAndConditions.js

// ==========================
// Default variables
// ==========================
export const APP_NAME = "ProductivityApp";
export const EFFECTIVE_DATE = "2025-09-22";
export const SUPPORT_EMAIL = "support@productivityapp.com";
export const GOVERNING_COUNTRY = "India";
export const GOVERNING_LOCATION = "Mumbai, India";

// ==========================
// Permissions your app uses (can add more later)
// ==========================
export const APP_PERMISSIONS = [
  "Notifications – for reminders and alerts",
  "Camera – for journaling or attaching photos",
  "File System/Storage – to save and access user content"
];

// ==========================
// Features your app currently has (can extend later)
// ==========================
export const APP_FEATURES = [
  "AI-based summaries and feedback",
  "Local data storage (SQLite)",
  "Remote data storage (MongoDB)"
];

// ==========================
// Third-party services (can add new ones later)
// ==========================
export const THIRD_PARTY_SERVICES = [
  "Firebase – for authentication and notifications",
  "MongoDB – for remote data storage",
  "AI service providers – for feedback generation"
];

// ==========================
// Terms & Conditions template
// ==========================
export const TERMS_AND_CONDITIONS = `
Effective Date: ${EFFECTIVE_DATE}

Welcome to ${APP_NAME} (“App”, “we”, “our”, or “us”). By signing up, accessing, or using our App, you agree to these Terms & Conditions. If you do not agree, do not use the App.

1. Use of the App
- The App is intended for personal productivity and self-improvement purposes only.
- Users must be at least 13 years old (or the minimum legal age in their jurisdiction).
- You agree not to use the App for illegal, harmful, abusive, or unethical purposes.

2. User Accounts
- You are responsible for keeping your login credentials secure.
- You are responsible for all activity performed using your account.
- You agree to provide accurate and complete information during registration.

3. Data Storage & Security
- Local storage: Some data is stored on your device (e.g., SQLite).
- Remote storage: Some data is stored on our servers or databases (e.g., MongoDB).
- We take reasonable technical measures to secure your data but cannot guarantee absolute security.
- We are not responsible for loss, corruption, or unauthorized access to your data.

4. AI-Generated Feedback
- The App uses AI to provide suggestions, summaries, and insights.
- AI-generated feedback may not be accurate, complete, or reliable.
- Users are responsible for decisions based on AI outputs.
- The App does not provide professional advice (medical, financial, legal, etc.).

5. Device Permissions
- The App may request access to the following permissions:
${APP_PERMISSIONS.map(p => `  - ${p}`).join('\n')}
- Permissions are optional and can be revoked anytime via your device settings.

6. Third-Party Services
- The App may integrate with the following third-party services:
${THIRD_PARTY_SERVICES.map(s => `  - ${s}`).join('\n')}
- Your use of third-party services is subject to their terms and privacy policies.
- We are not liable for any issues arising from third-party services.

7. Intellectual Property
- All app content, logos, trademarks, and AI models are the property of ${APP_NAME} or its licensors.
- You may not copy, modify, distribute, or create derivative works without permission.

8. Limitation of Liability
- The App is provided “as is” and “as available.”
- We are not liable for:
  - AI errors or inaccuracies
  - Data loss or corruption
  - Unauthorized access or security breaches beyond our control
  - Any indirect, incidental, or consequential damages
- Your use of the App is at your own risk.

9. Future Enhancements
- We may introduce new features, updates, or integrations, including additional permissions and AI services.
- By signing up and using the App, you agree to accept all future enhancements and updates under these Terms.
- Once registered, you will not be required to accept updated Terms & Conditions for future changes. Continued use of the App after updates indicates your acceptance.

10. Termination
- We may suspend or terminate your account for violations of these Terms.
- Users may delete their account and data at any time.

11. Privacy
- Please review our Privacy Policy to understand how we collect, store, and process your data.

12. Governing Law
- These Terms are governed by the laws of ${GOVERNING_COUNTRY}.
- Any disputes shall be subject to the exclusive jurisdiction of the courts in ${GOVERNING_LOCATION}.

13. Contact
For questions about these Terms, contact us at:
📧 ${SUPPORT_EMAIL}
`;
