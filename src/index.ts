import { GitHubTokenGuard } from "./components/github-token-guard";
import { maybeUseDebug } from './preferences';
import { ReportView } from "./workflow/sprint-update/components/report-view";
import { useSprintReport } from "./workflow/sprint-update/hooks/use-sprint-report";

export default function Command() {
	maybeUseDebug();
	const { isLoading, report, progress, error } = useSprintReport();

	return (
		<GitHubTokenGuard>
			<ReportView
				markdown={report}
				isLoading={isLoading}
				progress={progress}
				error={error}
			/>
		</GitHubTokenGuard>
	);
}
