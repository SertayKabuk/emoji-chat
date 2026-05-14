namespace Api.Models;

public class Reaction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Either MessageId or ParentReactionId is set, never both
    public Guid? MessageId { get; set; }
    public Guid? ParentReactionId { get; set; }

    public string Emoji { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Message? Message { get; set; }
    public Reaction? ParentReaction { get; set; }
    public ICollection<Reaction> ChildReactions { get; set; } = [];
}
