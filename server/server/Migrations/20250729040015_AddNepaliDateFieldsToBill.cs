using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class AddNepaliDateFieldsToBill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedDateNepali",
                table: "Bills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedDayNepali",
                table: "Bills",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedMonthNepali",
                table: "Bills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedYearNepali",
                table: "Bills",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedDateNepali",
                table: "Bills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UpdatedDayNepali",
                table: "Bills",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedMonthNepali",
                table: "Bills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UpdatedYearNepali",
                table: "Bills",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedDateNepali",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "CreatedDayNepali",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "CreatedMonthNepali",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "CreatedYearNepali",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "UpdatedDateNepali",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "UpdatedDayNepali",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "UpdatedMonthNepali",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "UpdatedYearNepali",
                table: "Bills");
        }
    }
}
