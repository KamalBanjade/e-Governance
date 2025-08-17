using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class AddCusIdToPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CusId",
                table: "Payments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CusId",
                table: "Payments",
                column: "CusId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Customers_CusId",
                table: "Payments",
                column: "CusId",
                principalTable: "Customers",
                principalColumn: "CusId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Customers_CusId",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_CusId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "CusId",
                table: "Payments");
        }
    }
}
