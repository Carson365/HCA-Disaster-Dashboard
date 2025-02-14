using FileHelpers;

namespace AISComp.Tools
{
	[DelimitedRecord(",")]
	public class Location
	{
		public required int Id { get; set; }
		public required string Coid { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string FacName { get; set; }
		public required string TimeZone { get; set; }
		public required string Offset { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string TimeDescription { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string EmrMnem { get; set; }
		public required string EmrName { get; set; }
		public required string FacStatus { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string FacAddress { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string FacCity { get; set; }
		public required string FacState { get; set; }
		public required string ZipCode { get; set; }
		public required float Latitude { get; set; }
		public required float Longitude { get; set; }
		public required string CompanyName { get; set; }
		public required string DivMnem { get; set; }
		[FieldQuoted('"', QuoteMode.OptionalForBoth)]
		public required string DivName { get; set; }
		public required string NetworkMeditech { get; set; }
	}
}
