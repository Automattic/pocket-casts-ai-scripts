import { getPreferences } from "@/preferences";
import {
	Detail,
	ActionPanel,
	Action,
	openExtensionPreferences,
	Icon,
} from "@raycast/api";
import { ReactNode } from "react";

interface Props {
	children: ReactNode;
}

export function GitHubTokenGuard({ children }: Props) {
	const GITHUB_TOKEN = getPreferences().GITHUB_TOKEN;

	if (!GITHUB_TOKEN) {
		return (
			<Detail
				markdown={`# GitHub Token Required

To use this command, you need to configure a GitHub Personal Access Token (PAT).

### Steps to create a token:

1. Visit [GitHub's Token Settings](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g. "Raycast Pocket Casts")
4. Select the following scopes:
   - \`repo\` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token

Once you have your token, click the "Open Extension Preferences" button below to configure it.`}
				actions={
					<ActionPanel>
						<Action
							title="Open Extension Preferences"
							onAction={openExtensionPreferences}
							icon={Icon.Gear}
							shortcut={{ modifiers: ["cmd"], key: "," }}
						/>
						<Action.OpenInBrowser
							title="Open GitHub Token Settings"
							url="https://github.com/settings/tokens"
						/>
					</ActionPanel>
				}
			/>
		);
	}

	return <>{children}</>;
}
