using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class AddNepaliDateFieldsToPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentDateNepali",
                table: "Payments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentDateNepaliFormatted",
                table: "Payments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentDayNepali",
                table: "Payments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMonthNepali",
                table: "Payments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentYearNepali",
                table: "Payments",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentDateNepali",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaymentDateNepaliFormatted",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaymentDayNepali",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaymentMonthNepali",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaymentYearNepali",
                table: "Payments");
        }
    }
}
