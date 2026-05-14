using Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Api.Endpoints;

public static class ChatEndpoints
{
    public record MessageDto(
        Guid Id,
        string Emoji,
        UserInfo User,
        DateTime CreatedAt,
        List<ReactionDto> Reactions);

    public record ReactionDto(
        Guid Id,
        string Emoji,
        UserInfo User,
        DateTime CreatedAt,
        List<ReactionDto> ChildReactions);

    public record UserInfo(Guid Id, string DisplayName, string? AvatarUrl);

    public static void MapChatEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/rooms/{roomId:guid}").RequireAuthorization();

        // Get paginated messages for a room
        group.MapGet("/messages", async (
            Guid roomId,
            AppDbContext db,
            DateTime? before,
            int limit = 50) =>
        {
            limit = Math.Clamp(limit, 1, 100);
            var cutoff = before ?? DateTime.UtcNow;

            var messages = await db.Messages
                .Where(m => m.RoomId == roomId && m.CreatedAt < cutoff)
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit)
                .Select(m => new MessageDto(
                    m.Id,
                    m.Emoji,
                    new UserInfo(m.User.Id, m.User.DisplayName, m.User.AvatarUrl),
                    m.CreatedAt,
                    m.Reactions
                        .Where(r => r.MessageId != null)
                        .Select(r => MapReaction(r))
                        .ToList()))
                .ToListAsync();

            // Return in chronological order
            messages.Reverse();

            return Results.Ok(messages);
        });
    }

    private static ReactionDto MapReaction(Api.Models.Reaction r)
    {
        return new ReactionDto(
            r.Id,
            r.Emoji,
            new UserInfo(r.User.Id, r.User.DisplayName, r.User.AvatarUrl),
            r.CreatedAt,
            r.ChildReactions
                .Select(cr => MapReaction(cr))
                .ToList());
    }
}
