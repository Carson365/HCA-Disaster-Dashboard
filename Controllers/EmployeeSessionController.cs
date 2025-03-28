using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AISComp.Controllers
{
	[ApiController]
	[Route("api/[controller]")]
	public class EmployeeSessionController : ControllerBase
	{
		private const string SelectedEmployeeKey = "SelectedEmployeeId";
		private const string CutEmployeeKey = "CutEmployeeId";

		// GET: api/EmployeeSession/selected
		[HttpGet("selected")]
		public IActionResult GetSelectedEmployee()
		{
			var employeeId = HttpContext.Session.GetString(SelectedEmployeeKey);
			return Ok(employeeId ?? string.Empty);
		}

		// POST: api/EmployeeSession/selected
		[HttpPost("selected")]
		public IActionResult SetSelectedEmployee([FromBody] string employeeId)
		{
			HttpContext.Session.SetString(SelectedEmployeeKey, employeeId);
			return Ok();
		}

		// GET: api/EmployeeSession/cut
		[HttpGet("cut")]
		public IActionResult GetCutEmployee()
		{
			var employeeId = HttpContext.Session.GetString(CutEmployeeKey);
			return Ok(employeeId ?? string.Empty);
		}

		// POST: api/EmployeeSession/cut
		[HttpPost("cut")]
		public IActionResult SetCutEmployee([FromBody] string employeeId)
		{
			HttpContext.Session.SetString(CutEmployeeKey, employeeId);
			return Ok();
		}

		// POST: api/EmployeeSession/clear
		[HttpPost("clear")]
		public IActionResult ClearSession()
		{
			HttpContext.Session.Remove(SelectedEmployeeKey);
			HttpContext.Session.Remove(CutEmployeeKey);
			return Ok();
		}
	}
}
