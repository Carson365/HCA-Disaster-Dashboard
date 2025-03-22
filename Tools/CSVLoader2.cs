//using AISComp.Components.Pages;
//using FileHelpers;
//using System.Collections.Concurrent;

//namespace AISComp.Tools
//{
//	public class CSVLoader
//	{
//		public bool IsLoading { get; private set; } = true;

//		public static event Action? OnLoaded;

//		public void SignalLoaded()
//		{
//			if (IsLoading) OnLoaded?.Invoke();
//			IsLoading = false;
//		}

//		public static List<Employee> GetLocationOrgTree(string ID)
//		{
//			if (ID != null)
//			{
//				return EmployeeList.Where(e => e.LocationID == ID).ToList();
//			}
//			else return new List<Employee>();
//		}

//		public static List<Employee> EmployeeList { get; private set; } = InitializeEmployees();

//		private static List<Employee> InitializeEmployees()
//		{
//			var time1 = DateTime.Now;
//			var engine = new FileHelperEngine<CSVEmployee> { Options = { IgnoreFirstLines = 1 } };
//			CSVEmployee?[] records = engine.ReadFile(Path.Combine("Data", "employees.csv"));

//			int count = records.Length;
//			// Preallocate the employees array; index i corresponds to records[i]
//			Employee?[] employeeArray = new Employee?[count];

//			// First pass: create employees in parallel using index-based loop.
//			Parallel.For(0, count, i =>
//			{
//				var record = records[i];
//				if (record != null)
//				{
//					employeeArray[i] = new Employee
//					{
//						ID = record.ID,
//						Name = $"{record.FirstName} {record.LastName}",
//						Position = record.Position,
//						LocationID = record.LocationID,
//						HireDate = string.IsNullOrEmpty(record.HireDate) ? "Null" : record.HireDate,
//						Up = null,
//						Downs = new List<Employee>()
//					};
//				}
//			});

//			// Build a lookup dictionary (sequentially, as it’s fast)
//			Dictionary<string, Employee> employeeDict = new();
//			for (int i = 0; i < count; i++)
//			{
//				if (employeeArray[i] is Employee emp)
//					employeeDict[emp.ID] = emp;
//			}

//			// Second pass: link managers and their subordinates in parallel.
//			Parallel.For(0, count, i =>
//			{
//				var record = records[i];
//				if (record != null && !string.IsNullOrEmpty(record.ManagerID))
//				{
//					if (employeeDict.TryGetValue(record.ManagerID, out var manager) &&
//						employeeArray[i] is Employee employee)
//					{
//						// set Up reference
//						employee.Up = manager;
//						// lock to update the manager's Downs list safely
//						lock (manager.Downs)
//						{
//							manager.Downs.Add(employee);
//						}
//					}
//				}
//			});

//			Console.WriteLine($"Time to load employees: {(DateTime.Now - time1).TotalMilliseconds}");
//			// Filter out any potential nulls and return as list.
//			return employeeArray.Where(e => e != null).Cast<Employee>().ToList();
//		}

//		public Location? SelectedLocation { get; set; }
//		public static List<Location> Locations { get; private set; } = InitializeLocations();

//		private static List<Location> InitializeLocations()
//		{
//			var time1 = DateTime.Now;
//			FileHelperEngine<CSVLocation> engine = new() { Options = { IgnoreFirstLines = 1 } };
//			List<CSVLocation> locs = engine.ReadFile(Path.Combine("Data", "locations.csv")).ToList();

//			Dictionary<string, int> locationEmployeeCount = EmployeeList
//				.GroupBy(e => e.LocationID)
//				.ToDictionary(g => g.Key, g => g.Count());

//			ConcurrentBag<Location> save = new();

//			Parallel.ForEach(locs, l =>
//			{
//				if (l != null)
//				{
//					Location location = new()
//					{
//						ID = l.ID,
//						Name = l.Name,
//						City = l.City,
//						State = l.State,
//						Zip = l.Zip,
//						Latitude = l.Latitude,
//						Longitude = l.Longitude,
//						Size = locationEmployeeCount.TryGetValue(l.ID, out int count) ? count : 0
//					};
//					save.Add(location);
//				}
//			});

//			Console.WriteLine($"Time to load locations: {(DateTime.Now - time1).TotalMilliseconds}");
//			return save.ToList();
//		}

//		public static List<Department> Departments { get; private set; } = InitializeDepartments();
//		private static List<Department> InitializeDepartments()
//		{
//			FileHelperEngine<Department> engine = new() { Options = { IgnoreFirstLines = 1 } };
//			return engine.ReadFile(Path.Combine("Data", "departments.csv")).ToList();
//		}

//		public static Employee GetTrimmedSelectedEmployee(Employee startingEmployee, string locationId)
//		{
//			// Climb upward—only while the manager is in the same location.
//			Employee topEmployee = startingEmployee;
//			while (topEmployee.Up != null && topEmployee.Up.LocationID == locationId)
//			{
//				topEmployee = topEmployee.Up;
//			}
//			return TrimTreeToLocation(topEmployee, locationId);
//		}

//		private static Employee TrimTreeToLocation(Employee employee, string locationId)
//		{
//			Employee trimmed = new()
//			{
//				ID = employee.ID,
//				Name = employee.Name,
//				Position = employee.Position,
//				LocationID = employee.LocationID,
//				HireDate = employee.HireDate,
//				Up = null,
//				Downs = new List<Employee>()
//			};

//			if (employee.Downs != null)
//			{
//				foreach (var subordinate in employee.Downs)
//				{
//					if (subordinate.LocationID == locationId)
//					{
//						var trimmedSub = TrimTreeToLocation(subordinate, locationId);
//						trimmed.Downs.Add(trimmedSub);
//					}
//				}
//			}
//			return trimmed;
//		}
//	}
//}
