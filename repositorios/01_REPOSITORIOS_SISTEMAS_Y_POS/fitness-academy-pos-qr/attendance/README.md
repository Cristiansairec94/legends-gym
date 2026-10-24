# Attendance system

The attendance scanner is available through `attendance.php` to authenticated Admin and Staff users. It supports check-in and check-out from the same page and displays recent activity to those roles only.

## Security model

- A user's QR contains a signed opaque token, not a numeric user ID.
- `ATTENDANCE_QR_SECRET` must be configured with a private random value of at least 32 characters.
- QR tokens are rendered in the user's browser and are not sent to an external QR-image service.
- Check-in and check-out require an Admin or Staff session plus a valid CSRF token.
- Recent attendance endpoints require an Admin or Staff session.
- Unsigned, numeric, JSON, and base64-encoded legacy QR values are rejected.

The QR is a permanent bearer credential. Users should protect it like a membership card and report a copied QR to an administrator. Rotating `ATTENDANCE_QR_SECRET` invalidates all previously generated codes.

## Main files

- `attendance.php` — authenticated combined scanner
- `generate_static_qr.php` — creates the signed token for the logged-in user
- `process_checkin.php` — validates the token and records check-in
- `process_checkout.php` — validates the token and records check-out
- `get_recent_checkins.php` — recent authenticated check-ins
- `get_recent_checkouts.php` — recent authenticated check-outs

## Operations

1. Generate and configure `ATTENDANCE_QR_SECRET` as described in `config/API_SETUP.md`.
2. Sign in as Admin or Staff before opening a scanner terminal.
3. Keep the scanner terminal physically supervised and lock the session when unattended.
4. Monitor duplicate or unexpected scans in the audit trail.
5. Rotate the signing secret if QR codes are broadly compromised, then ask users to generate new codes.

The browser needs camera permission and access to the QR rendering/scanning JavaScript dependencies.
