using System.Security.Claims;
using Api.Data;
using Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Api.Endpoints;

public static class RoomEndpoints
{
    public record CreateRoomRequest(string Name, string Emoji);

    public record RoomDto(Guid Id, string Name, string Emoji, Guid CreatedByUserId, string CreatedByName, DateTime CreatedAt, int MemberCount);

    public static void MapRoomEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/rooms").RequireAuthorization();

        // Get rooms the current user is a member of
        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var rooms = await db.RoomMembers
                .Where(rm => rm.UserId == userId)
                .OrderByDescending(rm => rm.Room.CreatedAt)
                .Select(rm => new RoomDto(
                    rm.Room.Id,
                    rm.Room.Name,
                    rm.Room.Emoji,
                    rm.Room.CreatedByUserId,
                    rm.Room.CreatedBy.DisplayName,
                    rm.Room.CreatedAt,
                    rm.Room.Members.Count))
                .ToListAsync();

            return Results.Ok(rooms);
        });

        // Discover all rooms (that user is NOT a member of)
        group.MapGet("/discover", async (ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var rooms = await db.Rooms
                .Where(r => !r.Members.Any(m => m.UserId == userId))
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new RoomDto(
                    r.Id,
                    r.Name,
                    r.Emoji,
                    r.CreatedByUserId,
                    r.CreatedBy.DisplayName,
                    r.CreatedAt,
                    r.Members.Count))
                .ToListAsync();

            return Results.Ok(rooms);
        });

        // Create room
        group.MapPost("/", async (CreateRoomRequest request, ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var room = new Room
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Emoji = request.Emoji,
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            db.Rooms.Add(room);

            // Creator auto-joins the room
            db.RoomMembers.Add(new RoomMember
            {
                RoomId = room.Id,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(userId);

            return Results.Created($"/api/rooms/{room.Id}", new RoomDto(
                room.Id, room.Name, room.Emoji, userId, user!.DisplayName, room.CreatedAt, 1));
        });

        // Join room
        group.MapPost("/{roomId:guid}/join", async (Guid roomId, ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var roomExists = await db.Rooms.AnyAsync(r => r.Id == roomId);
            if (!roomExists)
                return Results.NotFound();

            var alreadyMember = await db.RoomMembers
                .AnyAsync(rm => rm.RoomId == roomId && rm.UserId == userId);

            if (alreadyMember)
                return Results.Conflict("Already a member of this room");

            db.RoomMembers.Add(new RoomMember
            {
                RoomId = roomId,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
            return Results.Ok();
        });

        // Leave room
        group.MapDelete("/{roomId:guid}/leave", async (Guid roomId, ClaimsPrincipal principal, AppDbContext db) =>
        {
            var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var membership = await db.RoomMembers
                .FirstOrDefaultAsync(rm => rm.RoomId == roomId && rm.UserId == userId);

            if (membership is null)
                return Results.NotFound();

            db.RoomMembers.Remove(membership);
            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }
}
