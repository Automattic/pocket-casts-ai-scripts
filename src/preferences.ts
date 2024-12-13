import { getPreferenceValues } from "@raycast/api";
import { WSServer } from './lib/ai/nchain/debugger/ws-server';
import { useEffect } from 'react';

interface Preferences {
	autoproxxy: string;
	debug: boolean;
	GITHUB_TOKEN: string;
}

export const getPreferences = (): Preferences => getPreferenceValues<Preferences>();

export const maybeUseDebug = () => {
	useEffect(() => {
		if (getPreferences().debug) {
			WSServer.getInstance().start();
		}
	}, []);
};
