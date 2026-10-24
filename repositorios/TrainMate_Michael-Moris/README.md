# 🏋️‍♂️ TrainMate – Gym Management System

**TrainMate** is a full-featured **Gym Management System** built with **ASP.NET Core MVC**, following **Clean Architecture** and industry best practices.
It enables gym administrators to efficiently manage members, trainers, sessions, bookings, and attendance — all within one streamlined platform.

---

## 🚀 Key Features

- 🧍 Manage **Members**, **Trainers**, and **Membership Plans**  
- 📅 Create & Manage **Training Sessions** with live slot tracking  
- 📝 Book sessions and manage **Attendance** easily  
- 🔐 Secure **Role-Based Authentication** (SuperAdmin / Admin)  
- 🧱 Built with **Layered Clean Architecture** for long-term maintainability  
- 💻 Modern responsive UI using **Bootstrap 5**

---

## ⚙️ Tech Stack

| Category | Technology |
|-----------|-------------|
| 💻 Backend | ASP.NET Core 9 MVC |
| 🧩 ORM | Entity Framework Core |
| 🗃️ Database | Microsoft SQL Server |
| 🧠 Mapping | AutoMapper |
| 🧱 Architecture | Repository & Unit of Work |
| 💉 Dependency Injection | Built-in ASP.NET Core DI |
| 🔐 Authentication | ASP.NET Identity (Role-based) |
| 🎨 Frontend | Bootstrap 5, jQuery, Font Awesome |

---

## 🧩 Solution Structure

```
├── GymManagementPL # Presentation Layer (MVC Controllers & Views)
├── GymManagementBLL # Business Logic Layer (Services, ViewModels)
├── GymManagementDAL # Data Access Layer (Repositories, Entities, Context)
├── GymManagementSystem.sln # Main Solution File
```

---

### 🧱 Design Patterns Used

| Pattern | Description |
|----------|-------------|
| 💉 **Dependency Injection (DI)** | Provides loose coupling between classes and promotes testability. |
| 🗂️ **Repository Pattern** | Centralizes data access logic and keeps EF Core usage consistent. |
| 🔁 **Unit of Work Pattern** | Ensures all database operations within a transaction are atomic. |
| 🧠 **Service Layer Pattern** | Encapsulates business logic and keeps controllers lightweight. |
| 🔄 **AutoMapper** | Automatically maps between Entities and ViewModels. |
| 📎 **Utility & Attachment Services** | Handles reusable logic such as file uploads and shared helpers. |

---

## 🧭 Getting Started

### 1️⃣ Clone the repository

   ```bash
   git clone https://github.com/Michael-Moris/TrainMate.git
   cd TrainMate
   ```

### 2️⃣ Open the project

   Open TrainMate.sln in Visual Studio and set GymManagementPL as the startup project.
   
### 3️⃣ Configure the database connection

   Update the connection string inside appsettings.json if needed:
   
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=.;Database=TrainMateDB;Trusted_Connection=True;TrustServerCertificate=True;"
   }
   ```

### 4️⃣ Apply database migrations

   ```bash
   update-database
   ```

### 5️⃣ Run the project

   Press F5 or click Run — the app will open automatically
   
---

## 👥 Login Accounts

| Role | Email | Password |
|------|--------|-----------|
|  **SuperAdmin** | `michaelmorisdev@gmail.com` | `P@ssw0rd` |
|  **Admin** | `markspector@gmail.com` | `P@ssw0rd` |

---

## 🤝 Contributing  
Contributions, issues, and feature requests are always welcome!  
If you’d like to improve **TrainMate**, feel free to **fork** the repository, make your changes, and **submit a pull request**.  

⭐ Don’t forget to give the project a **star** if you find it helpful!

---
