// Updated utility types
type Primitive = string | number | boolean | null | undefined;

// InferValidationOutput type recursively infers the output type of a Validation
// It handles Validation types, Arrays, Objects, and Primitives
export type InferValidationOutput<T> =
	// Is T a Validation type?
	T extends Validation<infer U, any, any>
		? // If U is a Primitive
			U extends Primitive
			? U
			: // If U is an Array
				U extends Array<infer V>
				? Array<InferValidationOutput<V>>
				: // If U is an Object
					U extends Record<string, any>
					? { [K in keyof U]: InferValidationOutput<U[K]> }
					: // If U is none of the above, return it as-is
						U
		: // Is T a Primitive?
			T extends Primitive
			? T
			: // Is T an Array?
				T extends Array<infer U>
				? Array<InferValidationOutput<U>>
				: // Is T an Object?
					T extends Record<string, any>
					? { [K in keyof T]: InferValidationOutput<T[K]> }
					: // If T is none of the above, return it as-is
						never;

export type Validation<T, E, S = undefined> = {
	type: string;
	example: () => E;
	parse: (input: unknown) => T;
	schema?: S;
	desc?: string;
};

export type ValidationOutput<T> =
	T extends Validation<infer U, any, any> ? U : never;
