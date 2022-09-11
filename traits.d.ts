
export const Show: Show;
export type Show = {
	readonly toString: () => string;
	readonly toJSON: () => string;
	readonly [Symbol.toPrimitive]: () => string;
};

