import { useState, useEffect } from "react";
import { Toast, showToast } from "@raycast/api";
import { getThursdayUpdates } from "./get-thursday-updates";
import type { ProgressStep } from "../types";

export function useSprintReport() {
	const [progress, setProgress] = useState<ProgressStep>();

	// Calculate last 7 days date range
	const endDate = new Date("2024-12-05");
	const startDate = new Date("2024-11-21");

	const [isLoading, setIsLoading] = useState(true);
	const [report, setReport] = useState<string>();
	const [error, setError] = useState<Error>();

	useEffect(() => {
		let isMounted = true;

		const fetchReport = async () => {
			try {
				await new Promise((resolve) => setTimeout(resolve, 5000));
				const result = await getThursdayUpdates(
					{ startDate, endDate },
					setProgress,
				);

				if (isMounted) {
					setReport(result);
					setIsLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					setError(
						err instanceof Error
							? err
							: new Error(String(err)),
					);
					setProgress(undefined);
					showToast({
						style: Toast.Style.Failure,
						title: "Failed to generate report",
						message:
							err instanceof Error
								? err.message
								: String(err),
					});
					setIsLoading(false);
				}
			}
		};

		// Use Promise to avoid potential memory leaks
		Promise.resolve().then(() => {
			if (isMounted) {
				fetchReport();
			}
		});

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (progress && !error) {
			showToast({
				style: progress.isComplete
					? Toast.Style.Success
					: Toast.Style.Animated,
				title: progress.message,
				message: progress.detail,
			});
		}
	}, [progress, error]);

	return {
		isLoading,
		report,
		progress,
		error,
	} as const;
}
