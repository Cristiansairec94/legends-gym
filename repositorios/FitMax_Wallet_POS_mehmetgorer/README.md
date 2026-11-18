# FitMax - Gym Automation Web Application

FitMax is a gym automation web application developed with **ASP.NET Core MVC**.  
It includes user membership, trainer management, product sales, shopping cart, wallet, order tracking, role management and an admin panel.

FitMax, **ASP.NET Core MVC** ile geliştirilmiş bir spor salonu otomasyon web uygulamasıdır.  
Projede üyelik sistemi, eğitmen yönetimi, ürün satışı, sepet, cüzdan, sipariş takibi, rol yönetimi ve admin paneli bulunmaktadır.

---

## Quick Links

- [Türkçe Açıklama](#tr-fitmax---spor-salonu-otomasyonu)
- [English Description](#en-fitmax---gym-automation-web-application)
- [Screenshots / Ekran Görüntüleri](#screenshots)

---

<a id="tr-fitmax---spor-salonu-otomasyonu"></a>

## TR: FitMax - Spor Salonu Otomasyonu

FitMax, spor salonlarının dijital ortamda yönetilebilmesi için geliştirilmiş kapsamlı bir web otomasyon projesidir. Proje yalnızca bir tanıtım web sitesi değil; aynı zamanda kullanıcıların sisteme üye olabildiği, salon paketlerini inceleyebildiği, spor ürünlerini satın alabildiği, cüzdan bakiyesini yönetebildiği ve eğitmenlerle özel ders süreçlerini takip edebildiği bir sistemdir.

Admin tarafında ise üyeler, eğitmenler, ürünler, siparişler, salon paketleri ve kullanıcı yetkileri yönetilebilir. Böylece bir spor salonunun hem müşteri tarafı hem de yönetim tarafı tek bir panel üzerinden kontrol edilebilir.

### Öne Çıkan Özellikler

- Kullanıcı kayıt ve giriş sistemi
- ASP.NET Identity ile kimlik doğrulama
- Rol bazlı yetkilendirme
- Admin paneli
- Üye ve eğitmen yönetimi
- Eğitmen fiyatı ve özel ders yönetimi
- Salon üyelik paketleri
- Ürün listeleme, arama ve kategori filtreleme
- Sepete ürün ekleme ve adet güncelleme
- Sipariş oluşturma ve sipariş takibi
- Cüzdan sistemi ve bakiye yükleme
- Cüzdan hareketleri takibi
- Teslim edilen / teslim edilmeyen sipariş yönetimi
- Kullanıcı profil sayfası
- Eğitmen profil güncelleme sayfası
- Admin dashboard istatistikleri
- Admin rol / yetki yönetimi

### Kullanıcı Tarafı

Kullanıcılar sisteme kayıt olabilir, giriş yapabilir, ürünleri inceleyebilir, ürünleri sepete ekleyebilir, sepetini yönetebilir ve cüzdanına bakiye yükleyebilir. Ayrıca kullanıcı paneli üzerinden üyelik paketi, fiziksel bilgiler, siparişler ve özel ders bilgileri takip edilebilir.

### Eğitmen Tarafı

Eğitmen rolündeki kullanıcılar kendi profil bilgilerini güncelleyebilir. Açıklama, sosyal medya bağlantıları ve profil fotoğrafı gibi bilgiler eğitmen sayfası üzerinden düzenlenebilir. Eğitmenler ayrıca kendileriyle ilişkili özel ders ve sipariş süreçlerini takip edebilir.

### Admin Paneli

Admin paneli, spor salonu yöneticisinin sistemi merkezi olarak yönetmesini sağlar.

Admin panelinde bulunan başlıca bölümler:

- Dashboard
- Eğitmenler
- Üyeler
- Ürünler
- Siparişler
- Salon paketleri
- Yetkiler / roller

Admin; eğitmenleri, üyeleri, ürünleri, siparişleri ve salon paketlerini yönetebilir. Ayrıca kullanıcıları admin rolüne ekleyebilir veya mevcut yetkileri kaldırabilir.

### Kullanılan Teknolojiler

- ASP.NET Core MVC
- C#
- Entity Framework Core
- SQL Server
- ASP.NET Identity
- AutoMapper
- Dependency Injection
- Repository Pattern
- Unit of Work Pattern
- Razor Views
- HTML
- CSS
- JavaScript
- Bootstrap / Admin Template

### Mimari Yapı

Proje katmanlı mimari yaklaşımıyla geliştirilmiştir. Bu yapı sayesinde kodun bakımı, geliştirilmesi ve genişletilmesi daha kolay hale getirilmiştir.

Proje 4 ana katmandan oluşmaktadır:

- **Entity Layer:** Entity sınıfları, view model yapıları ve servis arayüzleri.
- **Data Access Layer:** DbContext, Identity yapısı, repository, migration ve Unit of Work işlemleri.
- **Service Layer:** İş kuralları ve uygulama servisleri.
- **Presentation Layer:** MVC controller, view, view component ve statik dosyalar.

### Proje Yapısı

```text
FitMax
├── Domains
│   └── FitMax.Entity
│       ├── Entities
│       ├── Interfaces
│       ├── IService
│       ├── UnitOfWorks
│       └── ViewModels
│
├── Infrastructures
│   ├── FitMax.DataAccess
│   │   ├── Contexts
│   │   ├── Identity
│   │   ├── Migrations
│   │   ├── Repositories
│   │   └── UnitOfWorks
│   │
│   └── FitMax.Service
│       ├── Extensions
│       ├── Mapping
│       └── Services
│
└── Presentation
    └── FitMax.Mvc
        ├── Controllers
        ├── Models
        ├── ViewComponents
        ├── Views
        ├── wwwroot
        ├── appsettings.json
        └── Program.cs
```

### Veritabanı

Proje **SQL Server** veritabanı ile çalışmaktadır. Entity Framework Core migration yapısı kullanılarak veritabanı tabloları oluşturulmuştur.

Kullanıcı ve rol yönetimi için **ASP.NET Identity** altyapısı kullanılmaktadır.

> Not: Gerçek veritabanı bağlantı bilgileri, API key veya şifreler repoya eklenmemelidir. `appsettings.json` içinde örnek connection string bırakılmalı, gerçek bilgiler local ortamda veya environment variable ile yönetilmelidir.

### Kurulum

Projeyi local ortamda çalıştırmak için:

```bash
git clone https://github.com/mehmetgorer/FitMax.git
cd FitMax
```

`Presentation/FitMax.Mvc/appsettings.json` dosyasındaki connection string alanını kendi SQL Server bağlantınıza göre düzenleyin:

```json
"ConnectionStrings": {
  "ConnStr": "Data Source=YOUR_SERVER;Initial Catalog=FitMaxKey;User ID=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=true"
}
```

Migration işlemlerini çalıştırın:

```bash
dotnet ef database update
```

Projeyi çalıştırın:

```bash
dotnet run --project FitMax.Mvc
```

Uygulama local ortamda benzer adreslerde çalışacaktır:

```text
https://localhost:7193
http://localhost:5064
```

---

<a id="en-fitmax---gym-automation-web-application"></a>

## EN: FitMax - Gym Automation Web Application

FitMax is a gym automation web application developed with ASP.NET Core MVC. The project is designed to manage both the customer-facing side and the administrative side of a gym.

Users can register, log in, browse products, add products to the cart, manage wallet balance, view gym membership packages and track their personal information. Trainer users can update their trainer profile and follow lesson-related operations.

On the admin side, gym managers can manage members, trainers, products, orders, membership packages and user roles through a centralized admin panel.

### Key Features

- User registration and login
- Authentication with ASP.NET Identity
- Role-based authorization
- Admin dashboard
- Member and trainer management
- Trainer pricing and private lesson management
- Gym membership packages
- Product listing, search and category filtering
- Shopping cart operations
- Order tracking
- Wallet system and balance transactions
- Delivered / undelivered order management
- User profile page
- Trainer profile update page
- Product stock and sales status management
- Role and permission management

### User Side

Users can create accounts, log in, browse products, add products to the cart and manage their wallet balance. The user profile page displays package information, physical information, order history and private lesson records.

### Trainer Side

Trainer users can access their trainer profile page and update personal information such as description, social media links and profile image. Trainer-related lesson and order information can also be tracked.

### Admin Panel

The admin panel provides management features for the core gym operations.

Main admin sections:

- Dashboard
- Trainers
- Members
- Products
- Orders
- Gym packages
- Roles / permissions

Admins can manage trainers, members, product stock, orders, gym packages and user roles from a single panel.

### Technologies Used

- ASP.NET Core MVC
- C#
- Entity Framework Core
- SQL Server
- ASP.NET Identity
- AutoMapper
- Dependency Injection
- Repository Pattern
- Unit of Work Pattern
- Razor Views
- HTML
- CSS
- JavaScript
- Bootstrap / Admin Template

### Architecture

The project follows a layered architecture approach. This structure improves maintainability, scalability and separation of concerns.

The project consists of 4 main layers:

- **Entity Layer:** Entity models, view models and service interfaces.
- **Data Access Layer:** DbContext, Identity classes, repositories, migrations and Unit of Work.
- **Service Layer:** Business logic and application services.
- **Presentation Layer:** MVC controllers, views, view components and static files.

### Database

The project uses **SQL Server** as the database. Entity Framework Core migrations are used to create and update the database schema.

**ASP.NET Identity** is used for user and role management.

> Note: Real database credentials, API keys or passwords should not be committed to the repository. Use sample values in `appsettings.json` and manage real credentials locally or through environment variables.

### Installation

Clone the repository:

```bash
git clone https://github.com/mehmetgorer/FitMax.git
cd FitMax
```

Update the connection string in `Presentation/FitMax.Mvc/appsettings.json`:

```json
"ConnectionStrings": {
  "ConnStr": "Data Source=YOUR_SERVER;Initial Catalog=FitMaxKey;User ID=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=true"
}
```

Apply database migrations:

```bash
dotnet ef database update
```

Run the project:

```bash
dotnet run --project FitMax.Mvc
```

The application will run locally on a similar address:

```text
https://localhost:7193
http://localhost:5064
```

---

<a id="screenshots"></a>

## Screenshots / Ekran Görüntüleri

### 1. Ana Sayfa / Home Page
![Screenshot 1](./Screenshots/1.png)

### 2. Ana Sayfa İçerik Bölümü / Home Content Section
![Screenshot 2](./Screenshots/2.png)

### 3. Programlar Bölümü / Programs Section
![Screenshot 3](./Screenshots/3.png)

### 4. Eğitmenler Bölümü / Trainers Section
![Screenshot 4](./Screenshots/4.png)

### 5. Salon Paketleri / Gym Packages
![Screenshot 5](./Screenshots/5.png)

### 6. Üyelik Sayfası / Registration Page
![Screenshot 6](./Screenshots/6.png)

### 7. Kullanıcı Paneli / User Panel
![Screenshot 7](./Screenshots/7.png)

### 8. Ürünler Sayfası / Products Page
![Screenshot 8](./Screenshots/8.png)

### 9. Ürün Listeleme / Product Listing
![Screenshot 9](./Screenshots/9.png)

### 10. Sepet / Cart
![Screenshot 10](./Screenshots/10.png)

### 11. Cüzdana Bakiye Yükleme / Add Balance to Wallet
![Screenshot 11](./Screenshots/11.png)

### 12. Sipariş Geçmişi / Order History
![Screenshot 12](./Screenshots/12.png)

### 13. Cüzdan Sayfası / Wallet Page
![Screenshot 13](./Screenshots/13.png)

### 14. Admin Dashboard
![Screenshot 14](./Screenshots/14.png)

### 15. Admin Eğitmen Yönetimi / Admin Trainer Management
![Screenshot 15](./Screenshots/15.png)

### 16. Admin Üye Yönetimi / Admin Member Management
![Screenshot 16](./Screenshots/16.png)

### 17. Admin Ürün Yönetimi / Admin Product Management
![Screenshot 17](./Screenshots/17.png)

### 18. Admin Sipariş Yönetimi / Admin Order Management
![Screenshot 18](./Screenshots/18.png)

### 19. Admin Salon Paketleri / Admin Gym Packages
![Screenshot 19](./Screenshots/19.png)

### 20. Admin Yetki Yönetimi / Admin Role Management
![Screenshot 20](./Screenshots/20.png)

### 21. Eğitmen Profil Güncelleme / Trainer Profile Update
![Screenshot 21](./Screenshots/21.png)

### 22. Şifre Yenileme / Password Renewal
![Screenshot 22](./Screenshots/22.png)
