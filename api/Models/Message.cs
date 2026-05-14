namespace Api.Models;

public class Message
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public Guid UserId { get; set; }
    public string Emoji { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Room Room { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<Reaction> Reactions { get; set; } = [];
}
