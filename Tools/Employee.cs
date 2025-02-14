using FileHelpers;

namespace AISComp.Tools
{
	public class Employee
	{ // Store only the data that we need
		public required string ID { get; set; }
		public required string Name { get; set; }
		public required string Email { get; set; }
		public required string Position { get; set; }
		public required string Location { get; set; }
		public required string Anniversary { get; set; }
		public required Employee? Up { get; set; }
		public List<Employee>? Downs { get; set; }
	}

	[DelimitedRecord(",")]
	public class CSVEmployee
	{ // The "FieldQuoted" attribute is used to tell the parser that the name is enclosed in quotes.
		public required string Emp34Id { get; set; }
		public required string EmpLastName { get; set; }
		public required string EmpFirstName { get; set; }
		public required string EmpEmailAddress { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string EmpPositionDesc { get; set; }
		public required string EmpLocationCode { get; set; }
		public required string EmpLocationDesc { get; set; }
		public required string Mgr34Id { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string MgrName { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string MgrTitle { get; set; }
		public required string MgrEmailAddress { get; set; }
		public required string EmpAnnivDate { get; set; }
		public required string EmpPositionIsSuper { get; set; }
	}
}