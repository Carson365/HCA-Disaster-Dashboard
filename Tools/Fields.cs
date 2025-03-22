using System.Collections.Concurrent;

namespace AISComp.Tools
{
	public class Employee
	{
		public string ID { get; set; } = "";
		public string Name { get; set; } = "";
		public string Position { get; set; } = "";
		public string LocationID { get; set; } = "";
		public string HireDate { get; set; } = "";
		public Employee? Up { get; set; }
		public ConcurrentBag<Employee> Downs { get; set; } = [];
		public string? ManagerID { get; set; }
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
	public class Department
	{
		public required string ID { get; set; }
		public required string Name { get; set; }
	}
	public class Disaster
	{
		public required string ID { get; set; }
		public required string State { get; set; }
		public required string FIPSStateCode { get; set; }
		public required string FIPSCountyCode { get; set; }
		public required string IncidentType { get; set; }
		public required int Year { get; set; }
		public required string DesignatedArea { get; set; }
		public required int DisasterNumber { get; set; }
		public required string DeclarationDate { get; set; }
		public required string IncidentEndDate { get; set; }
		public required string DeclarationTitle { get; set; }
	}
}