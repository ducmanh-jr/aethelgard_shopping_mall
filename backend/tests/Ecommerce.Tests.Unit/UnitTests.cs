using AutoMapper;
using Ecommerce.BLL.Interfaces;
using Ecommerce.BLL.Mappings;
using Ecommerce.BLL.Services;
using Ecommerce.Common.DTOs;
using Ecommerce.Common.Entities;
using Ecommerce.Common.Enums;
using Ecommerce.Common.Exceptions;
using Ecommerce.DAL.Interfaces;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace Ecommerce.Tests.Unit;

public class ServiceUnitTests
{
    private readonly IMapper _mapper;

    public ServiceUnitTests()
    {
        var config = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
        _mapper = config.CreateMapper();
    }

    [Fact]
    public async Task GetInventorySummary_CalculatesCorrectly()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var products = new List<Product>
        {
            new() { Id = 1, Name = "Giày Samba", Sku = "SKU1", BasePrice = 1000000m, StockQuantity = 20, StockStatus = StockStatus.InStock, IsActive = true },
            new() { Id = 2, Name = "Áo Khoác", Sku = "SKU2", BasePrice = 2000000m, StockQuantity = 5, StockStatus = StockStatus.LowStock, IsActive = true }
        };

        var mockRepo = new Mock<IGenericRepository<Product>>();
        mockRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(products);
        mockUow.Setup(u => u.Products).Returns(mockRepo.Object);

        var inventoryService = new InventoryService(mockUow.Object);

        // Act
        var result = await inventoryService.GetInventorySummaryAsync();

        // Assert
        Assert.Equal(2, result.TotalSku);
        Assert.Equal(25, result.TotalStockItems);
        Assert.Equal(30000000m, result.TotalStockValue);
        Assert.Equal(1, result.LowStockAlertCount);
    }

    [Fact]
    public async Task RestockProduct_IncreasesQuantity()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var product = new Product { Id = 10, StockQuantity = 5, StockStatus = StockStatus.LowStock };

        mockUow.Setup(u => u.Products.GetByIdAsync(10)).ReturnsAsync(product);
        mockUow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var inventoryService = new InventoryService(mockUow.Object);

        // Act
        var success = await inventoryService.RestockProductAsync(new RestockRequestDto { ProductId = 10, AdditionalQuantity = 20 });

        // Assert
        Assert.True(success);
        Assert.Equal(25, product.StockQuantity);
        Assert.Equal(StockStatus.InStock, product.StockStatus);
    }

    [Fact]
    public async Task AIStylist_GeneratesRecommendation()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var product = new Product { Id = 101, Name = "Giày Adidas Samba OG", CollectionName = "Adidas Terrace" };
        mockUow.Setup(u => u.Products.GetByIdAsync(101)).ReturnsAsync(product);

        var aiService = new AIService(mockUow.Object);

        // Act
        var result = await aiService.GenerateOutfitRecommendationAsync("phối đồ thế nào", 101);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsFallback);
        Assert.Contains("AI Fashion Stylist", result.Recommendation);
        Assert.Contains("Adidas Samba OG", result.Recommendation);
    }

    [Fact]
    public async Task LoginAsync_ThrowsUnauthorized_WhenAccountIsLocked()
    {
        // Arrange
        var mockUow = new Mock<IUnitOfWork>();
        var lockedUser = new User
        {
            Id = 99,
            Email = "locked@aethelgard.com",
            PasswordHash = AuthService.HashPassword("Password123!"),
            Role = UserRole.Customer,
            IsActive = false,
        };
        var mockUserRepo = new Mock<IGenericRepository<User>>();
        mockUserRepo
            .Setup(r => r.FindAsync(It.IsAny<System.Linq.Expressions.Expression<Func<User, bool>>>()))
            .ReturnsAsync(new List<User> { lockedUser });
        mockUow.Setup(u => u.Users).Returns(mockUserRepo.Object);

        var config = new Mock<IConfiguration>().Object;

        var authService = new AuthService(mockUow.Object, config);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            authService.LoginAsync(new LoginRequestDto { Email = "locked@aethelgard.com", Password = "Password123!" }));
        Assert.Contains("khóa", ex.Message);
    }

    [Fact]
    public async Task GoogleLoginAsync_ThrowsBadRequest_WhenCredentialEmpty()
    {
        var mockUow = new Mock<IUnitOfWork>();
        var config = new Mock<IConfiguration>().Object;
        var authService = new AuthService(mockUow.Object, config);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            authService.GoogleLoginAsync(new GoogleLoginRequestDto { Credential = "" }));
    }
}

// Draft inline mock fixture line 1
// Draft inline mock fixture line 2
// Draft inline mock fixture line 3
// Draft inline mock fixture line 4
// Draft inline mock fixture line 5
// Draft inline mock fixture line 6
// Draft inline mock fixture line 7
// Draft inline mock fixture line 8
// Draft inline mock fixture line 9
// Draft inline mock fixture line 10
// Draft inline mock fixture line 11
// Draft inline mock fixture line 12
// Draft inline mock fixture line 13
// Draft inline mock fixture line 14
// Draft inline mock fixture line 15
// Draft inline mock fixture line 16
// Draft inline mock fixture line 17
// Draft inline mock fixture line 18
// Draft inline mock fixture line 19
// Draft inline mock fixture line 20
// Draft inline mock fixture line 21
// Draft inline mock fixture line 22
// Draft inline mock fixture line 23
// Draft inline mock fixture line 24
// Draft inline mock fixture line 25
// Draft inline mock fixture line 26
// Draft inline mock fixture line 27
// Draft inline mock fixture line 28
// Draft inline mock fixture line 29
// Draft inline mock fixture line 30
// Draft inline mock fixture line 31
// Draft inline mock fixture line 32
// Draft inline mock fixture line 33
// Draft inline mock fixture line 34
// Draft inline mock fixture line 35
// Draft inline mock fixture line 36
// Draft inline mock fixture line 37
// Draft inline mock fixture line 38
// Draft inline mock fixture line 39
// Draft inline mock fixture line 40
