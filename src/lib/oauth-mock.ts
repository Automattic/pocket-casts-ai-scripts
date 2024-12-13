interface TokenSet {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
}

export async function authorize(): Promise<void> {
	// Mock implementation
	console.log("Mock: Authorization successful");
}

export async function getOAuthTokens(): Promise<TokenSet> {
	// Mock implementation
	return {
		accessToken: "mock-token",
		refreshToken: "mock-refresh-token",
		expiresIn: 3600,
	};
}

export async function resetOAuthTokens(): Promise<void> {
	// Mock implementation
	console.log("Mock: Tokens reset");
}
