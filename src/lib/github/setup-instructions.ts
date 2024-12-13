export function getGitHubTokenSetupInstructions(): string {
	return `To use this command, you need to configure a GitHub Personal Access Token (PAT).

Steps to create a token:
1. Visit GitHub's Token Settings: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g. "Sprint Update Generator")
4. Select the following scopes:
   - repo (Full control of repositories)
5. Click "Generate token"
6. Copy the token

Once you have your token, set it in your preferences file as GITHUB_TOKEN.`;
}
