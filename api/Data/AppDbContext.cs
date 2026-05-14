using Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomMember> RoomMembers => Set<RoomMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Reaction> Reactions => Set<Reaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.GoogleId).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();
        });

        // Room
        modelBuilder.Entity<Room>(e =>
        {
            e.HasOne(r => r.CreatedBy)
                .WithMany(u => u.CreatedRooms)
                .HasForeignKey(r => r.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // RoomMember (composite PK)
        modelBuilder.Entity<RoomMember>(e =>
        {
            e.HasKey(rm => new { rm.RoomId, rm.UserId });

            e.HasOne(rm => rm.Room)
                .WithMany(r => r.Members)
                .HasForeignKey(rm => rm.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(rm => rm.User)
                .WithMany(u => u.RoomMemberships)
                .HasForeignKey(rm => rm.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Message
        modelBuilder.Entity<Message>(e =>
        {
            e.HasOne(m => m.Room)
                .WithMany(r => r.Messages)
                .HasForeignKey(m => m.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(m => m.User)
                .WithMany(u => u.Messages)
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(m => new { m.RoomId, m.CreatedAt });
        });

        // Reaction (self-referencing)
        modelBuilder.Entity<Reaction>(e =>
        {
            e.HasOne(r => r.User)
                .WithMany(u => u.Reactions)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Message)
                .WithMany(m => m.Reactions)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(r => r.ParentReaction)
                .WithMany(r => r.ChildReactions)
                .HasForeignKey(r => r.ParentReactionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Check constraint: exactly one of MessageId or ParentReactionId must be set
            e.ToTable(t => t.HasCheckConstraint(
                "CK_Reaction_Target",
                "(message_id IS NOT NULL AND parent_reaction_id IS NULL) OR (message_id IS NULL AND parent_reaction_id IS NOT NULL)"));

            e.HasIndex(r => r.MessageId);
            e.HasIndex(r => r.ParentReactionId);
        });
    }
}
