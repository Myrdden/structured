const Prototype = Symbol();
const Constructor = Symbol();
const Extending = Symbol();
const Values = Symbol();

const ToDefine = Symbol();
const ToAssign = Symbol();
const ToExtend = Symbol();
const Defaults = Symbol();

/**@typedef {(...args: any) => any} func*/
/**@typedef {(string | symbol)} key*/
//@ts-ignore
/**@typedef {{ [Prototype]: object; [Extending]: Set<Either>; [ToDefine]: ReadonlyArray<key>; [ToAssign]: ReadonlyArray<key>; [ToExtend]: ReadonlyArray<[ key, boolean ]>; [Defaults]: Record<key, any>; }} Trait*/
//@ts-ignore
/**@typedef {Trait & { (values: object): object; }} StructConstructor*/
//@ts-ignore
/**@typedef {{ [Constructor]: StructConstructor; [Values]: Record<PropertyKey, any>; [ key: PropertyKey ]: any; }} Instance*/
/**@typedef {Trait | Instance} Either*/


/**@returns {thing is Object}*/
export const isPlainObj = (/**@type unknown*/ obj) => obj != null && (typeof obj === 'object') && Object.getPrototypeOf(obj) === Object.prototype;

/**@returns {thing is PropertyKey}*/
export const isPropertyKey = (/**@type unknown*/ thing) => (
	(typeof thing === 'string')
	|| (typeof thing === 'number')
	|| (typeof thing === 'symbol')
);

export const isPopulated = (/**@type unknown*/ thing) => {
	if (thing == null || (typeof thing !== 'object'))
		return false;

	if (thing instanceof Set || thing instanceof Map)
		return !!thing.size;

	if (Array.isArray(thing))
		return !!thing.length;

	for (const _ in thing)
		return true;

	return false;
};

const ofKeys = (/**@type func*/ fn, /**@type unknown*/ thing, /**@type boolean*/ strict) => {
	if (Array.isArray(thing)) {
		for (let i = thing.length; i--;) {
			if (!strict && typeof thing[i] === 'string') {
				fn(thing[i]);
			} else if (Array.isArray(thing[i])) {
				fn(thing[i][0], thing[i][1]);
			} else throw new Error('Key Array must be all ' + (strict ? '' : 'strings or ') + '[ key, value ] tuples.');
		}
	} else if (isPlainObj(thing)) {
		const names = Object.getOwnPropertyNames(thing);
		for (let i = names.length; i--;)
			fn(names[i], thing[names[i]]);
		const symbols = Object.getOwnPropertySymbols(thing);
		for (let i = symbols.length; i--;)
			fn(symbols[i], thing[symbols[i]]);
	} else throw new Error('Keys must be an Array of ' + (strict ? '' : 'strings or ') + '[ key, value ] tuples, or an object.');
};

/**@returns {thing is Instance}*/
const isInstance = (/**@type unknown*/ thing) => (
	thing != null && (typeof thing === 'object')
	&& Object.hasOwn(thing, Constructor)
);

/**@returns {thing is Trait}*/
const isTrait = (/**@type unknown*/ thing) => (
	thing != null && (typeof thing === 'object')
	&& Object.hasOwn(thing, Prototype)
);

/**@returns {thing is (Trait | Instance)}*/
export const isStruct = (/**@type unknown*/ thing) => (
	thing != null && (typeof thing === 'object')
	&& (Object.hasOwn(thing, Prototype) || Object.hasOwn(thing, Constructor))
);

export const _extends = (/**@type Either*/ struct, /**@type Either[]*/ ...traits) => {
	if (isInstance(struct)) {
		struct = struct[Constructor];
	} else if (!Object.hasOwn(struct, Prototype))
		throw new Error('First argument is not a Struct or Trait.');

	for (let i = traits.length; i--;) {
		//@ts-ignore
		if (!struct[Extending].has(traits[i]))
			return false;
	}

	return true;
};

export const toObject = (/**@type Instance*/ struct) => {
	const obj = Object.create(null);
	for (const key in struct)
		obj[key] = struct[key];

	return obj;
};

export const stringify = (/**@type Instance*/ thing, /**@type any*/ replacer, /**@type any*/ space) => {
	if (!isInstance(thing))
		return JSON.stringify(thing, replacer, space);
	return JSON.stringify(toObject(thing), replacer, space);
};

export const inspect = (/**@type any*/ thing) => JSON.parse(stringify(thing));

const compose = (/**@type any*/ definition) => {
	if (!isPlainObj(definition))
		throw new Error('Definition must be a plain object.');

	/**@type Set<PropertyKey>*/
	const keys = new Set();
	/**@type Set<PropertyKey>*/
	const canOverride = new Set();

	const prototype = Object.create(null);
	/**@type PropertyKey[]*/
	let toDefine = [];
	/**@type PropertyKey[]*/
	let toAssign = [];
	/**@type {[PropertyKey, boolean][]}*/
	let toExtend = [];
	/**@type Set<Either>*/
	const extending = new Set();
	const defaults = Object.create(null);

	let guard = false;

	// ----- IMMUTABLE STUFF -----

	const makeConstant = (/**@type PropertyKey*/ key, /**@type any*/ val) => {
		if (guard) {
			if (keys.has(key) && !canOverride.has(key))
				throw new Error('Cannot define property for \'' + String(key) + '\' as it already exists within the Struct.');
			keys.add(key);
			canOverride.delete(key);
		}

		Object.defineProperty(prototype, key, {
			value: (val === undefined ? null : val),
			enumerable: true,
			writable: false
		});
	};

	const makeDefinition = (/**@type PropertyKey*/ key, /**@type any*/ val) => {
		makeConstant(key, val);
		toDefine.push(key);
	};

	const makeComputation = (/**@type PropertyKey*/ key, /**@type func*/ fn) => {
		if (guard) {
			if (keys.has(key) && !canOverride.has(key))
				throw new Error('Cannot define computed property for \'' + String(key) + '\' as it already exists within the Struct.');
			keys.add(key);
			canOverride.delete(key);
		}

		toExtend.push([ key, true ]);

		if (fn == null) {
			Object.defineProperty(prototype, key, {
				get: function () { throw new Error('Struct does not provide an extendation for computed property \'' + String(key) + '\''); },
				enumerable: true
			});
		} else if (typeof fn === 'function') {
			Object.defineProperty(prototype, key, {
				get: fn,
				enumerable: true
			});
		} else throw new Error('Computed properties must be functions.');
	};

	// ----- MUTABLE STUFF -----

	/**@typedef {{
		get?: func;
		set?: func ;
		default?: any;
	}} AssignmentDef*/

	const makeAssignment = (/**@type PropertyKey*/ key, /**@type AssignmentDef*/ desc) => {
		if (guard) {
			if (keys.has(key) && !canOverride.has(key))
				throw new Error('Cannot create assignable property \'' + String(key) + '\' as it already exists within the Struct.');
			keys.add(key);
			canOverride.delete(key);
		}

		toAssign.push(key);
		if (desc.default !== undefined) defaults[key] = desc.default;

		let get, set;
		if (desc.get != null) {
			if (typeof get !== 'function')
				throw new Error('Getter must be function.');
			const getter = desc.get;
			/**@this any*/
			get = function () {
				const got = getter.call(this, this[Values][key], this);
				return (got === undefined ? null : got);
			};
		} else get = /**@this any*/ function () { return this[Values][key]; };

		if (desc.set != null) {
			if (typeof desc.set !== 'function')
				throw new Error('Setter must be function.');
			const setter = desc.set;
			/**@this any*/
			set = function (/**@type any*/ next) {
				const result = setter.call(this, next, this);
				if (result === undefined)
					this[Values][key] = (next === undefined ? null : next);
				else this[Values][key] = result;
			};
		} else set = /**@this any*/ function (/**@type any*/ next) { this[Values][key] = (next === undefined ? null : next); };

		Object.defineProperty(prototype, key, {
			get, set,
			enumerable: true
		});
	};

	/**@type Record<PropertyKey, AssignmentDef>*/
	const assignments = {};
	const place = (/**@type {keyof AssignmentDef}*/ type) => (/**@type PropertyKey*/ key, /**@type any*/ val) => {
		if (assignments[key] == null)
			assignments[key] = {};
		assignments[key][type] = val;
	};

	if (definition.assign != null)
		ofKeys(place('default'), definition.assign);
	if (definition.getter != null)
		ofKeys(place('get'), definition.getter);
	if (definition.setter != null)
		ofKeys(place('set'), definition.setter);

	// ----- METHODS -----

	const makeMethod = (/**@type PropertyKey*/ key, /**@type func*/ val, /**@type boolean*/ getter) => {
		if (guard) {
			if (keys.has(key) && !canOverride.has(key))
				throw new Error('Cannot define method for \'' + String(key) + '\' as it already exists within the Struct.');
			keys.add(key);
			canOverride.delete(key);
		}

		toExtend.push([ key, false ]);

		if (val == null) {
			Object.defineProperty(prototype, key, {
				value: () => { throw new Error('Struct does not provide an implementation for \'' + String(key) + '\''); },
				enumerable: false,
				writable: false
			});
		} else if (typeof val === 'function') {
			if (getter === true) {
				Object.defineProperty(prototype, key, {
					value: val,
					enumerable: false,
					writable: false
				});
			} else Object.defineProperty(prototype, key, {
				get: function () { return val.bind(this); },
				enumerable: false
			});
		} else throw new Error('Methods must be functions.');
	};

	// ----- EXTENSION -----

	if (definition.extends != null) {
		/**@type {object | null}*/
		let protoProto = null;
		let protoProtoWeight = 0;

		const extend = (/**@type Trait*/ struct) => {
			if (isInstance(struct)) {
				struct = struct[Constructor];
			} else if (!Object.hasOwn(struct, Prototype))
				throw new Error('Extended object is not a Extendable (A Struct constructor, or a Trait).');

			if (extending.has(struct))
				throw new Error('Duplicate extendation.');
			extending.add(struct);

			toDefine = toDefine.concat(struct[ToDefine]);
			toAssign = toAssign.concat(struct[ToAssign]);
			toExtend = toExtend.concat(struct[ToExtend]);

			let extendProto = struct[Prototype];
			let extendProtoWeight = 0;
			while (extendProto) {
				const names = Object.getOwnPropertyNames(extendProto);
				const symbols = Object.getOwnPropertySymbols(extendProto);
				extendProtoWeight = names.length + symbols.length;

				let useSymbols = false;
				for (let i = names.length; i--;) {
					const key = (useSymbols ? symbols[i] : names[i]);
					if (keys.has(key))
						throw new Error('Cannot extend from \'' + String(key) + '\' as it already exists in the Struct.');
					keys.add(key);
					canOverride.add(key);

					if (!useSymbols && i === 0)
						(i = symbols.length, useSymbols = true);
				}

				extendProto = Object.getPrototypeOf(extendProto);
			}

			if (protoProto == null) {
				protoProto = struct[Prototype];
				protoProtoWeight = extendProtoWeight;
			} else {
				let extending = struct[Prototype];
				if (extendProtoWeight > protoProtoWeight) {
					extending = protoProto;
					protoProto = struct[Prototype];
					protoProtoWeight = extendProtoWeight;
				}

				do {
					const names = Object.getOwnPropertyNames(extending);
					const symbols = Object.getOwnPropertySymbols(extending);

					let useSymbols = false;
					for (let i = names.length; i--;) {
						const key = (useSymbols ? symbols[i] : names[i]);
						const desc = Object.getOwnPropertyDescriptor(extending, key);

						//@ts-ignore
						Object.defineProperty(prototype, key, desc);

						if (!useSymbols && i === 0)
							(i = symbols.length, useSymbols = true);
					}
				} while (extending = Object.getPrototypeOf(extending));
			}
		};

		if (Array.isArray(definition.extends)) {
			for (let i = definition.extends.length; i--;)
				extend(definition.extends[i]);
		} else extend(definition.extends);

		Object.setPrototypeOf(prototype, protoProto);
	}

	// ----- DO THE STUFF -----

	guard = true;

	if (definition.constant != null)
		ofKeys(makeConstant, definition.constant);

	if (definition.method != null)
		ofKeys(makeMethod, definition.method);

	if (definition.define != null)
		ofKeys(makeDefinition, definition.define);

	if (definition.computed != null)
		ofKeys(makeComputation, definition.computed);

	if (isPopulated(assignments))
		ofKeys(makeAssignment, assignments);

	return { prototype, extending, toDefine, toAssign, toExtend, defaults };
};

export const Struct = (() => {
	const Struct = function (/**@type any*/ definition) {
		const { prototype, extending, toDefine, toAssign, toExtend, defaults } = compose(definition);

		// ----- CREATE CONSTRUCTOR -----

		/**@type StructConstructor*/
		//@ts-ignore
		const constructor = function (/**@type any*/ values) {
			if (values == null) {
				values = {};
			} else if (typeof values !== 'object')
				throw new Error('Values to constructor must be an object.');

			const struct = Object.create(prototype);

			Object.defineProperties(struct, {
				[Constructor]: { value: constructor },
				[Values]: { value: {} }
			});

			for (let i = toDefine.length; i--;) {
				const key = toDefine[i];
				if (values[key] !== undefined) {
					Object.defineProperty(struct, key, {
						value: values[key],
						enumerable: true,
						writable: false
					});
				}
			}

			for (let i = toAssign.length; i--;) {
				const key = toAssign[i];
				if (values[key] !== undefined) {
					struct[Values][key] = values[key];
				} else if (defaults[key] !== undefined) {
					struct[Values][key] = defaults[key];
				} else throw new Error('In assignment to key \'' + String(key) + '\': No value was provided and no default value was defined.');
			}

			for (let i = toExtend.length; i--;) {
				const key = toExtend[i][0];
				if (Object.hasOwn(values, key)) {
					const val = values[key];
					if (typeof val !== 'function')
						throw new Error('Extended methods/properties must be functions.');

					Object.defineProperty(struct, key, {
						get: (toExtend[i][1]
							? val
							: /**@this any*/ function () { return val.bind(this); }
						),
						enumerable: false
					});
				}
			}

			return Object.seal(struct);
		};

		extending.add(constructor);

		Object.defineProperties(constructor, {
			[Symbol.hasInstance]: { value: (/**@type any*/ instance) => {
				if (isInstance(instance)) {
					instance = instance[Constructor];
				} else if (!Object.hasOwn(instance, Prototype))
					return false;

				if (Object.hasOwn(instance, Constructor))
					instance = instance[Constructor];

				return instance[Extending].has(constructor);
			}},

			[Prototype]: { value: prototype },
			[Extending]: { value: extending },
			[ToDefine]: { value: Object.freeze(toDefine) },
			[ToAssign]: { value: Object.freeze(toAssign) },
			[ToExtend]: { value: Object.freeze(toExtend) },
			[Defaults]: { value: Object.freeze(defaults) }
		});

		if (definition.static != null) {
			const statics = definition.static;
			if (!isPlainObj(statics))
				throw new Error('definition.static must be a plain object.');

			const names = Object.getOwnPropertyNames(statics);
			const symbols = Object.getOwnPropertySymbols(statics);

			let useSymbols = false;
			for (let i = names.length; i--;) {
				const key = (useSymbols ? symbols[i] : names[i]);

				Object.defineProperty(constructor, key, {
					value: (statics[key] === undefined ? null : statics[key]),
					enumerable: true,
					writable: false
				});

				if (!useSymbols && i === 0)
					(i = symbols.length, useSymbols = true);
			}
		}

		return Object.freeze(constructor);
	};

	return Object.freeze(Struct);
})();

export default Struct;

export const Trait = (() => {
	const Trait = function (/**@type any*/ definition) {
		const { prototype, extending, toDefine, toAssign, toExtend, defaults } = compose(definition);

		const trait = Object.create(null);
		extending.add(trait);

		Object.defineProperties(trait, {
			[Symbol.hasInstance]: { value: (/**@type any*/ instance) => {
				if (isInstance(instance)) {
					instance = instance[Constructor];
				} else if (!Object.hasOwn(instance, Prototype))
					return false;

				if (Object.hasOwn(instance, Constructor))
					instance = instance[Constructor];

				return instance[Extending].has(trait);
			}},

			[Prototype]: { value: prototype },
			[Extending]: { value: extending },
			[ToDefine]: { value: Object.freeze(toDefine) },
			[ToAssign]: { value: Object.freeze(toAssign) },
			[ToExtend]: { value: Object.freeze(toExtend) },
			[Defaults]: { value: Object.freeze(defaults) }
		});

		return Object.freeze(trait);
	};

	Object.defineProperties(Trait, {
		is: { value: isTrait },
		isInstance: { value: isInstance },
		extends: { value: _extends }
	});

	return Object.freeze(Trait);
})();
