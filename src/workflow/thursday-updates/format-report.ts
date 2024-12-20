const template = `
# Sprint Update - {{date}}

## Top Items Shipped
{{top_shipped}}

## Key Metrics

__Reserved space for key metrics__


## Projects
{{project_updates}}

## Team Updates
{{team_updates}}
`.trim();

export function formatReport(report: {
	date?: string;
	topShipped: string;
	projectUpdates: string;
	teamUpdates: string;
}): string {
	const date = report.date || new Date().toISOString().split("T")[0];

	return template
		.replace("{{date}}", date)
		.replace("{{top_shipped}}", report.topShipped)
		.replace("{{project_updates}}", report.projectUpdates)
		.replace("{{team_updates}}", report.teamUpdates)
		.trim();
}
