using Sylvan.Data.Csv;
using System.Collections.Concurrent;
using System.Data;
using System.Globalization;

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

		// These static properties are initialized via helper methods.
		public static List<Employee> EmployeeList { get; private set; } = InitializeEmployees();
		public static IReadOnlyList<Location> Locations { get; private set; } = InitializeLocations();
		public static IReadOnlyList<Department> Departments { get; private set; } = InitializeDepartments();
		public static IReadOnlyList<Disaster> Disasters { get; private set; } = InitializeDisasters();

		// Employee remaps loaded from CSV.
		public static List<(Employee, Employee)> EmployeeRemap { get; private set; } = new();

		// Build the employee list, then load and apply any remaps.
		private static List<Employee> InitializeEmployees()
		{
			using var reader = File.OpenText(Path.Combine("Data", "employees.csv"));
			using var csv = CsvDataReader.Create(reader, new CsvDataReaderOptions { HasHeaders = true });
			var employeeDict = new Dictionary<string, Employee>(300000);

			while (csv.Read())
			{
				string id = csv.GetString(0);
				employeeDict[id] = new Employee
				{
					ID = id,
					Name = string.Concat(csv.GetFieldSpan(2), " ", csv.GetFieldSpan(1)),
					Position = csv.GetString(5),
					LocationID = csv.GetString(3),
					HireDate = csv.IsDBNull(7) ? "Null" : csv.GetString(7),
					ManagerID = csv.IsDBNull(6) ? null : csv.GetString(6),
					Downs = new ConcurrentBag<Employee>()
				};
			}

			// Build the hierarchy.
			Parallel.ForEach(employeeDict.Values, employee =>
			{
				if (employee.ManagerID != null && employeeDict.TryGetValue(employee.ManagerID, out var manager))
				{
					employee.Up = manager;
					manager.Downs.Add(employee);
				}
			});

			// Build a local list of employees.
			var employees = employeeDict.Values.ToList();

			// Now load remaps from file using the built employee list.
			var remapList = LoadEmployeeRemap(employees);
			EmployeeRemap = remapList;
			ApplyEmployeeRemap(employees, remapList);

			return employees;
		}

		private static List<Location> InitializeLocations()
		{
			using var reader = File.OpenText(Path.Combine("Data", "locations.csv"));
			using var csv = CsvDataReader.Create(reader, new CsvDataReaderOptions { HasHeaders = true });
			var locationEmployeeCount = EmployeeList.GroupBy(e => e.LocationID)
													.ToDictionary(g => g.Key, g => g.Count());

			var locations = new List<Location>();

			while (csv.Read())
			{
				var record = new Location
				{
					ID = csv.GetString(0),
					Name = csv.GetString(1),
					City = csv.GetString(2),
					State = csv.GetString(3),
					Zip = csv.GetString(4),
					Latitude = csv.GetString(5),
					Longitude = csv.GetString(6),
					Size = locationEmployeeCount.GetValueOrDefault(csv.GetString(0), 0)
				};

				locations.Add(record);
			}

			return locations;
		}

		private static List<Department> InitializeDepartments()
		{
			using var reader = File.OpenText(Path.Combine("Data", "departments.csv"));
			using var csv = CsvDataReader.Create(reader, new CsvDataReaderOptions { HasHeaders = true });

			var departments = new List<Department>();

			while (csv.Read())
			{
				var record = new Department
				{
					ID = csv.GetString(0),
					Name = csv.GetString(1),
				};

				departments.Add(record);
			}

			return departments;
		}

		private static List<Disaster> InitializeDisasters()
		{
			using var reader = File.OpenText(Path.Combine("Data", "disasters.csv"));
			using var csv = CsvDataReader.Create(reader, new CsvDataReaderOptions { HasHeaders = true });
			var disasterDict = new Dictionary<int, List<Disaster>>();

			while (csv.Read())
			{
				var dn = int.TryParse(csv.GetString("disasterNumber"), out int disasterNumber) ? disasterNumber : 0;

				if (!disasterDict.ContainsKey(dn))
					disasterDict[dn] = new List<Disaster>();

				disasterDict[dn].Add(new Disaster
				{
					ID = string.IsNullOrEmpty(csv.GetString("id")) ? "N/A" : csv.GetString("id"),
					State = csv.GetString("state"),
					FIPSStateCode = string.IsNullOrEmpty(csv.GetString("fipsStateCode")) ? "Unknown" : csv.GetString("fipsStateCode"),
					FIPSCountyCode = string.IsNullOrEmpty(csv.GetString("fipsCountyCode"))
						? "Unknown"
						: csv.GetString("fipsCountyCode").PadLeft(3, '0'),
					IncidentType = string.IsNullOrEmpty(csv.GetString("incidentType"))
						? "Unknown"
						: csv.GetString("incidentType").Trim(),
					Year = int.TryParse(csv.GetString("fyDeclared"), out int year) ? year : 0,
					DesignatedArea = string.IsNullOrEmpty(csv.GetString("designatedArea"))
						? "Unknown"
						: csv.GetString("designatedArea").Trim(),
					DisasterNumber = dn,
					DeclarationDate = string.IsNullOrEmpty(csv.GetString("declarationDate"))
						? "Not Listed"
						: DateTime.TryParse(csv.GetString("declarationDate"), out DateTime declarationDate)
							? declarationDate.ToString("yyyy-MM-dd")
							: "Invalid Date",
					IncidentEndDate = string.IsNullOrEmpty(csv.GetString("incidentEndDate"))
						? "Not Listed"
						: DateTime.TryParse(csv.GetString("incidentEndDate"), out DateTime incidentEndDate)
							? incidentEndDate.ToString("yyyy-MM-dd")
							: "Invalid Date",
					DeclarationTitle = string.IsNullOrEmpty(csv.GetString("declarationTitle"))
						? "Unknown"
						: csv.GetString("declarationTitle").Replace(",", ", ").Replace(",  ", ", ").Trim()
				});
			}

			// Process HazardMitigationAssistanceMitigatedProperties.
			using var reader2 = File.OpenText(Path.Combine("Data", "HazardMitigationAssistanceMitigatedProperties.csv"));
			using var csv2 = CsvDataReader.Create(reader2, new CsvDataReaderOptions { HasHeaders = true });

			while (csv2.Read())
			{
				var id = int.TryParse(csv2.GetString("disasterNumber"), out int disasterNumber) ? disasterNumber : 0;

				if (disasterDict.TryGetValue(id, out var disasters))
				{
					var damage = new Damage
					{
						StructureType = string.IsNullOrEmpty(csv2.GetString("structureType")) ? "Unknown" : csv2.GetString("structureType"),
						NumberOfProperties = string.IsNullOrEmpty(csv2.GetString("numberOfProperties")) ? "Unknown" : csv2.GetString("numberOfProperties"),
						DamageCategory = string.IsNullOrEmpty(csv2.GetString("damageCategory")) ? "Unknown" : csv2.GetString("damageCategory")
					};

					foreach (var disaster in disasters)
						disaster.Damages.Add(damage);
				}
			}

			var disasterList = disasterDict.Values.SelectMany(d => d).ToList();

			return disasterList;
		}

		// Retrieves the organization tree for a location.
		public static List<Employee> GetLocationOrgTree(string ID) =>
			string.IsNullOrEmpty(ID) ? new List<Employee>() : EmployeeList.Where(e => e.LocationID == ID).ToList();

		// Returns a trimmed list of employees for a location.
		public static List<Employee> GetTrimmedEmployeeList(string locationId)
		{
			if (string.IsNullOrEmpty(locationId))
				return new List<Employee>();

			// Get all employees for the location.
			var orgEmployees = EmployeeList.Where(e => e.LocationID == locationId).ToList();

			// Filter to only those who have no manager in the same location.
			var topEmployees = orgEmployees
				.Where(e => e.Up == null || e.Up.LocationID != locationId)
				.ToList();

			Dictionary<string, Employee> trimmedCache = new();
			List<Employee> flattenedList = new();

			foreach (var top in topEmployees)
			{
				// Trim the entire tree starting at the top-level employee.
				var trimmed = TrimTreeToLocation(top, locationId, trimmedCache);
				FlattenTree(trimmed, flattenedList);
			}

			return flattenedList;
		}

		// Returns a trimmed employee tree from a starting employee.
		public static Employee GetTrimmedSelectedEmployee(Employee startingEmployee, string locationId, Dictionary<string, Employee> cache)
		{
			Employee topEmployee = startingEmployee;
			while (topEmployee.Up != null && topEmployee.Up.LocationID == locationId)
			{
				topEmployee = topEmployee.Up;
			}
			return TrimTreeToLocation(topEmployee, locationId, cache);
		}

		// Recursively clone the tree for employees at the given location.
		private static Employee TrimTreeToLocation(Employee employee, string locationId, Dictionary<string, Employee> cache)
		{
			if (cache.TryGetValue(employee.ID, out var cached))
			{
				return cached;
			}

			Employee trimmed = new()
			{
				ID = employee.ID,
				Name = employee.Name,
				Position = employee.Position,
				LocationID = employee.LocationID,
				HireDate = employee.HireDate,
				Up = null,
				Downs = new ConcurrentBag<Employee>()
			};

			cache[employee.ID] = trimmed;

			foreach (var subordinate in employee.Downs)
			{
				if (subordinate.LocationID == locationId)
				{
					var trimmedSub = TrimTreeToLocation(subordinate, locationId, cache);
					trimmed.Downs.Add(trimmedSub);
				}
			}
			return trimmed;
		}

		// Flattens a trimmed employee tree into a list.
		private static void FlattenTree(Employee employee, List<Employee> list)
		{
			list.Add(employee);
			foreach (var subordinate in employee.Downs)
			{
				FlattenTree(subordinate, list);
			}
		}

		// Loads employee remaps from EmployeeRemap.csv using the provided employee list.
		private static List<(Employee, Employee)> LoadEmployeeRemap(List<Employee> employees)
		{
			var remapList = new List<(Employee, Employee)>();
			string filePath = Path.Combine("Data", "EmployeeRemap.csv");

			if (!File.Exists(filePath))
				return remapList;

			using var reader = File.OpenText(filePath);
			using var csv = CsvDataReader.Create(reader, new CsvDataReaderOptions { HasHeaders = true });

			// Build a lookup using the provided employees.
			var employeeDict = employees.ToDictionary(e => e.ID);

			while (csv.Read())
			{
				string oldId = csv.GetString(0);
				string newId = csv.GetString(1);

				if (employeeDict.TryGetValue(oldId, out var oldEmployee) &&
					employeeDict.TryGetValue(newId, out var newEmployee))
				{
					remapList.Add((oldEmployee, newEmployee));
				}
			}

			return remapList;
		}

		// Applies employee remaps to the provided employee list and writes changes to EmployeeRemap.csv.
		public static void ApplyEmployeeRemap(List<Employee> employees, List<(Employee, Employee)> remaps)
		{
			if (remaps.Count == 0)
				return;

			var employeeDict = employees.ToDictionary(e => e.ID);
			string filePath = Path.Combine("Data", "EmployeeRemap.csv");

			// Overwrite the file with current remaps.
			using var writer = new StreamWriter(filePath, false);
			writer.WriteLine("OldID,NewID");

			foreach (var (oldEmployee, newEmployee) in remaps)
			{
				if (!employeeDict.ContainsKey(oldEmployee.ID) || !employeeDict.ContainsKey(newEmployee.ID))
					continue;

				// Remove oldEmployee from its previous manager's Downs.
				if (oldEmployee.Up != null)
				{
					var oldManager = oldEmployee.Up;
					var filteredDowns = oldManager.Downs.Where(e => e.ID != oldEmployee.ID);
					oldManager.Downs = new ConcurrentBag<Employee>(filteredDowns);
				}

				// Update the old employee’s Up reference.
				oldEmployee.Up = newEmployee;

				// Ensure newEmployee has oldEmployee in its Downs.
				newEmployee.Downs.Add(oldEmployee);

				// Recursively update the LocationID for oldEmployee and its subordinates.
				UpdateLocationRecursively(oldEmployee, newEmployee.LocationID);

				// Write the remap to CSV.
				writer.WriteLine($"{oldEmployee.ID},{newEmployee.ID}");
			}

			// Optionally, update the employees list if needed.
		}

		// Recursively updates the LocationID for an employee and its subordinates.
		private static void UpdateLocationRecursively(Employee employee, string newLocationID)
		{
			employee.LocationID = newLocationID;
			foreach (var subordinate in employee.Downs)
			{
				UpdateLocationRecursively(subordinate, newLocationID);
			}
		}

		public static Employee? CutEmployee { get; set; }
		public static Employee? SelectedEmployee;
	}
}
