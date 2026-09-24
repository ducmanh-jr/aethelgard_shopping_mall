-- Legacy draft table definition v0.1
-- Legacy draft table definition v0.2
-- Legacy draft table definition v0.3
-- Legacy draft table definition v0.4
-- Legacy draft table definition v0.5
-- Legacy draft table definition v0.6
-- Legacy draft table definition v0.7
-- Legacy draft table definition v0.8
-- Legacy draft table definition v0.9
-- Legacy draft table definition v0.10
-- Legacy draft table definition v0.11
-- Legacy draft table definition v0.12
-- Legacy draft table definition v0.13
-- Legacy draft table definition v0.14
-- Legacy draft table definition v0.15
-- Legacy draft table definition v0.16
-- Legacy draft table definition v0.17
-- Legacy draft table definition v0.18
-- Legacy draft table definition v0.19
-- Legacy draft table definition v0.20
-- Legacy draft table definition v0.21
-- Legacy draft table definition v0.22
-- Legacy draft table definition v0.23
-- Legacy draft table definition v0.24
-- Legacy draft table definition v0.25
-- Legacy draft table definition v0.26
-- Legacy draft table definition v0.27
-- Legacy draft table definition v0.28
-- Legacy draft table definition v0.29
-- Legacy draft table definition v0.30
-- Legacy draft table definition v0.31
-- Legacy draft table definition v0.32
-- Legacy draft table definition v0.33
-- Legacy draft table definition v0.34
-- Legacy draft table definition v0.35
-- Legacy draft table definition v0.36
-- Legacy draft table definition v0.37
-- Legacy draft table definition v0.38
-- Legacy draft table definition v0.39
-- Legacy draft table definition v0.40
-- Legacy draft table definition v0.41
-- Legacy draft table definition v0.42
-- Legacy draft table definition v0.43
-- Legacy draft table definition v0.44
-- Legacy draft table definition v0.45
-- Legacy draft table definition v0.46
-- Legacy draft table definition v0.47
-- Legacy draft table definition v0.48
-- Legacy draft table definition v0.49
-- Legacy draft table definition v0.50
-- Legacy draft table definition v0.51
-- Legacy draft table definition v0.52
-- Legacy draft table definition v0.53
-- Legacy draft table definition v0.54
-- Legacy draft table definition v0.55
-- Legacy draft table definition v0.56
-- Legacy draft table definition v0.57
-- Legacy draft table definition v0.58
-- Legacy draft table definition v0.59
-- Legacy draft table definition v0.60
-- Legacy draft table definition v0.61
-- Legacy draft table definition v0.62
-- Legacy draft table definition v0.63
-- Legacy draft table definition v0.64
-- Legacy draft table definition v0.65
-- Legacy draft table definition v0.66
-- Legacy draft table definition v0.67
-- Legacy draft table definition v0.68
-- Legacy draft table definition v0.69
-- Legacy draft table definition v0.70
-- Legacy draft table definition v0.71
-- Legacy draft table definition v0.72
-- Legacy draft table definition v0.73
-- Legacy draft table definition v0.74
-- Legacy draft table definition v0.75
-- Legacy draft table definition v0.76
-- Legacy draft table definition v0.77
-- Legacy draft table definition v0.78
-- Legacy draft table definition v0.79
-- Legacy draft table definition v0.80
-- Legacy draft table definition v0.81
-- Legacy draft table definition v0.82
-- Legacy draft table definition v0.83
-- Legacy draft table definition v0.84
-- Legacy draft table definition v0.85
﻿IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [Categories] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Slug] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [ImageUrl] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Categories] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [Stores] (
        [Id] int NOT NULL IDENTITY,
        [StoreCode] nvarchar(30) NOT NULL,
        [BrandId] nvarchar(50) NOT NULL,
        [StoreName] nvarchar(200) NOT NULL,
        [StoreType] nvarchar(max) NOT NULL,
        [City] nvarchar(max) NOT NULL,
        [Country] nvarchar(max) NOT NULL,
        [Address] nvarchar(max) NOT NULL,
        [Phone] nvarchar(20) NOT NULL,
        [Email] nvarchar(255) NOT NULL,
        [OperatingHours] nvarchar(max) NOT NULL,
        [Latitude] float NOT NULL,
        [Longitude] float NOT NULL,
        [ServicesJson] nvarchar(max) NULL,
        [CategoriesJson] nvarchar(max) NULL,
        [ImageUrl] nvarchar(max) NULL,
        [StoreUrl] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Stores] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [Transactions] (
        [Id] int NOT NULL IDENTITY,
        [TransactionCode] nvarchar(50) NOT NULL,
        [CustomerName] nvarchar(max) NOT NULL,
        [ProductName] nvarchar(max) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [Quantity] int NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Transactions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [FullName] nvarchar(200) NOT NULL,
        [Email] nvarchar(255) NOT NULL,
        [PasswordHash] nvarchar(max) NOT NULL,
        [Role] int NOT NULL,
        [PhoneNumber] nvarchar(20) NULL,
        [AvatarUrl] nvarchar(max) NULL,
        [IsEmailVerified] bit NOT NULL,
        [ResetOtp] nvarchar(max) NULL,
        [ResetOtpExpiry] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [Products] (
        [Id] int NOT NULL IDENTITY,
        [SellerId] int NOT NULL,
        [CategoryId] int NOT NULL,
        [Name] nvarchar(255) NOT NULL,
        [Slug] nvarchar(300) NOT NULL,
        [Sku] nvarchar(100) NOT NULL,
        [CollectionName] nvarchar(max) NULL,
        [Description] nvarchar(max) NOT NULL,
        [BasePrice] decimal(18,2) NOT NULL,
        [OriginalPrice] decimal(18,2) NULL,
        [DiscountPercent] int NOT NULL,
        [ImageUrl] nvarchar(max) NOT NULL,
        [GalleryUrlsJson] nvarchar(max) NULL,
        [StockQuantity] int NOT NULL,
        [StockStatus] int NOT NULL,
        [Material] nvarchar(max) NULL,
        [CareInstructions] nvarchar(max) NULL,
        [PackagingDetails] nvarchar(max) NULL,
        [CountryOfOrigin] nvarchar(max) NULL,
        [Rating] float NOT NULL,
        [ReviewCount] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Products] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Products_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [Categories] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [Orders] (
        [Id] int NOT NULL IDENTITY,
        [OrderCode] nvarchar(50) NOT NULL,
        [UserId] int NULL,
        [CustomerName] nvarchar(max) NOT NULL,
        [CustomerEmail] nvarchar(max) NOT NULL,
        [CustomerPhone] nvarchar(max) NOT NULL,
        [ShippingAddress] nvarchar(max) NOT NULL,
        [PaymentMethod] nvarchar(max) NOT NULL,
        [Status] int NOT NULL,
        [PaymentStatus] int NOT NULL,
        [Carrier] nvarchar(max) NOT NULL,
        [TrackingCode] nvarchar(max) NOT NULL,
        [EstimatedDelivery] nvarchar(max) NOT NULL,
        [LastUpdateLocation] nvarchar(max) NULL,
        [ProgressStep] int NOT NULL,
        [Subtotal] decimal(18,2) NOT NULL,
        [ShippingCharge] decimal(18,2) NOT NULL,
        [Taxes] decimal(18,2) NOT NULL,
        [Discount] decimal(18,2) NOT NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Orders_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [ProductVariants] (
        [Id] int NOT NULL IDENTITY,
        [ProductId] int NOT NULL,
        [Size] nvarchar(20) NOT NULL,
        [Color] nvarchar(50) NOT NULL,
        [Sku] nvarchar(100) NOT NULL,
        [Price] decimal(18,2) NOT NULL,
        [StockQuantity] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_ProductVariants] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductVariants_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE TABLE [OrderItems] (
        [Id] int NOT NULL IDENTITY,
        [OrderId] int NOT NULL,
        [ProductId] int NULL,
        [ProductName] nvarchar(255) NOT NULL,
        [Specs] nvarchar(max) NOT NULL,
        [ImageUrl] nvarchar(max) NOT NULL,
        [Price] decimal(18,2) NOT NULL,
        [Quantity] int NOT NULL,
        [Subtotal] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_OrderItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_OrderItems_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_OrderItems_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Categories_Slug] ON [Categories] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_OrderItems_OrderId] ON [OrderItems] ([OrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_OrderItems_ProductId] ON [OrderItems] ([ProductId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Orders_OrderCode] ON [Orders] ([OrderCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Orders_UserId] ON [Orders] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_CategoryId] ON [Products] ([CategoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_SellerId] ON [Products] ([SellerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Products_Sku] ON [Products] ([Sku]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Products_Slug] ON [Products] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductVariants_ProductId] ON [ProductVariants] ([ProductId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ProductVariants_Sku] ON [ProductVariants] ([Sku]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Stores_BrandId] ON [Stores] ([BrandId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Stores_StoreCode] ON [Stores] ([StoreCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Transactions_TransactionCode] ON [Transactions] ([TransactionCode]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260921175017_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260921175017_InitialCreate', N'10.0.12');
END;

COMMIT;
GO

