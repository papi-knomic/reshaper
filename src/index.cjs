"use strict";

/**
 * Reshaper - Laravel-inspired API Resource transformations for Node.js
 */
class Resource {
    static transform(resource, options = {}) {
        throw new Error(
            `${this.name}.transform() must be implemented. ` +
            'Define a static transform method in your resource class.'
        );
    }

    static collection(resources, options = {}) {
        if (!resources || !Array.isArray(resources)) return [];
        return resources.map(resource => this.transform(resource, options));
    }

    static make(resource, options = {}) {
        if (!resource) return null;
        return this.transform(resource, options);
    }

    static when(condition, value) {
        if (!condition) return undefined;
        return typeof value === 'function' ? value() : value;
    }

    static whenOrElse(condition, value, defaultValue) {
        const result = condition ? value : defaultValue;
        return typeof result === 'function' ? result() : result;
    }

    static whenLoaded(resource, relation, transformer = null) {
        if (resource[relation] === undefined) return undefined;
        if (transformer) return transformer(resource[relation]);
        return resource[relation];
    }

    static whenNotNull(value, transformer = null) {
        if (value === null || value === undefined) return undefined;
        if (transformer) return transformer(value);
        return value;
    }

    static clean(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => v !== undefined)
        );
    }

    static merge(...objects) {
        const filtered = objects.filter(obj => obj !== undefined && obj !== null);
        return this.clean(Object.assign({}, ...filtered));
    }

    static wrap(data, meta = {}) {
        const response = { data };
        if (meta && Object.keys(meta).length > 0) {
            response.meta = meta;
        }
        return response;
    }

    static paginate(result, options = {}) {
        const { page = 1, perPage = 15, ...transformOptions } = options;
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
                return Resource.paginate.call({ collection: resource.collection }, result, options);
            },
            wrap: Resource.wrap
        };
        return resource;
    }

    static pick(obj, fields) {
        if (!obj || !fields) return {};
        return fields.reduce((acc, field) => {
            if (obj[field] !== undefined) acc[field] = obj[field];
            return acc;
        }, {});
    }

    static omit(obj, fields) {
        if (!obj || !fields) return { ...obj };
        const fieldSet = new Set(fields);
        return Object.fromEntries(
            Object.entries(obj).filter(([key]) => !fieldSet.has(key))
        );
    }

    static rename(obj, keyMap) {
        if (!obj || !keyMap) return { ...obj };
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [keyMap[key] || key, value])
        );
    }
}

module.exports = Resource;
module.exports.Resource = Resource;
module.exports.default = Resource;
