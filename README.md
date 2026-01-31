# Reshaper

Laravel-inspired API Resource transformations for Node.js. Shape your data with elegance.

[![npm version](https://badge.fury.io/js/@kn0mic%2Freshaper.svg)](https://www.npmjs.com/package/@kn0mic/reshaper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why Reshaper?

If you've used Laravel's API Resources, you know how elegant they make data transformation. Reshaper brings that same pattern to Node.js:

- **Clean syntax** - Transform your data with readable, declarative code
- **Conditional fields** - Include fields only when needed
- **Relation handling** - Gracefully handle eager-loaded relationships
- **Pagination support** - Built-in pagination formatting
- **Zero dependencies** - Lightweight and fast
- **TypeScript support** - Full type definitions included

## Installation

```bash
npm install @kn0mic/reshaper
```

## Quick Start

```javascript
import { Resource } from '@kn0mic/reshaper';

// Define a resource
class UserResource extends Resource {
    static transform(user, options = {}) {
        return Resource.clean({
            id: user.id,
            name: user.name,
            email: Resource.when(options.isAdmin, user.email),
            posts: Resource.whenLoaded(user, 'posts', () =>
                PostResource.collection(user.posts)
            )
        });
    }
}

// Use it
const user = await User.findById(1);
const data = UserResource.transform(user, { isAdmin: true });
// { id: 1, name: 'John', email: 'john@example.com' }
```

## Core Concepts

### Transform Single Resource

```javascript
class ProductResource extends Resource {
    static transform(product) {
        return {
            id: product.id,
            name: product.name,
            price: product.price,
            formatted_price: `$${product.price.toFixed(2)}`
        };
    }
}

ProductResource.transform(product);
```

### Transform Collections

```javascript
const products = await Product.findAll();
ProductResource.collection(products);
// [{ id: 1, name: '...' }, { id: 2, name: '...' }]
```

### Null-Safe Transformation

```javascript
ProductResource.make(null);  // returns null
ProductResource.make(product);  // returns transformed product
```

## Conditional Fields

### `when(condition, value)`

Include a field only when condition is true:

```javascript
static transform(user, { isAdmin = false } = {}) {
    return Resource.clean({
        id: user.id,
        name: user.name,
        email: Resource.when(isAdmin, user.email),
        ssn: Resource.when(isAdmin, () => decrypt(user.ssn)) // lazy evaluation
    });
}
```

### `whenOrElse(condition, value, default)`

Include different values based on condition:

```javascript
return {
    profile: Resource.whenOrElse(
        isPremium,
        user.fullProfile,
        user.basicProfile
    )
};
```

### `whenLoaded(resource, relation, transformer)`

Include relation only if it's been loaded (not undefined):

```javascript
static transform(post) {
    return Resource.clean({
        id: post.id,
        title: post.title,
        // Only included if author was eager-loaded
        author: Resource.whenLoaded(post, 'author', () =>
            UserResource.transform(post.author)
        ),
        // Returns raw value if no transformer provided
        category: Resource.whenLoaded(post, 'category')
    });
}
```

### `whenNotNull(value, transformer)`

Include value only if it's not null/undefined:

```javascript
return Resource.clean({
    avatar: Resource.whenNotNull(user.avatar, (url) =>
        `https://cdn.example.com/${url}`
    )
});
```

## Utility Methods

### `clean(object)`

Remove undefined values from object:

```javascript
Resource.clean({
    id: 1,
    name: 'John',
    email: undefined  // removed
});
// { id: 1, name: 'John' }
```

### `merge(...objects)`

Merge multiple objects and clean undefined values:

```javascript
return Resource.merge(
    { id: user.id, name: user.name },
    Resource.when(isAdmin, { email: user.email }),
    Resource.whenLoaded(user, 'profile', (p) => ({ bio: p.bio }))
);
```

### `pick(object, fields)`

Pick specific fields:

```javascript
Resource.pick(user, ['id', 'name', 'email']);
// { id: 1, name: 'John', email: 'john@example.com' }
```

### `omit(object, fields)`

Omit specific fields:

```javascript
Resource.omit(user, ['password', 'secret']);
// User without password and secret
```

### `rename(object, keyMap)`

Rename keys:

```javascript
Resource.rename(user, {
    created_at: 'createdAt',
    user_id: 'id'
});
```

## Response Formatting

### `wrap(data, meta)`

Wrap in standard envelope:

```javascript
UserResource.wrap(UserResource.transform(user));
// { data: { id: 1, name: 'John' } }

UserResource.wrap(users, { version: '1.0' });
// { data: [...], meta: { version: '1.0' } }
```

### `paginate(result, options)`

Format paginated results:

```javascript
// With Objection.js
const users = await User.query().page(0, 10);

UserResource.paginate(users, { page: 1, perPage: 10 });
// {
//   data: [...transformed users],
//   meta: {
//     current_page: 1,
//     per_page: 10,
//     total: 100,
//     last_page: 10
//   }
// }
```

## Quick Resources with `define()`

For simple cases, create resources without extending:

```javascript
const SimpleUser = Resource.define((user) => ({
    id: user.id,
    name: user.name
}));

SimpleUser.transform(user);
SimpleUser.collection(users);
SimpleUser.paginate(result);
```

## Express.js Integration

```javascript
// resources/UserResource.js
import { Resource } from '@kn0mic/reshaper';

export default class UserResource extends Resource {
    static transform(user, options = {}) {
        return Resource.clean({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: Resource.when(options.includeEmail, user.email),
            posts: Resource.whenLoaded(user, 'posts', () =>
                PostResource.collection(user.posts)
            )
        });
    }
}

// controllers/userController.js
import UserResource from '../resources/UserResource.js';

export const getUsers = async (req, res) => {
    const users = await User.query()
        .withGraphFetched('posts')
        .page(req.query.page - 1, 15);

    res.json(UserResource.paginate(users, {
        page: req.query.page,
        perPage: 15,
        includeEmail: req.user.isAdmin
    }));
};

export const getUser = async (req, res) => {
    const user = await User.query()
        .findById(req.params.id)
        .withGraphFetched('posts');

    res.json(UserResource.wrap(
        UserResource.transform(user)
    ));
};
```

## TypeScript Usage

```typescript
import { Resource } from '@kn0mic/reshaper';

interface User {
    id: number;
    name: string;
    email: string;
    posts?: Post[];
}

interface UserDTO {
    id: number;
    name: string;
    email?: string;
    posts?: PostDTO[];
}

class UserResource extends Resource {
    static transform(user: User, options: { isAdmin?: boolean } = {}): UserDTO {
        return Resource.clean({
            id: user.id,
            name: user.name,
            email: Resource.when(options.isAdmin, user.email),
            posts: Resource.whenLoaded(user, 'posts', () =>
                PostResource.collection(user.posts!)
            )
        });
    }
}
```

## CommonJS Support

```javascript
const { Resource } = require('@kn0mic/reshaper');
// or
const Resource = require('@kn0mic/reshaper');
```

## License

MIT
