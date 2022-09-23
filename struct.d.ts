type Show <T> = T extends (...args: infer A) => infer R
    ? { (...args: A): R } & Identity<T>
    : Identity<T>;

export type Identity <T> = T extends (...args: any[]) => infer R
	? Identity<R>
	: T extends infer S ? { [ key in keyof S ]: (S[key] extends ((...args: infer A) => infer R) ? ((...args: A) => R) : S[key]); } : never;

type func <T = any> = (...args: any[]) => T;
type UtoI <U> = (
	(U extends any ? (k: U) => void: never) extends ((k: infer I) => void) ? I : never
);

type StructExtends = (object | func<object> | (object | func<object>)[]);

type Nullify <T> = T extends undefined ? null : T;
type DeFuncify <T> = T extends func<infer R> ? R : T;
type DeArrayify <T> = T extends (infer R)[] ? DeFuncify<R> : T;

type Extended <E extends StructExtends> = E extends any[]
	? UtoI<DeArrayify<E>>
	: DeFuncify<E>;

type PickMutDef <key extends (keyof T1 | keyof T2 | keyof T3), T1, T2, T3 = {}> = (key extends (keyof T1) ? T1[key] : (key extends (keyof T2) ? T2[key] : (key extends (keyof T3) ? T3[key] : never)));

type Compose <
	Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo,
	Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends
> = (
	{ -readonly [ key in (keyof Assign | keyof Getter | keyof Setter) ]: PickMutDef<key, Assign, Getter, Setter>; }
	& Readonly<(Define & Memo & Constant & Computed & Method)>
	& Extended<Extends>
);

type CustomConstructor <T extends object, Keys extends (keyof T) = keyof T, Static extends object = {}> = (
	structConstructor: Struct<T, Keys, Static>,
	values: Partial<Pick<T, Keys>>
) => T;

type StructTemplate <
	Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo,
	Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends,
	Overrides extends object, Static extends object = {}, PostExtended extends object = Extended<Extends>
> = {
	extends?: Extends;

	assign?: {
		[ key in keyof Assign ]: (Assign[key] | undefined);
	};

	getter?: {
		[ key in keyof Getter ]: (val: PickMutDef<key, Setter, Assign, Getter>, struct: Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>) => Getter[key];
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	setter?: {
		[ key in keyof Setter ]: (next: PickMutDef<key, Assign, Getter, Setter>, struct: Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>) => (PickMutDef<key, Assign, Setter> | void);
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	define?: {
		[ key in keyof Define ]: (Define[key] | undefined);
	};

	memo?: {
		[ key in keyof Memo ]: (struct: Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>) => Memo[key];
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	constant?: {
		[ key in keyof Constant ]: Nullify<Constant[key]>;
	};

	computed?: {
		[ key in keyof Computed ]: (struct: Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>) => Computed[key];
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	method?: {
		[ key in keyof Method ]: Method[key] extends func
			? (key extends (keyof PostExtended) ? PostExtended[key] : Method[key])
			: func;
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	static?: Partial<Static>;

	override?: (values: Overrides) => (object | void);
};

export type Struct <T extends object, Keys extends (keyof T) = keyof T, Overrides extends object = {}, Static extends object = {}> = ({
	(values?: Partial<(Pick<T, Exclude<Keys, keyof Overrides>> & Overrides)>): T;
	new (values?: Partial<(Pick<T, Exclude<Keys, keyof Overrides>> & Overrides)>): T;
	prototype: T;
	override: ((values: Partial<(Pick<T, Exclude<Keys, keyof Overrides>> & Overrides)>) => (Partial<(Pick<T, Exclude<Keys, keyof Overrides>> & Overrides)> | void) | null);
} & Readonly<Static>);

export const Struct: {
	<Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends,
		Overrides extends object, Static extends object = {}
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends, Overrides, Static>): Struct<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>, (keyof Assign | keyof Getter | keyof Setter | keyof Define), Overrides, Static>;

	new <Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends,
		Overrides extends object, Static extends object = {}
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends, Overrides, Static>): Struct<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>, (keyof Assign | keyof Getter | keyof Setter | keyof Define), Overrides, Static>;

	readonly is: (thing: any) => thing is object;
	readonly extends: <T extends (object | func<object>)> (struct: object, ...traits: T[]) => struct is DeFuncify<T>;

	readonly stringify: typeof JSON.stringify;
	readonly toObject: (struct: object) => object;

	readonly update: <T extends object> (struct: T, ...values: object[]) => T;

	readonly patch: {
		<T extends object> (struct: T, values: Partial<T>): T;
		<T extends object, K extends (keyof T)> (struct: T, key: K, value: T[K]): T;
	};

	readonly forEach: <T extends (object | any[] | string)> (object: T, fn: ((element: any, index: (string | number | symbol | undefined), object: T) => void), thisArg?: any) => void;
};

export const Trait: {
	<Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, {}, Extends>): Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>;

	new <Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, {}, Extends>): Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>;
};

/** Special implementation of JSON.stringify for use with Structs */
export const stringify: typeof JSON.stringify;
export const toObject: (struct: object) => object;
