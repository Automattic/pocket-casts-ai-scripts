import type { InferValidationOutput } from "./schema.types";
import { Schema } from "./schema.class";
import type { Validation } from "./schema.types";

type AnySchema = Validation<any, any, any>;
type ObjectSchema = Record<string, AnySchema>;

class SchemaFactory {
	private create =
		<T, S = undefined>(
			options: Omit<Validation<T, S>, "description">,
		): ((description: string) => Validation<T, S>) =>
		(description: string) =>
			new Schema({
				...options,
				description,
			});

	public string = this.create({
		type: "string",
		parse: (input): string => {
			if (typeof input === "string") return input.trim();
			if (input == null)
				throw new Error("Value is null or undefined");
			return String(input).trim();
		},
		example: () => "example string",
	});

	public number = this.create({
		type: "number",
		parse: (input): number => {
			if (typeof input === "number" && !isNaN(input)) return input;
			if (typeof input === "string") {
				const parsed = Number(input.trim());
				if (!isNaN(parsed)) return parsed;
			}
			throw new Error(`Cannot convert ${input} to a number`);
		},
		example: () => 42,
	});

	public boolean = this.create({
		type: "boolean",
		parse: (input): boolean => {
			if (typeof input === "boolean") return input;
			if (typeof input === "string") {
				const trimmed = input.trim().toLowerCase();
				if (trimmed === "true") return true;
				if (trimmed === "false") return false;
			}
			if (typeof input === "number") return input !== 0;
			throw new Error(`Cannot convert ${input} to a boolean`);
		},
		example: () => true,
	});

	private getRealValue<T>(value: T): T {
		try {
			return JSON.parse(value as any);
		} catch (error) {
			return value;
		}
	}

	public array = <V extends AnySchema>(
		itemValidator: V,
	): Validation<Array<InferValidationOutput<V>>, string, V> => {
		return new Schema<Array<InferValidationOutput<V>>, string, V>({
			parse: (input): Array<InferValidationOutput<V>> => {
				let arr: unknown[];
				if (typeof input === "string") {
					try {
						arr = JSON.parse(input);
					} catch (error) {
						throw new Error("Input is not a valid JSON array");
					}
				} else if (Array.isArray(input)) {
					arr = input;
				} else {
					throw new Error("Input is not an array");
				}
				if (!Array.isArray(arr))
					throw new Error("Input is not an array");
				return arr.map(itemValidator.parse);
			},
			schema: itemValidator,
			type: "array",
			description: `[${itemValidator.desc}]`,
			example: () => {
				return JSON.stringify(
					[this.getRealValue(itemValidator.example())],
					null,
					2,
				);
			},
		});
	};

	public object = <T extends ObjectSchema>(
		schema: T,
	): Validation<
		{ [K in keyof T]: InferValidationOutput<T[K]> },
		string,
		T
	> => {
		return new Schema<
			{ [K in keyof T]: InferValidationOutput<T[K]> },
			string,
			T
		>({
			parse: (
				input,
			): { [K in keyof T]: InferValidationOutput<T[K]> } => {
				let obj: Record<string, unknown>;
				if (typeof input === "string") {
					try {
						obj = JSON.parse(input);
					} catch (error) {
						throw new Error(
							"Input is not a valid JSON object",
						);
					}
				} else if (
					typeof input === "object" &&
					input !== null &&
					!Array.isArray(input)
				) {
					obj = Object.fromEntries(Object.entries(input));
				} else {
					throw new Error("Input is not an object");
				}

				const result: Partial<{
					[K in keyof T]: InferValidationOutput<T[K]>;
				}> = {};
				for (const key in schema) {
					if (!(key in obj)) {
						throw new Error(`Missing required key: ${key}`);
					}
					result[key] = schema[key].parse(obj[key]);
				}
				return result as {
					[K in keyof T]: InferValidationOutput<T[K]>;
				};
			},
			schema,
			type: "object",
			description: `{\n${Object.entries(schema)
				.map(([key, val]) => `  "${key}": ${val.desc}`)
				.join(",\n")}\n}`,
			example: () => {
				const result: {
					[K in keyof T]: InferValidationOutput<T[K]>;
				} = {} as any;
				for (const [key, validator] of Object.entries(schema)) {
					result[
						key as keyof {
							[K in keyof T]: InferValidationOutput<T[K]>;
						}
					] = this.getRealValue(validator.example());
				}
				return JSON.stringify(result, null, 2);
			},
		}).description("Object");
	};
}

export const v = new SchemaFactory();
