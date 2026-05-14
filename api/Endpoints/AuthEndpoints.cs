using System.Security.Claims;
using Api.Data;
using Api.Models;
using Api.Services;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;

namespace Api.Endpoints;

public static class AuthEndpoints
{
    public record GoogleLoginRequest(string IdToken);

    public record AuthResponse(string Token, UserDto User);

    public record UserDto(Guid Id, string Email, string DisplayName, string? AvatarUrl);

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/google", async (
            GoogleLoginRequest request,
            AppDbContext db,
            TokenService tokenService,
            IConfiguration config) =>
        {
            // Validate Google ID token
            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = [config["Google:ClientId"]!]
                };
                payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
            }
            catch (InvalidJwtException)
            {
                return Results.Unauthorized();
            }

            // Upsert user
            var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == payload.Subject);

            if (user is null)
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    GoogleId = payload.Subject,
                    Email = payload.Email,
                    DisplayName = payload.Name ?? payload.Email,
                    AvatarUrl = payload.Picture,
                    CreatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);
            }
            else
            {
                // Update profile info from Google
                user.DisplayName = payload.Name ?? payload.Email;
                user.AvatarUrl = payload.Picture;
            }

            await db.SaveChangesAsync();

            // Generate JWT
            var token = tokenService.GenerateToken(
                user.Id, user.Email, user.DisplayName, user.AvatarUrl);

            return Results.Ok(new AuthResponse(
                token,
                new UserDto(user.Id, user.Email, user.DisplayName, user.AvatarUrl)));
        });

        group.MapGet("/me", (ClaimsPrincipal principal) =>
        {
            var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var email = principal.FindFirstValue(ClaimTypes.Email)!;
            var displayName = principal.FindFirstValue("display_name")!;
            var avatarUrl = principal.FindFirstValue("avatar_url");

            return Results.Ok(new UserDto(userId, email, displayName, avatarUrl));
        }).RequireAuthorization();
    }
}
