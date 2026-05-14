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

    private sealed record MessageProjection(
        Guid Id,
        string Emoji,
        UserInfo User,
        DateTime CreatedAt);

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

            var messageProjections = await db.Messages
                .AsNoTracking()
                .Where(m => m.RoomId == roomId && m.CreatedAt < cutoff)
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit)
                .Select(m => new MessageProjection(
                    m.Id,
                    m.Emoji,
                    new UserInfo(m.User.Id, m.User.DisplayName, m.User.AvatarUrl),
                    m.CreatedAt))
                .ToListAsync();

            var messageIds = messageProjections
                .Select(m => m.Id)
                .ToList();

            var reactions = await LoadReactionTreeAsync(db, messageIds);

            var rootReactionsByMessageId = reactions
                .Where(r => r.MessageId.HasValue)
                .OrderBy(r => r.CreatedAt)
                .ToLookup(r => r.MessageId!.Value);

            var childReactionsByParentId = reactions
                .Where(r => r.ParentReactionId.HasValue)
                .OrderBy(r => r.CreatedAt)
                .ToLookup(r => r.ParentReactionId!.Value);

            var messages = messageProjections
                .Select(m => new MessageDto(
                    m.Id,
                    m.Emoji,
                    m.User,
                    m.CreatedAt,
                    rootReactionsByMessageId[m.Id]
                        .Select(r => MapReaction(r, childReactionsByParentId))
                        .ToList()))
                .ToList();

            // Return in chronological order
            messages.Reverse();

            return Results.Ok(messages);
        });
    }

    private static async Task<List<Api.Models.Reaction>> LoadReactionTreeAsync(
        AppDbContext db,
        IReadOnlyCollection<Guid> messageIds)
    {
        if (messageIds.Count == 0)
        {
            return [];
        }

        var allReactions = new List<Api.Models.Reaction>();
        var seenReactionIds = new HashSet<Guid>();

        var pendingParentIds = (await db.Reactions
                .AsNoTracking()
                .Where(r => r.MessageId.HasValue && messageIds.Contains(r.MessageId.Value))
                .Include(r => r.User)
                .OrderBy(r => r.CreatedAt)
                .ToListAsync())
            .Where(r => seenReactionIds.Add(r.Id))
            .Select(r =>
            {
                allReactions.Add(r);
                return r.Id;
            })
            .ToList();

        while (pendingParentIds.Count > 0)
        {
            var parentIds = pendingParentIds;

            pendingParentIds = (await db.Reactions
                    .AsNoTracking()
                    .Where(r => r.ParentReactionId.HasValue && parentIds.Contains(r.ParentReactionId.Value))
                    .Include(r => r.User)
                    .OrderBy(r => r.CreatedAt)
                    .ToListAsync())
                .Where(r => seenReactionIds.Add(r.Id))
                .Select(r =>
                {
                    allReactions.Add(r);
                    return r.Id;
                })
                .ToList();
        }

        return allReactions;
    }

    private static ReactionDto MapReaction(
        Api.Models.Reaction reaction,
        ILookup<Guid, Api.Models.Reaction> childReactionsByParentId)
    {
        return new ReactionDto(
            reaction.Id,
            reaction.Emoji,
            new UserInfo(reaction.User.Id, reaction.User.DisplayName, reaction.User.AvatarUrl),
            reaction.CreatedAt,
            childReactionsByParentId[reaction.Id]
                .Select(childReaction => MapReaction(childReaction, childReactionsByParentId))
                .ToList());
    }
}
