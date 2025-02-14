using FileHelpers;

namespace AISComp.Tools
{
	public class EmployeeService
	{
		public List<Employee> EmployeeList { get; private set; } = [];
		public required Employee SelectedEmployee { get; set; }
		public bool IsLoading { get; private set; } = true;
		public static readonly Dictionary<string, string> locationNames = [];

		// Persistent search state
		public string SearchId { get; set; } = string.Empty;
		public string SearchName { get; set; } = string.Empty;
		public List<Employee> SearchResults { get; set; } = [];

		public event Action? OnEmployeesLoaded;

		public async Task LoadEmployeesAsync()
		{
			Console.WriteLine("EmployeeService: LoadEmployeesAsync");
			// Load employees asynchronously
			if (EmployeeList.Count == 0)
			{
				EmployeeList = await Task.Run(() => GetEmployees());
				SelectedEmployee = EmployeeList.First(e => e.ID == "792BDML");
			}
			IsLoading = false;
			OnEmployeesLoaded?.Invoke();
		}

		public void SearchEmployees()
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
			CSVEmployee?[] records = engine.ReadFile("Data\\orgchart_faux.csv");

			List<Employee> employees = [];
			foreach (CSVEmployee? record in records)
			{
				if (record != null)
				{
					Employee employee = new()
					{
						ID = record.Emp34Id,
						Name = $"{record.EmpFirstName} {record.EmpLastName}",
						Email = record.EmpEmailAddress,
						Position = record.EmpPositionDesc,
						Location = record.EmpLocationCode,
						Anniversary = string.IsNullOrEmpty(record.EmpAnnivDate) ? "Null" : record.EmpAnnivDate, // Accomodate the CEO who has no anniversary
						Up = null,
						Downs = []
					};
					employees.Add(employee);
					// Add location to locationNames
					if (!locationNames.ContainsKey(record.EmpLocationCode))
					{
						locationNames.Add(record.EmpLocationCode, record.EmpLocationDesc);
					}
				}
			}

			Dictionary<string, Employee> employeeDict = employees.ToDictionary(e => e.ID);

			foreach (CSVEmployee? record in records)
			{
				if (record != null && employeeDict.TryGetValue(record.Emp34Id, out var employee))
				{
					// Set Up reference if manager ID exists
					if (!string.IsNullOrEmpty(record.Mgr34Id) && employeeDict.TryGetValue(record.Mgr34Id, out var manager))
					{
						employee.Up = manager;
						manager.Downs?.Add(employee);
					}
				}
			}
			return employees;
		}
	}
}
