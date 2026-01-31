/**
 * Reshaper - Laravel-inspired API Resource transformations for Node.js
 */

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
}

export interface WrappedResult<T> {
    data: T;
    meta?: Record<string, any>;
}

export interface PaginateOptions {
    page?: number;
    perPage?: number;
    [key: string]: any;
}

export interface DefinedResource<T, R> {
    transform(data: T, options?: Record<string, any>): R | null;
    collection(data: T[], options?: Record<string, any>): R[];
    make(data: T | null | undefined, options?: Record<string, any>): R | null;
    paginate(result: any, options?: PaginateOptions): PaginatedResult<R>;
    wrap<D>(data: D, meta?: Record<string, any>): WrappedResult<D>;
}

/**
 * Abstract Resource base class for API transformations
 */
export class Resource {
    /**
     * Transform a single resource - must be implemented by child classes
     */
    static transform<T = any, R = any>(resource: T, options?: Record<string, any>): R;

    /**
     * Transform a collection of resources
     */
    static collection<T = any, R = any>(resources: T[], options?: Record<string, any>): R[];

    /**
     * Transform resource only if it exists (null-safe)
     */
    static make<T = any, R = any>(resource: T | null | undefined, options?: Record<string, any>): R | null;

    /**
     * Conditionally include a value based on a condition
     */
    static when<T>(condition: boolean, value: T | (() => T)): T | undefined;

    /**
     * Conditionally include a value with a default fallback
     */
    static whenOrElse<T, D>(condition: boolean, value: T | (() => T), defaultValue: D | (() => D)): T | D;

    /**
     * Include value only when relation/property is loaded
     */
    static whenLoaded<T, R = T>(
        resource: Record<string, any>,
        relation: string,
        transformer?: ((value: T) => R) | null
    ): R | undefined;

    /**
     * Include value when property is not null/undefined
     */
    static whenNotNull<T, R = T>(
        value: T | null | undefined,
        transformer?: ((value: T) => R) | null
    ): R | undefined;

    /**
     * Remove undefined values from object
     */
    static clean<T extends Record<string, any>>(obj: T): Partial<T>;

    /**
     * Merge multiple objects and clean undefined values
     */
    static merge<T extends Record<string, any>>(...objects: (T | undefined | null)[]): Partial<T>;

    /**
     * Wrap data in a standard response envelope
     */
    static wrap<T>(data: T, meta?: Record<string, any>): WrappedResult<T>;

    /**
     * Transform a paginated result set with metadata
     */
    static paginate<T = any, R = any>(result: any, options?: PaginateOptions): PaginatedResult<R>;

    /**
     * Create a simple resource transformer without extending the class
     */
    static define<T, R>(transformFn: (data: T, options?: Record<string, any>) => R): DefinedResource<T, R>;

    /**
     * Pick specific fields from an object
     */
    static pick<T extends Record<string, any>, K extends keyof T>(obj: T, fields: K[]): Pick<T, K>;

    /**
     * Omit specific fields from an object
     */
    static omit<T extends Record<string, any>, K extends keyof T>(obj: T, fields: K[]): Omit<T, K>;

    /**
     * Rename keys in an object
     */
    static rename<T extends Record<string, any>>(obj: T, keyMap: Record<string, string>): Record<string, any>;
}

export default Resource;
