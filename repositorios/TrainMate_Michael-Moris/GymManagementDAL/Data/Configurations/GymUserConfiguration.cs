using GymManagementDAL.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GymManagementDAL.Data.Configurations
{
    public class GymUserConfiguration<T> : IEntityTypeConfiguration<T> where T : GymUser
    {
        public void Configure(EntityTypeBuilder<T> builder)
        {
            builder.Property(X => X.Name)
                .HasColumnType("varchar")
                .HasMaxLength(50);

            builder.Property(X => X.Email)
                .HasColumnType("varchar")
                .HasMaxLength(100);

            builder.Property(X => X.PhoneNumber)
                .HasColumnType("varchar")
                .HasMaxLength(15);
            builder.ToTable(Tb =>
            {
                Tb.HasCheckConstraint("GymUserValidEmailCheck", "Email Like '_%@_%._%' ");
                Tb.HasCheckConstraint("GymUserValidPhoneNumberCheck", "PhoneNumber Like '01%' and PhoneNumber Not Like '%[^0-9]%' ");
            });
            builder.HasIndex(X => X.Email).IsUnique();
            builder.HasIndex(X => X.PhoneNumber).IsUnique();

            builder.OwnsOne(X => X.Address, AddressBuilder =>
            {
                AddressBuilder.Property(X => X.Street)
                .HasColumnName("Street")
                .HasColumnType("varchar")
                .HasMaxLength(30);

                AddressBuilder.Property(X => X.City)
                .HasColumnName("City")
                .HasColumnType("varchar")
                .HasMaxLength(30);

                AddressBuilder.Property(X => X.BuildingNumber)
                .HasColumnName("BuildingNumber");
            });
        }
    }
}
