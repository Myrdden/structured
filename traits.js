import { Trait, stringify, _extends } from './struct.js';

export const Show = Trait({
	method: {
		toString: function () { return '[Struct]'; },
		valueOf: function () { return this.toString(); },
		toJSON: function () { return stringify(this); },
		[Symbol.toPrimitive]: function () { return this.toString(); }
	}
});

export const Eq = Trait({
	method: {
		eq: function (/**@type any*/ rhs) {
			if (!_extends(rhs, this))
				return false;

			for (const key in this) {
				//@ts-ignore
				if (typeof this[key]?.eq === 'function') {
					if (typeof rhs[key]?.eq !== 'function')
						return false;
					//@ts-ignore
					if (!this[key].eq(rhs[key]))
						return false;
				//@ts-ignore
				} else if (rhs[key] !== this[key])
					return false;
			}

			return true;
		},
		ne: function (/**@type any*/ rhs) { return !this.eq(rhs); }
	}
});

export const Ord = Trait({
	extends: Eq,

	method: {
		gt: /**@type{(rhs: any) => boolean}*/ (/**@type unknown*/ (undefined)),
		lt: function (/**@type any*/ rhs) { return (!this.eq(rhs) && !this.gt(rhs)); },
		ge: function (/**@type any*/ rhs) { return (this.eq(rhs) || this.gt(rhs)); },
		le: function (/**@type any*/ rhs) { return (this.eq(rhs) || this.lt(rhs)); },
		max: function (/**@type any*/ rhs) { return (this.ge(rhs) ? this : rhs); },
		min: function (/**@type any*/ rhs) { return (this.ge(rhs) ? rhs: this); },
		compare: function (/**@type any*/ rhs) { return (this.eq(rhs) ? 0 : (this.gt(rhs) ? 1 : -1)); }
	}
});

export const compare = (/**@type any*/ a, /**@type any*/ b) => a.compare(b);

export const ShowOrd = Trait({ extends: [ Show, Ord ] });