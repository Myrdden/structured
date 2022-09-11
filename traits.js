import { Trait, stringify } from './struct.js';

export const Show = Trait({
	method: {
		toString: function () { return '[Struct]'; },
		toJSON: function () { return stringify(this); },
		[Symbol.toPrimitive]: function () { return this.toString(); }
	}
});
