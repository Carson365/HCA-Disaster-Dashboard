using FileHelpers;

namespace AISComp.Tools
{
	public class CSVLoader
	{
		public static string Fip { get; set; } = string.Empty;
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
		 
		//public static void SearchEmployees()
		//{
		//	SearchResults = EmployeeList
		//		.Where(employee =>
		//			employee.ID.Contains(SearchId, StringComparison.OrdinalIgnoreCase) &&
		//			employee.Name.Contains(SearchName, StringComparison.OrdinalIgnoreCase))
		//		.ToList();
		//}

		public static void GetLocationOrgTree()
		{
			SearchResults = EmployeeList.Where(e => e.LocationID == SelectedLocation.ID).ToList();
		}


		//public static Employee? SelectedEmployee { get; set; } 
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
			//SelectedEmployee = employees.First(e => e.ID == "27b43e8f-a8df-4c34-88af-e4ba0aa51fc5");
			return employees;
		}

		public static Location? SelectedLocation { get; set; }
		public static List<Location> Locations { get; set; } = InitializeLocations();
		private static List<Location> InitializeLocations()
		{
			FileHelperEngine<CSVLocation> engine = new() { Options = { IgnoreFirstLines = 1 } };
			List<CSVLocation> locs = [.. engine.ReadFile("Data\\locations.csv")];

			List<Location> save = [];

			foreach (CSVLocation l in locs)
			{
				if (l != null)
				{
					Location location = new()
					{
						ID = l.ID,
						Name = l.Name,
						City = l.City,
						State = l.State,
						Zip = l.Zip,
						Latitude = l.Latitude,
						Longitude = l.Longitude,
						Size = EmployeeList.Count(e => e.LocationID == l.ID)
					};
					save.Add(location);
				}
			}

			return save;
		}

		public static List<Department> Departments { get; set; } = InitializeDepartments();
		private static List<Department> InitializeDepartments()
		{
			FileHelperEngine<Department> engine = new() { Options = { IgnoreFirstLines = 1 } };
			return [.. engine.ReadFile("Data\\departments.csv")];
		}











		/// <summary>
		/// Returns a trimmed copy of the employee tree so that every node’s LocationID equals the selected location.
		/// </summary>
		/// <param name="startingEmployee">Any employee known to work at the selected location.</param>
		/// <param name="locationId">The location to filter by.</param>
		/// <returns>A new Employee tree (a deep copy) containing only employees at that location.</returns>
		public static Employee GetTrimmedSelectedEmployee(Employee startingEmployee, string locationId)
		{
			// First, climb upward—but only while the manager is in the same location.
			Employee topEmployee = startingEmployee;
			while (topEmployee.Up != null && topEmployee.Up.LocationID == locationId)
			{
				topEmployee = topEmployee.Up;
			}

			// Now build and return the filtered tree starting from topEmployee.
			return TrimTreeToLocation(topEmployee, locationId);
		}

		/// <summary>
		/// Recursively creates a copy of an employee and its subordinate tree, but only includes nodes
		/// whose LocationID matches the provided locationId.
		/// </summary>
		/// <param name="employee">The current employee node to process.</param>
		/// <param name="locationId">The location to filter by.</param>
		/// <returns>A new Employee node (with Downs filtered), or null if the node doesn’t match (should not occur for the root).</returns>
		private static Employee TrimTreeToLocation(Employee employee, string locationId)
		{
			//// If this node does not belong to the location, skip it.
			//// (In our use case this shouldn’t happen for the root node.)
			//if (employee.LocationID != locationId)
			//	return null; // or throw an exception

			// Create a new copy of the current employee.
			Employee trimmed = new()
			{
				ID = employee.ID,
				Name = employee.Name,
				Position = employee.Position,
				LocationID = employee.LocationID,
				HireDate = employee.HireDate,
				Up = null,
				Downs = new List<Employee>()
				// We intentionally leave Up null in the trimmed tree.
			};

			// Process each subordinate: only add those who are in the same location.
			if (employee.Downs != null)
			{
				foreach (var subordinate in employee.Downs)
				{
					if (subordinate.LocationID == locationId)
					{
						var trimmedSub = TrimTreeToLocation(subordinate, locationId);
						if (trimmedSub != null)
							trimmed.Downs.Add(trimmedSub);
					}
					// Subordinates who don’t match are skipped.
				}
			}

			return trimmed;
		}

	}
}
