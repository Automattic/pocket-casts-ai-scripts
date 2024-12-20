import minimist from 'minimist';

interface ThursdayUpdateOptions {
	debug?: boolean;
	verbose?: boolean;
	help?: boolean;
	from?: string;
	to?: string;
}

export function args() {
	const argv = minimist<ThursdayUpdateOptions>(process.argv.slice(2));
	return argv;
}
