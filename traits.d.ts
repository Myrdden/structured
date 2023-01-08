
export const Show: Show;
export type Show = {
	readonly toString: () => string;
	readonly toJSON: () => string;
	readonly [Symbol.toPrimitive]: () => string;
};

export const Eq: Eq;
export interface Eq {
	readonly eq: (rhs: this) => boolean;
	readonly ne: (rhs: this) => boolean;
}

export const Ord: Ord;
export interface Ord extends Eq {
	readonly lt: (rhs: this) => boolean;
	readonly gt: (rhs: this) => boolean;
	readonly le: (rhs: this) => boolean;
	readonly ge: (rhs: this) => boolean;
	readonly max: (rhs: this) => this;
	readonly min: (rhs: this) => this;
	readonly compare: (rhs: this) => (-1 | 0 | 1);
}

export const compare: <T extends Ord> (a: T, b: T) => boolean;

export const ShowOrd: (Show & Ord);