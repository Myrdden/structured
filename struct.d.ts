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
	Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
	Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends
> = (
	{ -readonly [ key in (keyof Assign | keyof Getter | keyof Setter) ]: PickMutDef<key, Assign, Getter, Setter>; }
	& Readonly<(Define & Memo & Constant & Computed & Method)>
	& Extended<Extends>
);

type StructTemplate <
	Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
	Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends, Static extends object = {},
	PostExtended extends object = Extended<Extends>
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
		[ key in keyof Define ]: Define[key];
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	memo?: {
		[ key in keyof Memo ]: Memo[key];
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	constant?: {
		[ key in keyof Constant ]: Constant[key];
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	computed?: {
		[ key in keyof Computed ]: (struct: Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>) => Computed[key];
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	method?: {
		[ key in keyof Method ]: Method[key] extends func
			? (key extends (keyof PostExtended) ? PostExtended[key] : Method[key])
			: func;
	} & ThisType<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, PostExtended>>;

	static?: Partial<Static>;
};

export type Struct <T extends object, ConstantKeys extends PropertyKey = '', Static extends object = {}> = ({
	(values?: Partial<Omit<T, ConstantKeys>>): T;
	new (values?: Partial<Omit<T, ConstantKeys>>): T;
	prototype: T;
} & Readonly<Static>);

export const Struct: {
	<Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends, Static extends object = {}
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends, Static>): Struct<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>, keyof Constant, Static>;

	new <Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends, Static extends object = {}
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends, Static>): Struct<Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>, keyof Constant, Static>;
};

export const Trait: {
	<Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>): Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>;

	new <Assign extends object, Getter extends object, Setter extends object, Define extends object, Memo extends object,
		Constant extends object, Computed extends object, Method extends object, Extends extends StructExtends
	> (template: StructTemplate<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>): Compose<Assign, Getter, Setter, Define, Memo, Constant, Computed, Method, Extends>;
};

/** Special implementation of JSON.stringify for use with Structs */
export const stringify: typeof JSON.stringify;
export const toObject: (struct: object) => object;
