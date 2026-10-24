using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    public class SessionConfiguration : IEntityTypeConfiguration<Session>
    {
        public void Configure(EntityTypeBuilder<Session> builder)
        {
            builder.ToTable(Tb =>
            {
                Tb.HasCheckConstraint("SessionCapacityCheck", "Capacity Between 1 and 25");
                Tb.HasCheckConstraint("SessionDateCheck", "EndDate > StartDate");
            });

            builder.HasOne(X => X.SessionCategory)
                   .WithMany(X => X.Sessions)
                   .HasForeignKey(X => X.CategoryId);

            builder.HasOne(X => X.SessionTrainer)
                   .WithMany(X => X.TrainerSessions)
                   .HasForeignKey(X => X.TrainerId);
        }
    }
}
