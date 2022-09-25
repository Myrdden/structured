const Prototype = Symbol();
const Constructor = Symbol();
const Extending = Symbol();
const Values = Symbol();
const Template = Symbol();
const Defaults = Symbol();
const Size = Symbol();
const ToAssign = Symbol();
const ToDefine = Symbol();

/**@typedef {(...args: any) => any} func*/
/**@typedef {(string | symbol)} key*/
/**@typedef {{
	type: ('assign' | 'constant' | 'define' | 'computed' | 'memo' | 'method');
	desc: PropertyDescriptor;
	source: Trait[];
}} TemplateDesc*/
//@ts-ignore
/**@typedef {{ [Prototype]: object; [Extending]: ReadonlySet<Either>; [Template]: ReadonlyMap<key, TemplateDesc>; [Defaults]: Record<key, any>; [ToAssign]: ReadonlySet<key>; [ToDefine]: ReadonlySet<key>; [Constructor]: (StructConstructor | null); }} Trait*/
//@ts-ignore
/**@typedef {Trait & { (values: object): object; }} StructConstructor*/
//@ts-ignore
/**@typedef {{ [Values]: Record<PropertyKey, any>; [ key: PropertyKey ]: any; }} Instance*/
/**@typedef {Trait | Instance} Either*/


/**@returns {thing is Object}*/
export const isPlainObj = (/**@type unknown*/ obj) => obj != null && (typeof obj === 'object') && Object.getPrototypeOf(obj) === Object.prototype;

/**@returns {thing is PropertyKey}*/
export const isPropertyKey = (/**@type unknown*/ thing) => (
	(typeof thing === 'string')
	|| (typeof thing === 'number')
	|| (typeof thing === 'symbol')
);

const ofKeys = (/**@type func*/ fn, /**@type any*/ thing) => {
	/**@type key[]*/
	let keys = Object.getOwnPropertyNames(thing);
	for (let i = keys.length; i--;)
		fn(keys[i], thing[keys[i]]);
	keys = Object.getOwnPropertySymbols(thing);
	for (let i = keys.length; i--;)
		fn(keys[i], thing[keys[i]]);
};

/**@returns {thing is Instance}*/
const isInstance = (/**@type unknown*/ thing) => (
	thing != null && (typeof thing === 'object')
	//@ts-ignore
	&& (thing[Constructor] != null)
	&& !Object.hasOwn(thing, Prototype)
);

/**@returns {thing is Trait}*/
const isTrait = (/**@type unknown*/ thing) => (
	thing != null && (typeof thing === 'object')
	&& Object.hasOwn(thing, Prototype)
);

/**@returns {thing is (Trait | Instance)}*/
export const isStruct = (/**@type unknown*/ thing) => (
	thing != null && (typeof thing === 'object')
	//@ts-ignore
	&& (thing[Constructor] != null || Object.hasOwn(thing, Prototype))
);

export const _extends = (/**@type Either*/ struct, /**@type Trait[]*/ ...traits) => {
	for (let i = traits.length; i--;) {
		if (!isTrait(traits[i]))
			return false;

		//@ts-ignore
		if (!(struct instanceof traits[i]))
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

export const inspect = (/**@type any*/ thing) => console.log(toObject(thing));

/**@template T @returns T*/
const frozen = (/**@type T*/ obj) => (Object.setPrototypeOf(obj, null), Object.freeze(obj));

const compose = (/**@type any*/ definition) => {
	/**@type Set<key>*/
	const keys = new Set();
	const prototype = Object.create(null);
	const properties = Object.create(null);
	/**@type Map<key, TemplateDesc>*/
	const template = new Map();
	/**@type Record<key, any>*/
	const defaults = Object.create(null);
	defaults[Size] = 0;
	/**@type Set<key>*/
	const toDefine = new Set();
	/**@type Set<key>*/
	const toAssign = new Set();
	let needsValues = false;
	/**@type Set<Either>*/
	const extending = new Set();
	/**@type Set<key>*/
	const badKeys = new Set();
	/**@type string[]*/
	const errors = [];

	// ----- IMMUTABLE STUFF -----

	const makeConstant = (/**@type key*/ key, /**@type any*/ val) => {
		if (keys.has(key)) { errors.push('- Cannot define property for \'' + String(key) + '\' as it already exists within the Struct.'); return; }
		keys.add(key);
		badKeys.delete(key);

		const desc = {
			value: (val === undefined ? null : val),
			enumerable: true,
			writable: false
		};

		let temp = template.get(key);
		if (temp != null) {
			if (temp.type !== 'constant') { errors.push('- Type mismatch in \'' + String(key) + '\', extended key is \'' + temp.type + '\' but defined key is \'constant\'.'); return; }
			temp = frozen({ type: 'constant', desc, source: [ ...temp.source, prototype ] });
		} else temp = frozen({ type: 'constant', desc, source: [ prototype ] });
		template.set(key, temp);

		properties[key] = desc;
	};

	const makeDefinition = (/**@type key*/ key, /**@type any*/ val) => {
		if (keys.has(key)) { errors.push('- Cannot define property for \'' + String(key) + '\' as it already exists within the Struct.'); return; }
		keys.add(key);
		badKeys.delete(key);

		const desc = {
			value: val,
			enumerable: true,
			writable: false
		};

		let temp = template.get(key);
		if (temp != null) {
			if (temp.type !== 'define') { errors.push('- Type mismatch in \'' + String(key) + '\', extended key is \'' + temp.type + '\' but defined key is \'define\'.'); return; }
			temp = frozen({ type: 'define', desc, source: [ ...temp.source, prototype ] });
		} else temp = frozen({ type: 'define', desc, source: [ prototype ] });
		template.set(key, temp);

		toDefine.add(key);

		properties[key] = desc;
	};

	const makeComputation = (/**@type key*/ key, /**@type func*/ fn) => {
		if (keys.has(key)) { errors.push('- Cannot define property for \'' + String(key) + '\' as it already exists within the Struct.'); return; }
		keys.add(key);
		badKeys.delete(key);

		if (typeof fn !== 'function') { errors.push('- Computed property \'' + String(key) + '\' must be a getter function.'); return; }

		const desc = {
			get: /**@this any*/ function () { return (this === prototype ? undefined : fn.call(this, this)); },
			enumerable: true
		};

		let temp = template.get(key);
		if (temp != null) {
			if (temp.type !== 'computed') { errors.push('- Type mismatch in \'' + String(key) + '\', extended key is \'' + temp.type + '\' but defined key is \'computed\'.'); return; }
			temp = frozen({ type: 'computed', desc, source: [ ...temp.source, prototype ] });
		} else temp = frozen({ type: 'computed', desc, source: [ prototype ] });
		template.set(key, temp);

		properties[key] = desc;
	};

	const makeMemo = (/**@type key*/ key, /**@type func*/ fn) => {
		if (keys.has(key)) { errors.push('- Cannot define property for \'' + String(key) + '\' as it already exists within the Struct.'); return; }
		keys.add(key);
		badKeys.delete(key);

		if (typeof fn !== 'function') { errors.push('- Memoised property \'' + String(key) + '\' must be a getter function.'); return; }

		const desc = {
			get: /**@this any*/ function () {
				if (this === prototype) return undefined;
				if (key in this[Values])
					return this[Values][key];

				const result = fn.call(this, this);
				return (this[Values][key] = (result === undefined ? null : result));
			},
			enumerable: true
		};

		let temp = template.get(key);
		if (temp != null) {
			if (temp.type !== 'memo') { errors.push('- Type mismatch in \'' + String(key) + '\', extended key is \'' + temp.type + '\' but defined key is \'memo\'.'); return; }
			temp = frozen({ type: 'memo', desc, source: [ ...temp.source, prototype ] });
		} else temp = frozen({ type: 'memo', desc, source: [ prototype ] });
		template.set(key, temp);

		properties[key] = desc;
		needsValues = true;
	};

	// ----- MUTABLE STUFF -----

	/**@typedef {{
		get?: func;
		set?: func ;
		default?: any;
	}} AssignmentDef*/

	const makeAssignment = (/**@type key*/ key, /**@type AssignmentDef*/ props) => {
		if (keys.has(key)) { errors.push('- Cannot define property for \'' + String(key) + '\' as it already exists within the Struct.'); return; }
		keys.add(key);
		badKeys.delete(key);

		let get, set;
		if (props.get != null) {
			if (typeof get !== 'function') { errors.push('- Getter for \'' + String(key) + '\' must be a function.'); return; }
			const getter = props.get;
			/**@this any*/
			get = function () {
				if (this === prototype) return undefined;
				const got = getter.call(this, this[Values][key], this);
				return (got === undefined ? null : got);
			};
		} else get = /**@this any*/ function () { return (this === prototype ? undefined : this[Values][key]); };

		if (props.set != null) {
			if (typeof props.set !== 'function') { errors.push('- Setter for \'' + String(key) + '\' must be a function.'); return; }
			const setter = props.set;
			/**@this any*/
			set = function (/**@type any*/ next) {
				if (this === prototype) throw new Error('Cannot assign values to prototypes.');
				const result = setter.call(this, next, this);
				if (result === undefined)
					this[Values][key] = (next === undefined ? null : next);
				else this[Values][key] = result;
			};
		} else set = /**@this any*/ function (/**@type any*/ next) {
			if (this === prototype) throw new Error('Cannot assign values to prototypes.');
			this[Values][key] = (next === undefined ? null : next);
		};

		const desc = { get, set, enumerable: true };

		let temp = template.get(key);
		if (temp != null) {
			if (temp.type !== 'assign') { errors.push('- Type mismatch in \'' + String(key) + '\', extended key is \'' + temp.type + '\' but defined key is \'assign\'.'); return; }
			temp = frozen({ type: 'assign', desc, source: [ ...temp.source, prototype ] });
		} else temp = frozen({ type: 'assign', desc, source: [ prototype ] });
		template.set(key, temp);

		if (props.default !== undefined) defaults[key] = props.default, defaults[Size]++;

		toAssign.add(key);

		properties[key] = desc;
		needsValues = true;
	};

	/**@type Record<PropertyKey, AssignmentDef>*/
	const assignments = {};
	let doAssignments = false;
	const place = (/**@type {keyof AssignmentDef}*/ type) => (/**@type PropertyKey*/ key, /**@type any*/ val) => {
		if (assignments[key] == null)
			assignments[key] = {}, doAssignments = true;
		assignments[key][type] = val;
	};

	if (definition.assign != null)
		ofKeys(place('default'), definition.assign);
	if (definition.getter != null)
		ofKeys(place('get'), definition.getter);
	if (definition.setter != null)
		ofKeys(place('set'), definition.setter);

	// ----- METHODS -----

	const makeMethod = (/**@type key*/ key, /**@type func*/ val) => {
		if (keys.has(key)) { errors.push('- Cannot define property for \'' + String(key) + '\' as it already exists within the Struct.'); return; }
		keys.add(key);
		badKeys.delete(key);

		if (typeof val !== 'function') { errors.push('- Method \'' + String(key) + '\' must be a function.'); return; }

		const desc = {
			get: function () { return (this === prototype) ? val : val.bind(this); },
			enumerable: false
		};

		let temp = template.get(key);
		if (temp != null) {
			if (temp.type !== 'method') { errors.push('- Type mismatch in \'' + String(key) + '\', extended key is \'' + temp.type + '\' but defined key is \'method\'.'); return; }
			temp = frozen({ type: 'method', desc, source: [ ...temp.source, prototype ] });
		} else temp = frozen({ type: 'method', desc, source: [ prototype ] });
		template.set(key, temp);

		properties[key] = desc;
	};

	// ----- EXTENSION -----

	if (definition.extends != null) {
		/**@type {object | null}*/
		let protoProto = null;
		/**@type {ReadonlyMap<key, TemplateDesc> | null}*/
		let heaviestProto = null;
		/**@type {Record<key, any> | null}*/
		let heaviestDefaults = null;

		const extend = (/**@type Trait*/ struct) => {
			if (isInstance(struct))
				struct = struct[Constructor];
			else if (!Object.hasOwn(struct, Prototype)) { errors.push('- Extended object is not extendable (a Struct constructor, or a Trait).'); return; }

			extending.add(struct);
			for (const extended of struct[Extending])
				extending.add(extended);

			const temp = struct[Template];
			const defs = struct[Defaults];
			defaults[Size] += defs[Size];
			for (const key of struct[ToAssign]) toAssign.add(key);
			for (const key of struct[ToDefine]) toDefine.add(key);

			let isHeaviestProto = false, isHeaviestDefaults = false;

			if (heaviestProto == null) {
				protoProto = struct[Prototype];
				heaviestProto = temp; isHeaviestProto = true;
			} else if (temp.size > heaviestProto.size) {
				for (const [ key, desc ] of heaviestProto)
					properties[key] = desc.desc;
				protoProto = struct[Prototype];
				heaviestProto = temp; isHeaviestProto = true;
			}

			if (heaviestDefaults == null) {
				heaviestDefaults = defs; isHeaviestDefaults = true;
			} else if (defs.size > heaviestDefaults.size) {
				let ds = defs;
				do {
					const names = Object.getOwnPropertyNames(ds);
					const symbols = Object.getOwnPropertySymbols(ds);

					let useSymbols = false;
					for (let i = names.length; i--;) {
						/**@type {string|symbol}*/
						const key = (useSymbols ? symbols[i] : names[i]);

						if (key !== Size) defaults[key] = ds[key];

						if (!useSymbols && i === 0)
							(i = symbols.length, useSymbols = true);
					}
				} while (ds = Object.getPrototypeOf(ds));
				heaviestDefaults = defs; isHeaviestDefaults = true;
			}

			for (const [ key, desc ] of temp) {
				const has = template.get(key);
				if (has == null) {
					template.set(key, desc);
					if (!isHeaviestProto) properties[key] = desc.desc;
					if (!isHeaviestDefaults && (key in defs)) defaults[key] = defs[key];
				} else if (has !== desc) {
					if (has.type !== desc.type) {
						errors.push('- Collision in extend: \'' + String(key) + '\' is defined as both \'' + has.type + '\' and \'' + desc.type + '\'.'); return;
					} else {
						const a = has.source, b = desc.source;
						const aLen = a.length, bLen = b.length;
						let i = 0;
						while (i < aLen || i < bLen) {
							if (i === aLen) {
								template.set(key, desc);
								if (isHeaviestProto)
									delete properties[key];
								else properties[key] = desc.desc;
								if (key in defs) {
									if (isHeaviestDefaults)
										delete defaults[key];
									else defaults[key] = defs[key];
								}
								break;
							} else if (i === bLen) {
								if (isHeaviestProto) properties[key] = has.desc;
								if (isHeaviestDefaults && (key in defs)) defaults[key] = defs[key];
								break;
							} else if (a[i] !== b[i]) {
								badKeys.add(key);
								break;
							}
							i++;
						}
					}
				}
			}
		}

		if (Array.isArray(definition.extends)) {
			for (let i = definition.extends.length; i--;)
				extend(definition.extends[i]);
		} else extend(definition.extends);

		Object.setPrototypeOf(prototype, protoProto);
		Object.setPrototypeOf(defaults, heaviestDefaults);
	}

	// ----- DO THE STUFF -----

	if (definition.constant != null)
		ofKeys(makeConstant, definition.constant);

	if (definition.method != null)
		ofKeys(makeMethod, definition.method);

	if (definition.define != null)
		ofKeys(makeDefinition, definition.define);

	if (definition.memo != null)
		ofKeys(makeMemo, definition.memo);

	if (definition.computed != null)
		ofKeys(makeComputation, definition.computed);

	if (doAssignments)
		ofKeys(makeAssignment, assignments);

	if (badKeys.size) {
		for (const key of badKeys)
			errors.push('- Collison in extend: Key \'' + String(key) + '\' differs between two extended structs, and is not overriden in the extending struct.');
	}

	if (errors.length) throw new Error('One or more errors in struct template:\n' + errors.join('\n'));

	Object.defineProperties(prototype, properties);
	Object.freeze(extending); Object.freeze(template); Object.freeze(defaults);

	return {
		prototype, extending, template, defaults,
		toAssign: Object.freeze(toAssign),
		toDefine: Object.freeze(toDefine),
		needsValues: (needsValues || defaults[Size] > 0)
	};
};

export const Struct = (() => {
	const Struct = function (/**@type any*/ definition) {
		const { prototype, extending, template, defaults, toAssign, toDefine, needsValues } = compose(definition);

		// ----- CREATE CONSTRUCTOR -----

		/**@type StructConstructor*/
		//@ts-ignore
		const structConstructor = function (/**@type any*/ values) {
			if (values == null)
				values = {};
			else if (typeof values !== 'object')
				throw new Error('Values to constructor must be an object.');

			const struct = Object.create(prototype);

			/**@type any*/
			const vals = needsValues && Object.create(defaults);

			for (const key of toAssign) {
				if (values[key] !== undefined) {
					//@ts-ignore
					if (values[key] !== defaults[key] && values[key] !== Object.prototype[key]) vals[key] = values[key];
				} else if (!(key in defaults)) throw new Error('No value was provided for \'' + String(key) + '\' and no default value exists for the struct.');
			}

			for (const key of toDefine) {
				if (values[key] !== undefined) {
					//@ts-ignore
					if (values[key] !== prototype[key] && values[key] !== Object.prototype[key]) {
							Object.defineProperty(struct, key, {
								value: values[key],
								enumerable: true,
								writable: false
							});
					}
				} else if (prototype[key] === undefined) throw new Error('No value was provided for \'' + String(key) + '\' and no default value exists for the struct.');
			}

			if (needsValues) Object.defineProperty(struct, Values, { value: vals });

			return Object.seal(struct);
		};

		/**@type any*/
		let constructor;
		if (definition.override !== undefined) {
			if (typeof definition.override !== 'function')
				throw new Error('Custom constructor must be a function.');

			const fn = definition.override;
			constructor = function (/**@type any*/ values) {
				if (values == null)
					values = {};
				else if (typeof values !== 'object')
					throw new Error('Values to constructor must be an object.');

				const result = fn(values);
				return structConstructor(result ?? values);
			};

			Object.defineProperty(constructor, 'override', { value: fn });
		} else constructor = structConstructor, Object.defineProperty(constructor, 'override', { value: null });

		extending.add(constructor);
		Object.defineProperty(prototype, Constructor, { value: constructor });
		Object.freeze(prototype);

		Object.defineProperties(constructor, {
			[Symbol.hasInstance]: { value: (/**@type any*/ instance) => {
				if (isInstance(instance))
					instance = instance[Constructor];
				else if (!Object.hasOwn(instance, Prototype))
					return false;

				return instance[Extending].has(constructor);
			}},

			[Prototype]: { value: prototype },
			[Extending]: { value: extending },
			[Template]: { value: template },
			[Defaults]: { value: defaults },
			[ToAssign]: { value: toAssign },
			[ToDefine]: { value: toDefine },

			prototype: { value: prototype }
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
				if (key === 'prototype' || key === 'override')
					throw new Error('Static key \'' + key + '\' is reserved.');

				Object.defineProperty(constructor, key, {
					value: (statics[key] === undefined ? null : statics[key]),
					enumerable: true,
					writable: false
				});

				if (!useSymbols && i === 0)
					(i = symbols.length, useSymbols = true);
			}
		}

		Object.freeze(structConstructor);
		return Object.freeze(constructor);
	};

	Object.defineProperties(Struct, {
		is: { value: isStruct },

		getConstructor: { value: (/**@type unknown*/ struct) => {
			if (!isInstance(struct))
				throw new Error('Argument to Struct.getConstructor is not a Struct instance.');

			return struct[Constructor];
		}},

		extends: { value: _extends },
		toObject: { value: toObject },
		stringify: { value: stringify },
		inspect: { value: inspect },

		update: { value: (/**@type unknown*/ struct, /**@type any[]*/ ...values) => {
			if (!isInstance(struct))
				throw new Error('First argument to Struct.update must be a Struct.');
			const root = struct[Constructor];

			for (let i = values.length; i--;)
				if (values[i] == null || (typeof values[i] !== 'object')) throw new Error('Values must be objects.');

			const defaults = root[Defaults], prototype = root[Prototype];
			const newStruct = Object.create(prototype);
			const newVals = ((struct[Values] != null) ? Object.create(defaults) : null);

			const toDefine = root[ToDefine];
			for (const key of toDefine) {
				let val;
				for (let j = values.length; j--;)
					//@ts-ignore
					if (values[j][key] !== undefined && values[j][key] !== Object.prototype[key]) { val = values[j][key]; break; }

				if (val === undefined) val = Object.hasOwn(struct, key) ? struct[key] : undefined;

				//@ts-ignore
				if (val !== undefined && val !== prototype[key]) {
					Object.defineProperty(newStruct, key, {
						value: val,
						enumerable: true,
						writable: false
					});
				}
			}

			const toAssign = root[ToAssign];
			for (const key of toAssign) {
				let val;
				for (let j = values.length; j--;)
					//@ts-ignore
					if (values[j][key] !== undefined && values[j][key] !== Object.prototype[key]) { val = values[j][key]; break; }

				if (val === undefined) val = struct[Values][key];
				if (val !== undefined && val !== defaults[key]) newVals[key] = val;
			}

			if (newVals != null) Object.defineProperty(newStruct, Values, { value: newVals });

			return Object.seal(newStruct);
		}},

		patch: { value: (/**@type unknown*/ struct, /**@type any*/ values, /**@type any*/ keyedValue) => {
			if (!isInstance(struct))
				throw new Error('First argument to Struct.patch must be a Struct.');
			const root = struct[Constructor];

			const toAssign = root[ToAssign];
			const toDefine = root[ToDefine];
			if (typeof values === 'string' || typeof values === 'symbol') {
				if (!toDefine.has(values) && !toAssign.has(values)) return struct;
				if (keyedValue === undefined) throw new Error('No value provided.');
			} else if (!isPlainObj(values)) throw new Error('nyet');

			const newStruct = Object.create(struct);
			const newVals = ((struct[Values] != null) ? Object.create(root[Defaults]) : null);

			if (newVals != null) {
				for (const key of toAssign)
					if (struct[Values][key] !== undefined) newVals[key] = struct[Values][key];
			}

			if (typeof values === 'string' || typeof values === 'symbol') {
				if (toDefine.has(values)) {
					Object.defineProperty(newStruct, values, {
						value: keyedValue,
						enumerable: true,
						writable: false
					});
				} else newVals[values] = keyedValue;
			} else {
				const names = Object.getOwnPropertyNames(values);
				const symbols = Object.getOwnPropertySymbols(values);

				let useSymbols = false;
				for (let i = names.length; i--;) {
					const key = (useSymbols ? symbols[i] : names[i]);
					if (!useSymbols && i === 0)
						(i = symbols.length, useSymbols = true);

					//@ts-ignore
					if (values[key] === undefined || values[key] === Object.prototype[key]) continue;

					if (toDefine.has(key)) {
						Object.defineProperty(newStruct, key, {
							value: values[key],
							enumerable: true,
							writable: false
						});
					} else if (toAssign.has(key)) newVals[key] = values[key];
				}
			}

			if (newVals != null) Object.defineProperty(newStruct, Values, { value: newVals });

			return Object.seal(newStruct);
		}},

		forEach: { value: (/**@type unknown*/ object, /**@type unknown*/ fn, /**@type unknown*/ thisArg) => {
			if (typeof fn !== 'function')
				throw new Error('Not a function.');

			if (thisArg === undefined)
				thisArg = object;

			if (typeof object === 'string' || Array.isArray(object)) {
				if (object.length === 0) return;
				for (let i = 0, len = object.length; i !== len; i++)
					fn.call(thisArg, object[i], i, object);
				return;
			}

			if (object == null || (typeof object !== 'object'))
				throw new Error('Objects passed to Struct.forEach must be either Strings, Arrays, or Objects.');

			//@ts-ignore
			if (('forEach' in object) && (typeof object.forEach === 'function')) {
				//@ts-ignore
				object.forEach(fn, thisArg);
				return;
			}

			if (Symbol.iterator in object) {
				//@ts-ignore
				for (const element of object)
					fn.call(thisArg, element, undefined, object);
				return;
			}

			for (const key in object)
				//@ts-ignore
				fn.call(thisArg, object[key], key, object);
		}},
	});

	return Object.freeze(Struct);
})();

export default Struct;

export const Trait = (() => {
	const Trait = function (/**@type any*/ definition) {
		const { prototype, extending, template, defaults, toAssign, toDefine } = compose(definition);

		const trait = Object.create(null);
		extending.add(trait);

		Object.defineProperties(trait, {
			[Symbol.hasInstance]: { value: (/**@type any*/ instance) => {
				if (isInstance(instance)) {
					instance = instance[Constructor];
				} else if (!Object.hasOwn(instance, Prototype))
					return false;

				return instance[Extending].has(trait);
			}},

			[Prototype]: { value: prototype },
			[Constructor]: { value: null },
			[Extending]: { value: extending },
			[Template]: { value: template },
			[Defaults]: { value: defaults },
			[ToAssign]: { value: toAssign },
			[ToDefine]: { value: toDefine }
		});

		Object.setPrototypeOf(trait, prototype);

		return Object.freeze(trait);
	};

	Object.defineProperties(Trait, {
		is: { value: isTrait },
		isInstance: { value: isInstance },
		extends: { value: _extends }
	});

	return Object.freeze(Trait);
})();
