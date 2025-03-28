using AISComp.Components;
using AISComp.Tools;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
	.AddInteractiveServerComponents();
builder.Services.AddServerSideBlazor();

// Register CSVLoader as scoped (for shared data, if needed) and a helper for employee remap/session state.
builder.Services.AddScoped<CSVLoader>();
// SessionEmployees might be your previous scoped service for user-specific data.
// In this example, we are storing data in session via the controller, so it may be omitted.
//builder.Services.AddScoped<SessionEmployees>();

builder.Services.AddHttpClient();

// Add distributed memory cache and session services.
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
	options.IdleTimeout = TimeSpan.FromMinutes(30);
	options.Cookie.HttpOnly = true;
	options.Cookie.IsEssential = true;
});

// Add controllers so that our API controller can be discovered.
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
	app.UseExceptionHandler("/Error", createScopeForErrors: true);
	app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

// IMPORTANT: Use session before mapping endpoints.
app.UseSession().UseAntiforgery();

// Map controllers.
app.MapControllers();

// Map Razor Components.
app.MapRazorComponents<App>()
	.AddInteractiveServerRenderMode();

app.Run();
