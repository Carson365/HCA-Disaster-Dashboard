using FileHelpers;

namespace AISComp.Tools
{
	public class CSVLoader
	{
		public static bool IsLoading { get; private set; } = true;

		// Persistent search state
		public static string SearchId { get; set; } = string.Empty;
		public static string SearchName { get; set; } = string.Empty;
		public static List<Employee> SearchResults { get; set; } = [];
		public static event Action? OnLoaded;
		public static void SignalLoaded()
		{
			if (IsLoading) OnLoaded?.Invoke();
			IsLoading = false;
		}
		 
		public static void SearchEmployees()
		{
			SearchResults = EmployeeList
				.Where(employee =>
					employee.ID.Contains(SearchId, StringComparison.OrdinalIgnoreCase) &&
					employee.Name.Contains(SearchName, StringComparison.OrdinalIgnoreCase))
				.ToList();
		}


		public static Employee? SelectedEmployee { get; set; } 
		public static List<Employee> EmployeeList { get; private set; } = InitializeEmployees();
		private static List<Employee> InitializeEmployees()
		{
			var engine = new FileHelperEngine<CSVEmployee> { Options = { IgnoreFirstLines = 1 } };
			CSVEmployee?[] records = engine.ReadFile("Data\\employees.csv");

			List<Employee> employees = [];
			foreach (CSVEmployee? record in records)
			{
				if (record != null)
				{
					Employee employee = new()
					{
						ID = record.ID,
						Name = $"{record.FirstName} {record.LastName}",
						Position = record.Position,
						LocationID = record.LocationID,
						HireDate = string.IsNullOrEmpty(record.HireDate) ? "Null" : record.HireDate, // Accomodate the CEO who has no anniversary
						Up = null,
						Downs = []
					};
					employees.Add(employee);
				}
			}

			Dictionary<string, Employee> employeeDict = employees.ToDictionary(e => e.ID);

			foreach (CSVEmployee? record in records)
			{
				if (record != null && employeeDict.TryGetValue(record.ID, out var employee))
				{
					// Set Up reference if manager ID exists
					if (!string.IsNullOrEmpty(record.ManagerID) && employeeDict.TryGetValue(record.ManagerID, out var manager))
					{
						employee.Up = manager;
						manager.Downs?.Add(employee);
					}
				}
			}
			SelectedEmployee = employees.First(e => e.ID == "27b43e8f-a8df-4c34-88af-e4ba0aa51fc5");
			return employees;
		}

		public static Location? SelectedLocation { get; set; }
		public static List<Location> Locations { get; set; } = InitializeLocations();
		private static List<Location> InitializeLocations()
		{
			FileHelperEngine<Location> engine = new() { Options = { IgnoreFirstLines = 1 } };
			return [.. engine.ReadFile("Data\\locations.csv")];
		}

		public static List<Department> Departments { get; set; } = InitializeDepartments();
		private static List<Department> InitializeDepartments()
		{
			FileHelperEngine<Department> engine = new() { Options = { IgnoreFirstLines = 1 } };
			return [.. engine.ReadFile("Data\\departments.csv")];
		}
	}
}
