import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

export function useErrorHandler() {
	const [error, setError] = useState<Error>();

	useEffect(() => {
		if (error) {
			const { title, message } = maybeExplainError(error.message);
			showToast({
				style: Toast.Style.Failure,
				title,
				message,
			});
		}
	}, [error]);

	return setError;
}

function maybeExplainError(message: string): {
	title: string;
	message: string;
} {
	console.error(message);
	if (message.includes("reason: connect ECONNREFUSED")) {
		return {
			title: "ECONNREFUSED",
			message: "Is your Autoproxxy running?",
		};
	}

	if (message.includes("Socket closed")) {
		return {
			title: "Socket closed",
			message:
				"Is your public-api.wordpress.com sandboxed? Connect to your sandbox.",
		};
	}

	return {
		title: "Error",
		message,
	};
}
