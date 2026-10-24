# 🏋️‍♂️ Fitness Academy - Gym Management System

[![PHP Version](https://img.shields.io/badge/PHP-8.4%2B-blue.svg)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-orange.svg)](https://mysql.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Active-green.svg)](https://github.com/x32u/Fitness-Academy-Management)

A comprehensive web-based gym management system designed to streamline fitness center operations, enhance member experience, and optimize business processes.

## 📋 Table of Contents

- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [User Roles](#user-roles)
- [Payment Integration](#payment-integration)
- [Security Features](#security-features)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)

## ✨ Features

### 🎯 Core Management Features
- **Member Management**: Complete member registration, profile management, and membership plans
- **Class Scheduling**: Advanced class booking system with capacity management
- **Coach Management**: Coach profiles, specializations, and class assignments
- **Payment Processing**: Integrated payment gateway with multiple payment methods
- **Modernized QR Attendance**: Staff-operated check-in/check-out with signed QR codes per user
- **Membership Plans**: Flexible subscription models with automated billing

### 📱 QR Attendance System
- **Signed QR Codes**: Each user gets a tamper-resistant QR code for check-in and check-out
- **Staff Scanner**: Attendance terminals require an authenticated Admin or Staff session
- **Real-time Updates**: Live display of recent check-ins and check-outs
- **Inactive User Support**: Allows attendance tracking with staff warnings
- **Auto-scanner**: Automatic camera activation for seamless user experience

### 📊 Analytics & Reporting
- **Revenue Analytics**: Real-time financial reporting and transaction tracking
- **Member Analytics**: Progress tracking and engagement metrics
- **Attendance Reports**: Detailed attendance patterns and statistics
- **Business Intelligence**: Dashboard with key performance indicators

### 💳 Point of Sale (POS)
- **Cash Transactions**: In-person membership sales and renewals
- **Receipt Generation**: Automated email receipts and transaction records
- **Inventory Management**: Track gym equipment and merchandise

### 🎥 Digital Content Platform
- **Video Courses**: Coach-uploaded fitness content with subscription model
- **Progress Tracking**: Member fitness journey monitoring
- **Online Training**: Virtual coaching and workout programs

### 🔒 Security & Administration
- **Role-Based Access Control**: Admin, Staff, Coach, and Member permissions
- **Audit Trail**: Comprehensive activity logging and user action tracking
- **Data Backup**: Automated database backup and restoration
- **User Activity Monitoring**: Real-time user session management

## 🖥️ System Requirements

### Server Requirements
- **PHP**: 8.4 or higher (use a currently supported release)
- **MySQL**: 5.7 or higher / MariaDB 10.2+
- **Web Server**: Apache 2.4+ or Nginx 1.14+
- **Memory**: 512MB RAM minimum, 2GB recommended
- **Storage**: 10GB minimum for application and media files

### PHP Extensions
```
- PDO and PDO_MySQL
- JSON
- GD or ImageMagick
- cURL
- OpenSSL
- Fileinfo
- Mbstring
```

### Browser Compatibility
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## 🚀 Installation

### 1. Clone Repository
```bash
git clone https://github.com/x32u/Fitness-Academy-Management.git
cd Fitness-Academy-Management
```

### 2. Install Dependencies
```bash
composer install
```

### 3. Database Setup
```sql
-- Create database
CREATE DATABASE fitness_academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Import database schema
mysql -u username -p fitness_academy < schema.sql
```

### 4. Environment Configuration
Copy the ignored configuration templates, then replace every placeholder locally:
```bash
cp config/database.template.php config/database.php
cp config/api_config.template.php config/api_config.php
```

Set `MYSQL_SSL_CA` to a readable trusted CA certificate for the database connection.
Set `PRIVATE_STORAGE_PATH` to a persistent directory outside the public web root for resumes and temporary identity-verification files.
Set `APP_DOMAIN` to the canonical HTTPS origin used for payment and password-reset callbacks.

If upgrading an older deployment, securely remove the obsolete `payment_sessions` table after confirming no checkout is in progress. Older versions placed registration data in that table; the hardened flow keeps pending registration state only in the server-side session.

### 5. File Permissions
```bash
chmod 750 uploads/
chmod 750 uploads/coach_videos/
chmod 750 uploads/coach_resumes/
chmod 750 uploads/discount_ids/
chmod 750 uploads/video_thumbnails/
```

Runtime uploads are intentionally ignored by Git because they can contain profile photos, resumes, identity documents, and private videos. Store them in protected application storage and include them in your private backup process.

The included `.htaccess` files disable script execution, directory listing, resume access, and direct paid-video access on Apache. Configure equivalent deny rules in Nginx, IIS, or your hosting platform before deployment.

## ⚙️ Configuration

### Payment Gateway Setup (PayMongo)
```php
// Set your PayMongo API keys
define('PAYMONGO_SECRET_KEY', 'replace-me');
define('PAYMONGO_PUBLIC_KEY', 'replace-me');
```

### Attendance QR Signing
```php
// Generate with: php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
define('ATTENDANCE_QR_SECRET', 'replace-with-a-private-random-value');
```

Keep this value private and consistent across application instances. Rotating it invalidates existing attendance QR codes. Unsigned and numeric legacy QR codes are rejected.

### Email Configuration (PHPMailer)
```php
// Configure SMTP settings for email notifications
$mail->Host = 'smtp.gmail.com';
$mail->SMTPAuth = true;
$mail->Username = 'your-email@gmail.com';
$mail->Password = 'your-app-password';
$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$mail->Port = 587;
```

### OCR Service Setup
Configure Azure Computer Vision for ID verification:
```php
// config/api_config.php (created from the ignored template)
define('AZURE_CV_API_KEYS', ['your-azure-key']);
define('AZURE_CV_API_URL', 'https://your-region.api.cognitive.microsoft.com/');
```

## 📖 Usage

### Initial Setup
1. **Access the application** at `http://your-domain.com/gym1/`
2. **Provision the first administrator** through a protected database/deployment process using a unique `password_hash(..., PASSWORD_DEFAULT)` value; no default administrator is seeded
3. **Configure membership plans** in the admin dashboard
4. **Set up payment methods** and pricing
5. **Add coaches and staff members**

### Member Registration
- **Online Registration**: Members can register through the website
- **POS Registration**: Staff can register members in-person with cash payments
- **Document Verification**: Automated ID verification for discounts

### Class Management
- **Schedule Classes**: Coaches create and manage their class schedules
- **Member Enrollment**: Online booking with payment processing
- **Capacity Management**: Automatic waitlist handling for popular classes

## 👥 User Roles

### 🔧 Administrator
- Full system access and configuration
- User management and role assignments
- Financial reporting and analytics
- System maintenance and backups

### 👨‍💼 Staff
- Member registration and management
- POS transactions and cash handling
- Attendance tracking and reporting
- Basic customer service functions

### 🏃‍♂️ Coach
- Class creation and management
- Client progress tracking
- Video content upload and management
- Revenue analytics for their services

### 🏋️‍♀️ Member
- Class booking and payment
- Progress tracking and analytics
- Video course access
- Profile and payment management

## 💳 Payment Integration

### Supported Payment Methods
- **Credit/Debit Cards**: Visa, Mastercard, JCB
- **Digital Wallets**: GCash, PayMaya, GrabPay
- **Buy Now, Pay Later**: Billease
- **Cash Payments**: POS system integration

### Payment Features
- **Delegated Processing**: Card and wallet details are handled through PayMongo's hosted payment APIs
- **Automated Receipts**: Email confirmations and digital receipts
- **Subscription Management**: Recurring billing for memberships
- **Refund Processing**: Automated refund handling

## 🛡️ Security Features

### Data Protection
- **Password Hashing**: PHP's adaptive `PASSWORD_DEFAULT` hashing with rehash-on-login
- **SQL Injection Prevention**: Prepared statements and input validation
- **Request Protection**: CSRF validation on payment, attendance, account, class, coach, and administrative write endpoints
- **Session Security**: HTTP-only, SameSite session cookies and session ID rotation after login

### Access Control
- **Role-Based Permissions**: Granular access control system
- **Session Management**: Automatic session expiration
- **Activity Logging**: Comprehensive audit trail
- **IP Monitoring**: Track user access patterns

## 🔌 API Endpoints

Analytics endpoints require an authenticated Administrator session. Class-management endpoints require an authenticated Coach session and a valid CSRF token.

### Membership Data
```
GET /api/get_membership_data.php?days={period}
```

### Revenue Analytics
```
GET /api/get_revenue_data.php?start_date={date}&end_date={date}
```

### Class Management
```
POST /api/manage_class.php
```

## 🤝 Contributing

Please report vulnerabilities using the process in [SECURITY.md](SECURITY.md), not a public issue.

We welcome contributions to improve the Fitness Academy system. Please follow these guidelines:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature/new-feature`
6. Submit a pull request

### Code Standards
- Follow PSR-12 coding standards
- Include comprehensive comments
- Write unit tests for new features
- Ensure responsive design compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ Liability
- ❌ Warranty

## 👨‍💻 Author

Repository: [x32u/Fitness-Academy-Management](https://github.com/x32u/Fitness-Academy-Management)

## 🙏 Acknowledgments

- Built with modern web technologies
- Responsive design for optimal user experience
- Secure authentication and data protection
- Comprehensive business management features

---

**© 2024 Fitness Academy Management System. All rights reserved.**
