/**
 * Express.js integration example for Reshaper
 *
 * This shows how you might structure resources in an Express app
 */
import { Resource } from '../src/index.js';

// ============================================
// Resources (typically in /resources folder)
// ============================================

class UserResource extends Resource {
    static transform(user, options = {}) {
        return Resource.clean({
            id: user.id,
            name: user.name,
            email: Resource.when(options.isAdmin, user.email),
            avatar: Resource.whenNotNull(user.avatar),
            posts_count: Resource.whenLoaded(user, 'posts', (posts) => posts.length)
        });
    }
}

class PostResource extends Resource {
    static transform(post, options = {}) {
        return Resource.clean({
            id: post.id,
            title: post.title,
            content: post.content,
            author: Resource.whenLoaded(post, 'author', () =>
                UserResource.transform(post.author)
            ),
            created_at: post.created_at
        });
    }
}

// ============================================
// Controller examples
// ============================================

/**
 * Example controller methods showing common patterns
 */
const userController = {
    // GET /users
    async index(req, res) {
        // Simulated paginated query
        const result = {
            results: [
                { id: 1, name: 'John', email: 'john@example.com', avatar: null },
                { id: 2, name: 'Jane', email: 'jane@example.com', avatar: 'jane.jpg' }
            ],
            total: 50
        };

        const response = UserResource.paginate(result, {
            page: parseInt(req.query?.page) || 1,
            perPage: parseInt(req.query?.per_page) || 15,
            isAdmin: req.user?.role === 'admin'
        });

        return response;
    },

    // GET /users/:id
    async show(req, res) {
        const user = {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            avatar: 'john.jpg',
            posts: [
                { id: 1, title: 'Post 1' },
                { id: 2, title: 'Post 2' }
            ]
        };

        return UserResource.wrap(
            UserResource.transform(user, { isAdmin: true })
        );
    }
};

// ============================================
// Demo
// ============================================

console.log('=== GET /users (paginated list) ===');
const listResponse = await userController.index({ query: { page: 1 } });
console.log(JSON.stringify(listResponse, null, 2));

console.log('\n=== GET /users/:id (single with relations) ===');
const showResponse = await userController.show({ params: { id: 1 } });
console.log(JSON.stringify(showResponse, null, 2));
