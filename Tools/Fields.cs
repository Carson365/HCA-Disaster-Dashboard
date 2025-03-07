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
	public class CSVLocation
	{
		public required string ID { get; set; }
		public required string Name { get; set; }
		public required string City { get; set; }
		public required string State { get; set; }
		public required string Zip { get; set; }
		public required string Latitude { get; set; }
		public required string Longitude { get; set; }
	}

	public class Location
	{
		public required string ID { get; set; }
		public required string Name { get; set; }
		public required string City { get; set; }
		public required string State { get; set; }
		public required string Zip { get; set; }
		public required string Latitude { get; set; }
		public required string Longitude { get; set; }
		public required int Size { get; set; }
	}

	public class Disaster
	{
      //"disasterNumber": 1240,
      //"totalNumberIaApproved": null,
      //"totalAmountIhpApproved": null,
      //"totalAmountHaApproved": null,
      //"totalAmountOnaApproved": null,
      //"totalObligatedAmountPa": 25888496.72,
      //"totalObligatedAmountCatAb": 16028598.82,
      //"totalObligatedAmountCatC2g": 9859897.9,
      //"paLoadDate": "2025-03-05T00:00:00.000Z",
      //"iaLoadDate": null,
      //"totalObligatedAmountHmgp": 3479614,
      //"hash": "519eb977b226af26b3d2c039e398307a345d3815",
      //"lastRefresh": "2025-03-05T05:23:00.396Z",
      //"id": "f0716c8d-d954-4854-8432-b95f7c4e2ec6"
		public required string ID { get; set; }
		public required string FIPSCode { get; set; }
		public required string IncidentType { get; set; }
		public required int DisasterNumber { get; set; }
		public required string DeclarationDate { get; set; }
		public required string IncidentEndDate { get; set; }
		public required string DeclarationTitle { get; set; }
		public required string DeclarationDescription { get; set; }
	}
}