import { WPCOMAdapter } from "./adapter-wpcom";
import { Thread } from './nchain';

export const wpcom = (model: "smart" | "fast") => {
	return new Thread(model, {
		smart: new WPCOMAdapter().use("llama3-70b"),
		fast: new WPCOMAdapter().use("llama3-8b"),
	});
};

export const openai = (model: "smart" | "fast") => {
	return new Thread(model, {
		smart: new WPCOMAdapter().use("gpt-4o"),
		fast: new WPCOMAdapter().use("gpt-4o-mini"),
	});
};
