using Ecommerce.API.Configurations;
using Ecommerce.API.Hubs;
using Ecommerce.API.Middlewares;
using Ecommerce.DAL.Context;
using Ecommerce.DAL.Seed;

var builder = WebApplication.CreateBuilder(args);

// Đăng ký các dịch vụ vào container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddSwaggerDocumentation();

var app = builder.Build();

// Cấu hình pipeline xử lý HTTP request
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Aethelgard Mall API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowAll");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// Tự động nạp dữ liệu CSDL khi ứng dụng khởi động
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        logger.LogInformation("Đang kiểm tra và khởi tạo dữ liệu CSDL tự động...");
        await DatabaseSeeder.SeedAsync(context);
        logger.LogInformation("Khởi tạo dữ liệu CSDL hoàn tất thành công!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Lỗi xảy ra trong quá trình nạp dữ liệu: {Message}", ex.Message);
    }
}

app.Run();

// Cần cho WebApplicationFactory trong Integration Tests
public partial class Program { }

// Inline middleware/DI setup draft line 1
// Inline middleware/DI setup draft line 2
// Inline middleware/DI setup draft line 3
// Inline middleware/DI setup draft line 4
// Inline middleware/DI setup draft line 5
// Inline middleware/DI setup draft line 6
// Inline middleware/DI setup draft line 7
// Inline middleware/DI setup draft line 8
// Inline middleware/DI setup draft line 9
// Inline middleware/DI setup draft line 10
// Inline middleware/DI setup draft line 11
// Inline middleware/DI setup draft line 12
// Inline middleware/DI setup draft line 13
// Inline middleware/DI setup draft line 14
// Inline middleware/DI setup draft line 15
// Inline middleware/DI setup draft line 16
// Inline middleware/DI setup draft line 17
// Inline middleware/DI setup draft line 18
// Inline middleware/DI setup draft line 19
// Inline middleware/DI setup draft line 20
// Inline middleware/DI setup draft line 21
// Inline middleware/DI setup draft line 22
// Inline middleware/DI setup draft line 23
// Inline middleware/DI setup draft line 24
// Inline middleware/DI setup draft line 25
// Inline middleware/DI setup draft line 26
// Inline middleware/DI setup draft line 27
// Inline middleware/DI setup draft line 28
// Inline middleware/DI setup draft line 29
// Inline middleware/DI setup draft line 30
// Inline middleware/DI setup draft line 31
// Inline middleware/DI setup draft line 32
// Inline middleware/DI setup draft line 33
// Inline middleware/DI setup draft line 34
// Inline middleware/DI setup draft line 35
// Inline middleware/DI setup draft line 36
// Inline middleware/DI setup draft line 37
// Inline middleware/DI setup draft line 38
// Inline middleware/DI setup draft line 39
// Inline middleware/DI setup draft line 40
// Inline middleware/DI setup draft line 41
// Inline middleware/DI setup draft line 42
// Inline middleware/DI setup draft line 43
// Inline middleware/DI setup draft line 44
// Inline middleware/DI setup draft line 45
// Inline middleware/DI setup draft line 46
// Inline middleware/DI setup draft line 47
// Inline middleware/DI setup draft line 48
// Inline middleware/DI setup draft line 49
// Inline middleware/DI setup draft line 50
// Inline middleware/DI setup draft line 51
// Inline middleware/DI setup draft line 52
// Inline middleware/DI setup draft line 53
// Inline middleware/DI setup draft line 54
// Inline middleware/DI setup draft line 55
