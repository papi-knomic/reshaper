import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Resource } from '../src/index.js';

describe('Resource', () => {
    describe('transform()', () => {
        it('should throw error when not implemented', () => {
            assert.throws(() => {
                Resource.transform({});
            }, /must be implemented/);
        });
    });

    describe('collection()', () => {
        class TestResource extends Resource {
            static transform(item) {
                return { id: item.id };
            }
        }

        it('should transform array of items', () => {
            const items = [{ id: 1 }, { id: 2 }];
            const result = TestResource.collection(items);
            assert.deepStrictEqual(result, [{ id: 1 }, { id: 2 }]);
        });

        it('should return empty array for null/undefined', () => {
            assert.deepStrictEqual(TestResource.collection(null), []);
            assert.deepStrictEqual(TestResource.collection(undefined), []);
        });
    });

    describe('make()', () => {
        class TestResource extends Resource {
            static transform(item) {
                return { id: item.id };
            }
        }

        it('should return null for null input', () => {
            assert.strictEqual(TestResource.make(null), null);
        });

        it('should transform valid input', () => {
            assert.deepStrictEqual(TestResource.make({ id: 1 }), { id: 1 });
        });
    });

    describe('when()', () => {
        it('should return value when condition is true', () => {
            assert.strictEqual(Resource.when(true, 'value'), 'value');
        });

        it('should return undefined when condition is false', () => {
            assert.strictEqual(Resource.when(false, 'value'), undefined);
        });

        it('should call function when condition is true', () => {
            let called = false;
            Resource.when(true, () => { called = true; return 'value'; });
            assert.strictEqual(called, true);
        });

        it('should not call function when condition is false', () => {
            let called = false;
            Resource.when(false, () => { called = true; return 'value'; });
            assert.strictEqual(called, false);
        });
    });

    describe('whenLoaded()', () => {
        it('should return undefined when relation not loaded', () => {
            const obj = { id: 1 };
            assert.strictEqual(Resource.whenLoaded(obj, 'posts'), undefined);
        });

        it('should return relation when loaded', () => {
            const obj = { id: 1, posts: [{ id: 1 }] };
            assert.deepStrictEqual(Resource.whenLoaded(obj, 'posts'), [{ id: 1 }]);
        });

        it('should apply transformer when provided', () => {
            const obj = { id: 1, name: 'test' };
            const result = Resource.whenLoaded(obj, 'name', (v) => v.toUpperCase());
            assert.strictEqual(result, 'TEST');
        });
    });

    describe('clean()', () => {
        it('should remove undefined values', () => {
            const obj = { a: 1, b: undefined, c: 3 };
            assert.deepStrictEqual(Resource.clean(obj), { a: 1, c: 3 });
        });

        it('should keep null values', () => {
            const obj = { a: 1, b: null };
            assert.deepStrictEqual(Resource.clean(obj), { a: 1, b: null });
        });
    });

    describe('merge()', () => {
        it('should merge objects and clean undefined', () => {
            const result = Resource.merge(
                { a: 1 },
                { b: 2 },
                { c: undefined }
            );
            assert.deepStrictEqual(result, { a: 1, b: 2 });
        });

        it('should handle undefined/null objects', () => {
            const result = Resource.merge({ a: 1 }, undefined, null, { b: 2 });
            assert.deepStrictEqual(result, { a: 1, b: 2 });
        });
    });

    describe('wrap()', () => {
        it('should wrap data in envelope', () => {
            const result = Resource.wrap({ id: 1 });
            assert.deepStrictEqual(result, { data: { id: 1 } });
        });

        it('should include meta when provided', () => {
            const result = Resource.wrap({ id: 1 }, { total: 10 });
            assert.deepStrictEqual(result, { data: { id: 1 }, meta: { total: 10 } });
        });
    });

    describe('paginate()', () => {
        class TestResource extends Resource {
            static transform(item) {
                return { id: item.id };
            }
        }

        it('should format paginated result', () => {
            const result = TestResource.paginate(
                { results: [{ id: 1 }, { id: 2 }], total: 50 },
                { page: 2, perPage: 10 }
            );

            assert.deepStrictEqual(result.data, [{ id: 1 }, { id: 2 }]);
            assert.strictEqual(result.meta.current_page, 2);
            assert.strictEqual(result.meta.per_page, 10);
            assert.strictEqual(result.meta.total, 50);
            assert.strictEqual(result.meta.last_page, 5);
        });
    });

    describe('define()', () => {
        it('should create resource from function', () => {
            const SimpleResource = Resource.define((item) => ({ id: item.id }));

            assert.deepStrictEqual(SimpleResource.transform({ id: 1 }), { id: 1 });
            assert.deepStrictEqual(SimpleResource.collection([{ id: 1 }]), [{ id: 1 }]);
            assert.strictEqual(SimpleResource.make(null), null);
        });
    });

    describe('pick()', () => {
        it('should pick specified fields', () => {
            const obj = { a: 1, b: 2, c: 3 };
            assert.deepStrictEqual(Resource.pick(obj, ['a', 'c']), { a: 1, c: 3 });
        });
    });

    describe('omit()', () => {
        it('should omit specified fields', () => {
            const obj = { a: 1, b: 2, c: 3 };
            assert.deepStrictEqual(Resource.omit(obj, ['b']), { a: 1, c: 3 });
        });
    });

    describe('rename()', () => {
        it('should rename specified keys', () => {
            const obj = { old_name: 'value' };
            assert.deepStrictEqual(Resource.rename(obj, { old_name: 'newName' }), { newName: 'value' });
        });
    });
});
