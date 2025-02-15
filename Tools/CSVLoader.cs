using FileHelpers;

namespace AISComp.Tools
{
	public class CSVLoader
	{
		public static List<Employee> EmployeeList { get; private set; } = [];
		public static Employee SelectedEmployee { get; set; }
		public static bool IsLoading { get; private set; } = true;
		//public static readonly Dictionary<string, string> locationNames = [];

		// Persistent search state
		public static string SearchId { get; set; } = string.Empty;
		public static string SearchName { get; set; } = string.Empty;
		public static List<Employee> SearchResults { get; set; } = [];

		public static event Action? OnEmployeesLoaded;

		public static async Task LoadEmployeesAsync()
		{
			Console.WriteLine("EmployeeService: LoadEmployeesAsync");
			// Load employees asynchronously
			if (EmployeeList.Count == 0)
			{
				EmployeeList = await Task.Run(() => GetEmployees());
				SelectedEmployee = EmployeeList.First(e => e.ID == "bd5d98c2-2c39-42cd-8e0a-048adfb996b7");
			}
			IsLoading = false;
			OnEmployeesLoaded?.Invoke();
		}

		public static void SearchEmployees()
		{
			SearchResults = EmployeeList
				.Where(employee =>
					employee.ID.Contains(SearchId, StringComparison.OrdinalIgnoreCase) &&
					employee.Name.Contains(SearchName, StringComparison.OrdinalIgnoreCase))
				.ToList();
		}

		private static List<Employee> GetEmployees()
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
			return employees;
		}


		public static Location? selectedLocation;
		/*[Parameter] */
		public static Location[] locations { get; set; } = InitializeLocations();
		private static Location[] InitializeLocations()
		{
			FileHelperEngine<Location> engine = new() { Options = { IgnoreFirstLines = 1 } };
			return engine.ReadFile("Data\\locations.csv");
		}

		public static Department[] departments { get; set; } = InitializeDepartments();

		private static Department[] InitializeDepartments()
		{
			FileHelperEngine<Department> engine = new() { Options = { IgnoreFirstLines = 1 } };
			return engine.ReadFile("Data\\departments.csv");
		}
	}
}
