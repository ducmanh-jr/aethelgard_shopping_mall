# Aethelgard Mall — Fullstack E-Commerce Platform

Hệ thống Thương mại Điện tử Fullstack xây dựng theo kiến trúc **Clean Architecture** với **ASP.NET Core (.NET 10)** ở Backend, **Vue 3 + TypeScript** ở Frontend, hỗ trợ **SQL Server / SQLite**, thông báo thời gian thực qua **SignalR**, thanh toán **VNPay** và trợ lý **AI Stylist** (Google Gemini).

---

## Tính năng chính

- **Xác thực & Phân quyền (Auth & RBAC):** Đăng ký, đăng nhập với JWT Bearer Token, bảo vệ endpoint theo vai trò (`Admin`, `Customer`).
- **Quản lý Sản phẩm & Kho hàng:** CRUD sản phẩm, biến thể sản phẩm (`ProductVariant`), danh mục (`Category`), lọc/tìm kiếm và kiểm soát tồn kho.
- **Giỏ hàng, Đơn hàng & Thanh toán:** Đặt hàng, theo dõi và lọc trạng thái đơn hàng, tích hợp luồng thanh toán VNPay.
- **Quản trị & Thống kê:** Dashboard thống kê doanh thu/đơn hàng, quản lý cửa hàng (`Store`) và đánh giá (`Review`).
- **AI Stylist & Tạo mô tả sản phẩm:** Gợi ý phối đồ và sinh nội dung mô tả sản phẩm tự động thông qua Gemini API.
- **Thông báo Real-time:** Kết nối SignalR (`NotificationHub`) cập nhật trạng thái đơn hàng tức thì.

---

## Tech Stack

| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| **Backend** | C# / .NET 10, ASP.NET Core Web API (Clean Architecture: `Ecommerce.API`, `Ecommerce.BLL`, `Ecommerce.DAL`, `Ecommerce.Common`) |
| **Data & Validation** | Entity Framework Core 10, AutoMapper, FluentValidation, Rate Limiting, Global Exception Middleware |
| **Auth & Realtime** | JWT Bearer Authentication, SignalR, Swashbuckle (Swagger / OpenAPI) |
| **Frontend** | Vue 3 (`^3.5`), TypeScript (`^5.7`), Vite (`^6.1`), Vue Router 4, Axios |
| **Database** | Microsoft SQL Server (mặc định trong `appsettings.json`), hỗ trợ SQLite cho môi trường dev/test cục bộ (`appsettings.Development.json`) |
| **Testing & DevOps** | xUnit, Moq, `WebApplicationFactory` (5 Unit Tests + 12 Integration Tests), Docker |

---

## Cấu trúc thư mục

```text
├── backend/                          # .NET 10 Web API Solution (Ecommerce.slnx)
│   ├── database/                     # Script SQL Server (schema.sql, seed-data.sql)
│   ├── src/
│   │   ├── Ecommerce.API/            # Controllers, Middlewares, Hubs, DI & Swagger setup
│   │   ├── Ecommerce.BLL/            # Business Services, Validators, AutoMapper Profiles
│   │   ├── Ecommerce.DAL/            # DbContext, Migrations, Repositories, UnitOfWork, Seeder
│   │   └── Ecommerce.Common/         # Entities, DTOs, Enums, Constants, Custom Exceptions
│   ├── tests/
│   │   ├── Ecommerce.Tests.Unit/     # Unit Tests cho Business Logic Layer (5 tests)
│   │   └── Ecommerce.Tests.Integration/ # Integration Tests cho Web API (12 tests)
│   └── Dockerfile
├── frontend/                         # Vue 3 + TypeScript + Vite SPA
│   └── src/
│       ├── api/                      # Axios client cấu hình proxy /api
│       ├── components/               # Navbar, ProductFormModal, CartCheckoutPanel
│       ├── router/                   # Vue Router
│       ├── services/                 # API service wrappers
│       ├── stores/                   # Auth state management
│       ├── types/                    # TypeScript models
│       └── views/                    # LoginView, ProductsView, OrdersView, AiAssistantView
├── .env.example                      # Mẫu biến môi trường (GEMINI_API_KEY, ports)
├── .gitignore
└── README.md
```

---

## Hướng dẫn cài đặt & chạy dự án

### Yêu cầu môi trường
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (LTS 20+ khuyến nghị) & npm
- SQL Server (nếu chạy chế độ `SqlServer`; mặc định môi trường `Development` có thể dùng SQLite cục bộ)

### 1. Cấu hình biến môi trường
Sao chép file mẫu `.env.example` thành `.env` ở thư mục gốc và điền `GEMINI_API_KEY` (nếu sử dụng tính năng AI Stylist):

```bash
cp .env.example .env
```

### 2. Chạy Backend (.NET 10 Web API)

```bash
cd backend
dotnet restore
dotnet run --project src/Ecommerce.API/Ecommerce.API.csproj --launch-profile http
```

- API & Swagger UI (Development): `http://localhost:5000/swagger`
- Để sử dụng **SQL Server** (`MSSQL$SQLEXPRESS`), bật SQL Server service và cấu hình `"DatabaseProvider": "SqlServer"` cùng `ConnectionStrings` trong `appsettings.Development.json` (hoặc qua `dotnet user-secrets`).

### 3. Chạy Frontend (Vue 3 + Vite)

```bash
cd frontend
npm install
npm run dev
```

- Giao diện Web: `http://localhost:3001` (tự động proxy `/api` sang `http://localhost:5000`).
- Build production: `npm run build`

---

## Kiểm thử (Testing)

Chạy toàn bộ Unit Tests và Integration Tests của Backend:

```bash
cd backend
dotnet test Ecommerce.slnx
```

Kết quả mong đợi: **17/17 tests passed** (`5` Unit Tests + `12` Integration Tests).
