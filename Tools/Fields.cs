using FileHelpers;
using System.Runtime.InteropServices;

namespace AISComp.Tools
{
	public class Employee
	{
		public required string ID { get; set; }
		public required string Name { get; set; }
		public required string Position { get; set; }
		public required string LocationID { get; set; }
		public required string HireDate { get; set; }
		public required Employee? Up { get; set; }
		public List<Employee>? Downs { get; set; }
	}

	[DelimitedRecord(",")]
	public class CSVEmployee
	{
		public required string ID { get; set; }
		public required string LastName { get; set; }
		public required string FirstName { get; set; }
		public required string LocationID { get; set; }
		public required string DepartmentID { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string Position { get; set; }
		public required string ManagerID { get; set; }
		public required string HireDate { get; set; }
	}

	[DelimitedRecord(",")]
	public class Department
	{
		public required string ID { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string DepartmentName { get; set; }
	}

	[DelimitedRecord(",")]
	public class Location
	{
		public required string ID { get; set; }
		public required string Name { get; set; }
		public required string City { get; set; }
		public required string State { get; set; }
		public required string Zip { get; set; }
		public required string Latitude { get; set; }
		public required string Longitude { get; set; }
	}
}