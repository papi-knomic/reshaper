/**
 * Reshaper - Laravel-inspired API Resource transformations for Node.js
 *
 * @example
 * class UserResource extends Resource {
 *     static transform(user, options = {}) {
 *         return Resource.clean({
 *             id: user.id,
 *             name: user.name,
 *             email: Resource.when(options.isAdmin, user.email),
 *             posts: Resource.whenLoaded(user, 'posts', () =>
 *                 PostResource.collection(user.posts)
 *             )
 *         });
 *     }
 * }
 */
export default class Resource {
    /**
     * Transform a single resource - must be implemented by child classes
     * @param {Object} resource - The resource to transform
     * @param {Object} options - Optional transformation options
     * @returns {Object|null}
     * @throws {Error} If not implemented by child class
     */
    static transform(resource, options = {}) {
        throw new Error(
            `${this.name}.transform() must be implemented. ` +
            'Define a static transform method in your resource class.'
        );
    }

    /**
     * Transform a collection of resources
     * @param {Array} resources - Array of resources to transform
     * @param {Object} options - Optional transformation options passed to each transform
     * @returns {Array} Transformed array
     *
     * @example
     * UserResource.collection(users, { isAdmin: true });
     */
    static collection(resources, options = {}) {
        if (!resources || !Array.isArray(resources)) return [];
        return resources.map(resource => this.transform(resource, options));
    }

    /**
     * Transform resource only if it exists (null-safe)
     * @param {Object|null} resource - The resource to transform
     * @param {Object} options - Optional transformation options
     * @returns {Object|null} Transformed object or null
     *
     * @example
     * UserResource.make(user); // null if user is null/undefined
     */
    static make(resource, options = {}) {
        if (!resource) return null;
        return this.transform(resource, options);
    }

    /**
     * Conditionally include a value based on a condition
     * Returns undefined when condition is false (use with clean() to remove)
     * @param {boolean} condition - Whether to include the value
     * @param {*|Function} value - Value or callback that returns value
     * @returns {*|undefined} The value if condition is true, undefined otherwise
     *
     * @example
     * Resource.when(isAdmin, user.email)
     * Resource.when(isAdmin, () => expensiveComputation())
     */
    static when(condition, value) {
        if (!condition) return undefined;
        return typeof value === 'function' ? value() : value;
    }

    /**
     * Conditionally include a value with a default fallback
     * @param {boolean} condition - Whether to include the primary value
     * @param {*|Function} value - Value when condition is true
     * @param {*|Function} defaultValue - Value when condition is false
     * @returns {*} The appropriate value based on condition
     *
     * @example
     * Resource.whenOrElse(isPremium, user.fullProfile, user.basicProfile)
     */
    static whenOrElse(condition, value, defaultValue) {
        const result = condition ? value : defaultValue;
        return typeof result === 'function' ? result() : result;
    }

    /**
     * Include value only when relation/property is loaded (not undefined)
     * Useful for optional eager-loaded relationships
     * @param {Object} resource - The resource object
     * @param {string} relation - Name of the relation/property to check
     * @param {Function|null} transformer - Optional transformer function
     * @returns {*|undefined} Transformed relation or undefined if not loaded
     *
     * @example
     * Resource.whenLoaded(user, 'posts', () => PostResource.collection(user.posts))
     * Resource.whenLoaded(user, 'profile') // returns user.profile as-is
     */
    static whenLoaded(resource, relation, transformer = null) {
        if (resource[relation] === undefined) return undefined;
        if (transformer) return transformer(resource[relation]);
        return resource[relation];
    }

    /**
     * Include value when property is not null/undefined
     * @param {*} value - The value to check
     * @param {Function|null} transformer - Optional transformer function
     * @returns {*|undefined} Value or transformed value, undefined if null/undefined
     *
     * @example
     * Resource.whenNotNull(user.avatar, (url) => `https://cdn.example.com/${url}`)
     */
    static whenNotNull(value, transformer = null) {
        if (value === null || value === undefined) return undefined;
        if (transformer) return transformer(value);
        return value;
    }

    /**
     * Remove undefined values from object
     * Call this on your return object to strip out conditional fields that weren't included
     * @param {Object} obj - Object to clean
     * @returns {Object} Object without undefined values
     *
     * @example
     * return Resource.clean({
     *     id: user.id,
     *     email: Resource.when(isAdmin, user.email), // removed if not admin
     * });
     */
    static clean(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => v !== undefined)
        );
    }

    /**
     * Merge multiple objects and clean undefined values
     * Useful for building response with multiple conditional sections
     * @param {...Object} objects - Objects to merge
     * @returns {Object} Merged and cleaned object
     *
     * @example
     * return Resource.merge(
     *     { id: user.id, name: user.name },
     *     Resource.when(isAdmin, { email: user.email, role: user.role }),
     *     Resource.whenLoaded(user, 'profile', (p) => ({ bio: p.bio }))
     * );
     */
    static merge(...objects) {
        const filtered = objects.filter(obj => obj !== undefined && obj !== null);
        return this.clean(Object.assign({}, ...filtered));
    }

    /**
     * Wrap data in a standard response envelope
     * @param {*} data - The data to wrap
     * @param {Object} meta - Optional metadata to include
     * @returns {Object} Wrapped response object
     *
     * @example
     * UserResource.wrap(UserResource.transform(user))
     * // { data: { id: 1, name: 'John' } }
     *
     * UserResource.wrap(users, { total: 100 })
     * // { data: [...], meta: { total: 100 } }
     */
    static wrap(data, meta = {}) {
        const response = { data };
        if (meta && Object.keys(meta).length > 0) {
            response.meta = meta;
        }
        return response;
    }

    /**
     * Transform a paginated result set with metadata
     * Works with common pagination formats (Objection.js, Sequelize, etc.)
     * @param {Object} result - Paginated result object
     * @param {Object} options - Options passed to transform
     * @returns {Object} Object with data array and meta pagination info
     *
     * @example
     * // With Objection.js .page() result
     * const users = await User.query().page(0, 10);
     * return UserResource.paginate(users, { page: 1, perPage: 10 });
     *
     * // Returns:
     * // {
     * //   data: [...transformed users],
     * //   meta: { current_page: 1, per_page: 10, total: 100, last_page: 10 }
     * // }
     */
    static paginate(result, options = {}) {
        const {
            page = 1,
            perPage = 15,
            ...transformOptions
        } = options;

        // Support various pagination formats
        const results = result.results || result.data || result.rows || result;
        const total = result.total ?? result.count ?? results.length;

        return {
            data: this.collection(Array.isArray(results) ? results : [], transformOptions),
            meta: {
                current_page: page,
                per_page: perPage,
                total: total,
                last_page: Math.ceil(total / perPage) || 1
            }
        };
    }

    /**
     * Create a simple resource transformer without extending the class
     * Useful for one-off transformations or simple cases
     * @param {Function} transformFn - Transform function (resource, options) => object
     * @returns {Object} Object with transform, collection, make, and paginate methods
     *
     * @example
     * const SimpleUser = Resource.define((user) => ({
     *     id: user.id,
     *     name: user.name
     * }));
     *
     * SimpleUser.transform(user);
     * SimpleUser.collection(users);
     */
    static define(transformFn) {
        const resource = {
            transform: (data, options = {}) => {
                if (!data) return null;
                return transformFn(data, options);
            },
            collection: (data, options = {}) => {
                if (!data || !Array.isArray(data)) return [];
                return data.map(item => transformFn(item, options));
            },
            make: (data, options = {}) => {
                if (!data) return null;
                return transformFn(data, options);
            },
            paginate: (result, options = {}) => {
                return Resource.paginate.call({
                    collection: resource.collection
                }, result, options);
            },
            wrap: Resource.wrap
        };
        return resource;
    }

    /**
     * Pick specific fields from an object
     * @param {Object} obj - Source object
     * @param {string[]} fields - Fields to pick
     * @returns {Object} Object with only specified fields
     *
     * @example
     * Resource.pick(user, ['id', 'name', 'email'])
     */
    static pick(obj, fields) {
        if (!obj || !fields) return {};
        return fields.reduce((acc, field) => {
            if (obj[field] !== undefined) {
                acc[field] = obj[field];
            }
            return acc;
        }, {});
    }

    /**
     * Omit specific fields from an object
     * @param {Object} obj - Source object
     * @param {string[]} fields - Fields to omit
     * @returns {Object} Object without specified fields
     *
     * @example
     * Resource.omit(user, ['password', 'secret'])
     */
    static omit(obj, fields) {
        if (!obj || !fields) return { ...obj };
        const fieldSet = new Set(fields);
        return Object.fromEntries(
            Object.entries(obj).filter(([key]) => !fieldSet.has(key))
        );
    }

    /**
     * Rename keys in an object
     * @param {Object} obj - Source object
     * @param {Object} keyMap - Map of old key to new key
     * @returns {Object} Object with renamed keys
     *
     * @example
     * Resource.rename(user, { created_at: 'createdAt', user_id: 'id' })
     */
    static rename(obj, keyMap) {
        if (!obj || !keyMap) return { ...obj };
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                keyMap[key] || key,
                value
            ])
        );
    }
}
