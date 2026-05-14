namespace Api.Models;

public class RoomMember
{
    public Guid RoomId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Room Room { get; set; } = null!;
    public User User { get; set; } = null!;
}
