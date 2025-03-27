using Sylvan.Data.Csv;
using System.Collections.Concurrent;
using System.Data;

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

		public static IReadOnlyList<Employee> EmployeeList { get; private set; } = InitializeEmployees();
		public static IReadOnlyList<Location> Locations { get; private set; } = InitializeLocations();
		public static IReadOnlyList<Department> Departments { get; private set; } = InitializeDepartments();
		public static IReadOnlyList<Disaster> Disasters { get; private set; } = InitializeDisasters();


		public static List<Employee> GetLocationOrgTree(string ID) =>
			string.IsNullOrEmpty(ID) ? [] : [.. EmployeeList.Where(e => e.LocationID == ID)];


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
				};
			}

			Parallel.ForEach(employeeDict.Values, employee =>
			{
				if (employee.ManagerID != null && employeeDict.TryGetValue(employee.ManagerID, out var manager))
				{
					employee.Up = manager;
					manager.Downs.Add(employee);
				}
			});

			return [.. employeeDict.Values];
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

				if (!disasterDict.ContainsKey(dn)) disasterDict[dn] = [];

				disasterDict[dn].Add(new Disaster
				{
					// Directly clean data while creating the Disaster object
					ID = string.IsNullOrEmpty(csv.GetString("id")) ? "N/A" : csv.GetString("id"),
					State = csv.GetString("state"),
					FIPSStateCode = string.IsNullOrEmpty(csv.GetString("fipsStateCode")) ? "Unknown" : csv.GetString("fipsStateCode"),
					FIPSCountyCode = string.IsNullOrEmpty(csv.GetString("fipsCountyCode"))
						? "Unknown"
						: csv.GetString("fipsCountyCode").PadLeft(3, '0'),
					IncidentType = string.IsNullOrEmpty(csv.GetString("incidentType"))
						? "Unknown"
						: csv.GetString("incidentType").Trim(),
					Year = int.TryParse(csv.GetString("fyDeclared"), out int year) ? year : 0, // Defaults to 0 if parsing fails
					DesignatedArea = string.IsNullOrEmpty(csv.GetString("designatedArea"))
						? "Unknown"
						: csv.GetString("designatedArea").Trim(),
					DisasterNumber = dn, // Defaults to 0 if parsing fails
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

			// HazardMitigationAssistanceMitigatedProperties
			using var reader2 = File.OpenText(Path.Combine("Data", "HazardMitigationAssistanceMitigatedProperties.csv"));
			using var csv2 = CsvDataReader.Create(reader2, new CsvDataReaderOptions { HasHeaders = true });

			var time = DateTime.Now;

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

					foreach (var disaster in disasters) disaster.Damages.Add(damage);
				}
			}

			var disasterList = disasterDict.Values.SelectMany(d => d).ToList();

			return disasterList;
		}





		public static Employee GetTrimmedSelectedEmployee(Employee startingEmployee, string locationId, Dictionary<string, Employee> cache)
		{
			// Climb upward as long as the manager is in the same location.
			Employee topEmployee = startingEmployee;
			while (topEmployee.Up != null && topEmployee.Up.LocationID == locationId)
			{
				topEmployee = topEmployee.Up;
			}
			return TrimTreeToLocation(topEmployee, locationId, cache);
		}

		private static Employee TrimTreeToLocation(Employee employee, string locationId, Dictionary<string, Employee> cache)
		{
			// Return the cached result if it exists.
			if (cache.TryGetValue(employee.ID, out var cached))
			{
				return cached;
			}

			// Create a trimmed copy of the current employee.
			Employee trimmed = new Employee
			{
				ID = employee.ID,
				Name = employee.Name,
				Position = employee.Position,
				LocationID = employee.LocationID,
				HireDate = employee.HireDate,
				Up = null,
				Downs = new ConcurrentBag<Employee>()
			};

			// Cache this trimmed employee before processing children to handle cycles.
			cache[employee.ID] = trimmed;

			// Process subordinates recursively.
			if (employee.Downs != null)
			{
				foreach (var subordinate in employee.Downs)
				{
					if (subordinate.LocationID == locationId)
					{
						var trimmedSub = TrimTreeToLocation(subordinate, locationId, cache);
						trimmed.Downs.Add(trimmedSub);
					}
				}
			}
			return trimmed;
		}

	}
}