namespace Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string GoogleId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Room> CreatedRooms { get; set; } = [];
    public ICollection<RoomMember> RoomMemberships { get; set; } = [];
    public ICollection<Message> Messages { get; set; } = [];
    public ICollection<Reaction> Reactions { get; set; } = [];
}
