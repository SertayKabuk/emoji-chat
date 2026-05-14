using System.Security.Claims;
using Api.Data;
using Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Api.Hubs;

public record MessagePayload(
    Guid Id,
    string Emoji,
    Guid UserId,
    string DisplayName,
    string? AvatarUrl,
    DateTime CreatedAt);

public record ReactionPayload(
    Guid Id,
    string Emoji,
    Guid UserId,
    string DisplayName,
    string? AvatarUrl,
    Guid? MessageId,
    Guid? ParentReactionId,
    DateTime CreatedAt);

[Authorize]
public class ChatHub(AppDbContext db) : Hub
{
    private Guid GetUserId() =>
        Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Join a room's SignalR group
    public async Task JoinRoom(Guid roomId)
    {
        var userId = GetUserId();

        // Verify membership
        var isMember = await db.RoomMembers
            .AnyAsync(rm => rm.RoomId == roomId && rm.UserId == userId);

        if (!isMember)
            throw new HubException("You are not a member of this room");

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId.ToString());
    }

    // Leave a room's SignalR group
    public async Task LeaveRoom(Guid roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId.ToString());
    }

    // Send an emoji message to a room
    public async Task SendEmoji(Guid roomId, string emoji)
    {
        var userId = GetUserId();

        // Verify membership
        var isMember = await db.RoomMembers
            .AnyAsync(rm => rm.RoomId == roomId && rm.UserId == userId);

        if (!isMember)
            throw new HubException("You are not a member of this room");

        var user = await db.Users.FindAsync(userId)
            ?? throw new HubException("User not found");

        var message = new Message
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            UserId = userId,
            Emoji = emoji,
            CreatedAt = DateTime.UtcNow
        };

        db.Messages.Add(message);
        await db.SaveChangesAsync();

        var payload = new MessagePayload(
            message.Id,
            message.Emoji,
            user.Id,
            user.DisplayName,
            user.AvatarUrl,
            message.CreatedAt);

        await Clients.Group(roomId.ToString()).SendAsync("ReceiveMessage", payload);
    }

    // Add a reaction to a message or another reaction
    public async Task AddReaction(Guid targetId, string targetType, string emoji)
    {
        var userId = GetUserId();
        var user = await db.Users.FindAsync(userId)
            ?? throw new HubException("User not found");

        Guid roomId;
        var reaction = new Reaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Emoji = emoji,
            CreatedAt = DateTime.UtcNow
        };

        if (targetType == "message")
        {
            var message = await db.Messages.FindAsync(targetId)
                ?? throw new HubException("Message not found");
            reaction.MessageId = targetId;
            roomId = message.RoomId;
        }
        else if (targetType == "reaction")
        {
            var parentReaction = await db.Reactions
                .Include(r => r.Message)
                .FirstOrDefaultAsync(r => r.Id == targetId)
                ?? throw new HubException("Reaction not found");
            reaction.ParentReactionId = targetId;

            // Walk up to find the room
            roomId = await GetRoomIdForReaction(parentReaction);
        }
        else
        {
            throw new HubException("Invalid target type");
        }

        db.Reactions.Add(reaction);
        await db.SaveChangesAsync();

        var payload = new ReactionPayload(
            reaction.Id,
            reaction.Emoji,
            user.Id,
            user.DisplayName,
            user.AvatarUrl,
            reaction.MessageId,
            reaction.ParentReactionId,
            reaction.CreatedAt);

        await Clients.Group(roomId.ToString()).SendAsync("ReceiveReaction", payload);
    }

    // Remove own reaction
    public async Task RemoveReaction(Guid reactionId)
    {
        var userId = GetUserId();

        var reaction = await db.Reactions
            .Include(r => r.Message)
            .FirstOrDefaultAsync(r => r.Id == reactionId && r.UserId == userId)
            ?? throw new HubException("Reaction not found or not yours");

        var roomId = await GetRoomIdForReaction(reaction);

        db.Reactions.Remove(reaction);
        await db.SaveChangesAsync();

        await Clients.Group(roomId.ToString()).SendAsync("ReactionRemoved", reactionId);
    }

    private async Task<Guid> GetRoomIdForReaction(Reaction reaction)
    {
        if (reaction.MessageId.HasValue)
        {
            var msg = reaction.Message ?? await db.Messages.FindAsync(reaction.MessageId.Value);
            return msg!.RoomId;
        }

        // Walk up the reaction chain
        var current = reaction;
        while (current.ParentReactionId.HasValue)
        {
            current = await db.Reactions
                .Include(r => r.Message)
                .FirstAsync(r => r.Id == current.ParentReactionId.Value);

            if (current.MessageId.HasValue)
            {
                var msg = current.Message ?? await db.Messages.FindAsync(current.MessageId.Value);
                return msg!.RoomId;
            }
        }

        throw new HubException("Could not determine room for reaction");
    }
}
