// Ensure that Result, Ok, Err, ok, and err are properly defined as shown earlier
export type Result<T, E> = Ok<T> | Err<E>;

export class Ok<T> {
	readonly value: T;

	constructor(value: T) {
		this.value = value;
	}

	isOk(): this is Ok<T> {
		return true;
	}

	isErr(): this is Err<any> {
		return false;
	}

	// Maps an Ok value using the provided function
	map<U>(fn: (value: T) => U): Result<U, any> {
		return ok(fn(this.value));
	}

	// Maps an Ok value using the provided function, retaining the error
	andThen<U>(fn: (value: T) => Result<U, any>): Result<U, any> {
		return fn(this.value);
	}
}

export class Err<E> {
	readonly error: E;

	constructor(error: E) {
		this.error = error;
	}

	isOk(): this is Ok<any> {
		return false;
	}

	isErr(): this is Err<E> {
		return true;
	}

	// Maps an Err value using the provided function
	mapErr<U>(fn: (error: E) => U): Result<any, U> {
		return err(fn(this.error));
	}
}

// Utility functions for creating Ok and Err
export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);
