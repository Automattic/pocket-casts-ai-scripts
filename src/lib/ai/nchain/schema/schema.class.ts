import type { Validation } from "./schema.types";

export class Schema<T, E = any, S = any> implements Validation<T, E, S> {
	#description: string;
	readonly schema?: S;
	readonly type: string;
	#example: (description: string) => E;
	readonly parse: (input: unknown) => T;

	constructor(options: Validation<T, E, S> & { description: string }) {
		this.parse = options.parse;
		this.schema = options.schema;
		this.type = options.type;
		this.#description = options.description;
		this.#example = options.example;
	}

	description(desc: string): this {
		this.#description = desc;
		return this;
	}

	get desc(): string {
		if (this.schema) {
			if (this.type === "array" && this.schema instanceof Schema) {
				return `array of [${this.schema.desc}]`;
			}
			return this.generateSchemaDescription(this.schema);
		}
		return `${this.type}: ${this.#description}`;
	}

	example(): E {
		return this.#example(this.#description);
	}

	private generateSchemaDescription(
		schema: any,
		indent: string = "",
	): string {
		const nextIndent = indent + "  ";

		if (schema instanceof Schema) {
			if (schema.type === "object") {
				const objectDesc = `${indent} ${schema.#description}\n${indent}${this.generateSchemaDescription(schema.schema, indent)}`;
				return objectDesc.trim();
			}
			return `${schema.type}: ${schema.#description}`;
		}

		if (Array.isArray(schema)) {
			return `array of [${this.generateSchemaDescription(schema[0], nextIndent)}]`;
		}

		if (typeof schema === "object" && schema !== null) {
			const entries = Object.entries(schema).map(
				([key, value]) =>
					`${nextIndent}"${key}": ${this.generateSchemaDescription(value, nextIndent)}`,
			);
			return `{\n${entries.join(",\n")}\n${indent}}`;
		}

		return String(schema);
	}
}
