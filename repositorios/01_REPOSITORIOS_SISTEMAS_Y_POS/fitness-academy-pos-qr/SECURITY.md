# Security policy

## Reporting a vulnerability

Do not disclose vulnerabilities, credentials, personal data, or exploit details in a public GitHub issue. Contact the repository owner privately through the contact method on their GitHub profile and include only the information needed to reproduce the problem.

## Secret handling

- Never commit `config/api_config.php`, `config/database.php`, `.env` files, cloud publish profiles, private keys, database exports, or runtime uploads.
- Store production secrets in the deployment platform's secret manager and use separate development and production credentials.
- Treat payment keys, SMTP passwords, database credentials, OCR keys, AI-provider keys, and `ATTENDANCE_QR_SECRET` as sensitive.
- Rotate a secret immediately if it appears in a commit, log, issue, artifact, or screenshot. Deleting it from the latest branch does not remove it from Git history.

## Personal and uploaded data

The `uploads/` directory is runtime-only and ignored by Git. It can contain profile photos, resumes, identity documents, and private videos. Production deployments should restrict direct listing, validate uploaded file type and size, use randomized server-side names, and retain data only as long as necessary.

For deployments upgraded from an older revision, confirm that no checkout is active and then securely drop the obsolete `payment_sessions` table. It may contain historical registration data and is no longer used.

## Incident response checklist

1. Revoke or rotate the exposed credential with its provider.
2. Review provider logs for unauthorized use.
3. Remove the data from the current branch and releases/artifacts.
4. If necessary, rewrite Git history with a reviewed tool such as `git filter-repo`, coordinate with collaborators, and force-push protected refs.
5. Ask all collaborators to re-clone after a history rewrite.
6. Add a regression check or ignore rule to prevent recurrence.

History rewriting is disruptive and does not replace credential rotation: existing clones and caches may retain the old objects.
