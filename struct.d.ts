export type Show <T> = T extends (...args: infer A) => infer R
    ? { (...args: A): R } & Show<T>
		: T extends infer S ? { [ key in keyof S ]: (S[key] extends ((...args: infer A) => infer R) ? ((...args: A) => R) : S[key]); } : never;

// export type Identity <T> = T extends (...args: any[]) => infer R
// 	? Identity<R>
// 	: T extends infer S ? { [ key in keyof S ]: (S[key] extends ((...args: infer A) => infer R) ? ((...args: A) => R) : S[key]); } : never;
export type Identity <T> = T extends (...args: any[]) => infer R ? R : T;

type func <T = any> = (...args: any[]) => T;
type UtoI <U> = (
	(U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never
);

type StructExtends = (object | func<object> | (object | func<object>)[]);

type Nullify <T> = T extends undefined ? null : T;
type DeFuncify <T> = T extends func<infer R> ? R : T;
type DeArrayify <T> = T extends (infer R)[] ? DeFuncify<R> : T;

type Extended <E> = E extends any[]
	? UtoI<DeArrayify<E>>
	: DeFuncify<E>;

type PickMutDef <key extends (keyof T1 | keyof T2 | keyof T3), T1, T2, T3 = {}> = (key extends (keyof T1) ? T1[key] : (key extends (keyof T2) ? T2[key] : (key extends (keyof T3) ? T3[key] : never)));

type Compose <
	Assign, Getter, Setter, Define, Memo,
	Constant, Computed, Method, Extends
> = (
	{ -readonly [ key in (keyof Assign | keyof Getter | keyof Setter) ]: PickMutDef<key, Assign, Getter, Setter>; }
	& Readonly<(Define & Memo & Constant & Computed & Method)>
	& Extended<Extends>
);

type Values <Assign, Getter, Setter, Define> = (
	{ -readonly [ key in (keyof Assign | keyof Getter | keyof Setter) ]?: PickMutDef<key, Assign, Getter, Setter>; }
	& Partial<Define>
);

type StructTemplate <
		T extends Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>,
		Static extends object,
		Assign = unknown, Getter = unknown, Setter = unknown,
		Define = unknown, Memo = unknown, Constant = unknown,
		Computed = unknown, Method = unknown, Extends = unknown,
		PostExtended = Extended<Extends>
> = {
	extends?: Extends;

	assign?: {
		[ key in keyof Assign ]: (Assign[key] | undefined);
	};

	getter?: {
		[ key in keyof Getter ]: (val: PickMutDef<key, Setter, Assign, Getter>, struct: T) => Getter[key];
	} & ThisType<T>;

	setter?: {
		[ key in keyof Setter ]: (next: PickMutDef<key, Assign, Getter, Setter>, struct: T) => (PickMutDef<key, Assign, Setter> | void);
	} & ThisType<T>;

	define?: {
		[ key in keyof Define ]: (Define[key] | undefined);
	} & Partial<T>;

	memo?: {
		[ key in keyof Memo ]: (struct: T) => Memo[key];
	} & ThisType<T>;

	constant?: {
		[ key in keyof Constant ]: Nullify<Constant[key]>;
	};

	computed?: {
		[ key in keyof Computed ]: (struct: T) => Computed[key];
	} & ThisType<T>;

	method?: {
		[ key in keyof Method ]: Method[key] extends func
			? (key extends (keyof PostExtended) ? PostExtended[key] : Method[key])
			: func;
	} & ThisType<T>;

	static?: Static;

	init?: (values: Values<Assign, Getter, Setter, Define>) => void;
};

export type Struct <T extends object, Keys extends (keyof T) = (keyof T), Static extends object = {}> = ({
	(values?: Partial<Pick<T, Keys>>): T;
	new (values?: Partial<Pick<T, Keys>>): T;
	prototype: T;
} & Readonly<Static>);

export const Struct: {
	<T extends Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>,
		Static extends object,
		Assign = unknown, Getter = unknown, Setter = unknown,
		Define = unknown, Memo = unknown, Constant = unknown,
		Computed = unknown, Method = unknown, Extends = unknown
	> (template: StructTemplate<T, Static, Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>): Struct<T, (keyof Assign | keyof Getter | keyof Setter | keyof Define), Static>;

	readonly is: (thing: any) => thing is object;
	readonly extends: <T extends (object | func<object>)> (struct: object, ...traits: T[]) => struct is DeFuncify<T>;

	readonly stringify: typeof JSON.stringify;
	readonly toObject: (struct: object) => object;

	readonly update: <T extends object> (struct: T, ...values: object[]) => T;

	readonly patch: {
		<T extends object> (struct: T, values: Partial<T>): T;
		<T extends object, K extends (keyof T)> (struct: T, key: K, value: T[K]): T;
	};

	readonly forEach: <T extends ForEachable> (object: T, fn: ((element: ForEachVal<T>, index: ForEachKey<T>, object: T) => void), thisArg?: any) => void;
	readonly forEachable: (object: unknown) => object is ForEachable;
};

type ForEachable = (string | any[] | Map<any, any> | Set<any> | Iterable<any> | Record<PropertyKey, any>);

type ForEachVal <T> = T extends string ? string
	: T extends Array<infer V> ? V
	: T extends Map<any, infer V> ? V
	: T extends Set<infer V> ? V
	: T extends Iterable<infer V> ? V
	: T extends Record<any, infer V> ? V
	: never;

type ForEachKey <T> = T extends (string | any[]) ? number
	: T extends Map<infer K, any> ? K
	: T extends Set<infer S> ? S
	: T extends Iterable<any> ? undefined
	: T extends Record<infer K, any> ? K
	: never;

export const Trait: {
	<T extends Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>,
		Static extends object,
		Assign = unknown, Getter = unknown, Setter = unknown,
		Define = unknown, Memo = unknown, Constant = unknown,
		Computed = unknown, Method = unknown, Extends = unknown
	> (template: StructTemplate<T, Static, Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>): T;

	new <T extends Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>,
		Static extends object,
		Assign = unknown, Getter = unknown, Setter = unknown,
		Define = unknown, Memo = unknown, Constant = unknown,
		Computed = unknown, Method = unknown, Extends = unknown
	> (template: StructTemplate<T, Static, Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>): T;
};

/** Special implementation of JSON.stringify for use with Structs */
export const stringify: typeof JSON.stringify;
export const toObject: (struct: object) => object;
export const _extends: (struct: object, ...traits: object[]) => boolean;