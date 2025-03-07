using AISComp.Components.Pages;
using FileHelpers;

namespace AISComp.Tools
{
	public class CSVLoader
	{
		public bool IsLoading { get; private set; } = true;

		public static event Action? OnLoaded;

		public void SignalLoaded()
		{
			if (IsLoading) OnLoaded?.Invoke();
			IsLoading = false;
		}

		public static List<Employee> GetLocationOrgTree(string ID)
		{
			if (ID != null)
			{
				return [.. EmployeeList.Where(e => e.LocationID == ID)];
			}
			else return [];
		}

		public static List<Employee> EmployeeList { get; private set; } = InitializeEmployees();
		private static List<Employee> InitializeEmployees()
		{
			var engine = new FileHelperEngine<CSVEmployee> { Options = { IgnoreFirstLines = 1 } };
			CSVEmployee?[] records = engine.ReadFile(Path.Combine("Data", "employees.csv"));

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

		public Location? SelectedLocation { get; set; }
		public static List<Location> Locations { get; private set; } = InitializeLocations();
		private static List<Location> InitializeLocations()
		{
			FileHelperEngine<CSVLocation> engine = new() { Options = { IgnoreFirstLines = 1 } };
			List<CSVLocation> locs = [.. engine.ReadFile(Path.Combine("Data", "locations.csv"))];

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

		public static List<Department> Departments { get; private set; } = InitializeDepartments();
		private static List<Department> InitializeDepartments()
		{
			FileHelperEngine<Department> engine = new() { Options = { IgnoreFirstLines = 1 } };
			return [.. engine.ReadFile(Path.Combine("Data", "departments.csv"))];
		}


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
				Downs = []
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





		////////////////////////////////




		//public static List<Disaster> Disasters { get; private set; } = InitializeDisasters();

		//private static List<Disaster> InitializeDisasters()
		//{
		//	FileHelperEngine<Disaster> engine = new() { Options = { IgnoreFirstLines = 1 } };
		//	return [.. engine.ReadFile(Path.Combine("Data", "disasters.csv"))];
		//}

	}
}
