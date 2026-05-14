namespace Api.Models;

public class Room
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Emoji { get; set; } = "💬";
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User CreatedBy { get; set; } = null!;
    public ICollection<RoomMember> Members { get; set; } = [];
    public ICollection<Message> Messages { get; set; } = [];
}
