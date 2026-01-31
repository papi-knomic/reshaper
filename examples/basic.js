/**
 * Basic usage example for Reshaper
 */
import { Resource } from '../src/index.js';

// Sample data (simulating database models)
const users = [
    {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'hashed_password',
        created_at: '2024-01-15T10:30:00Z',
        profile: {
            bio: 'Software developer',
            avatar: 'avatars/john.jpg'
        },
        posts: [
            { id: 1, title: 'Hello World', content: 'My first post' },
            { id: 2, title: 'Second Post', content: 'Another post' }
        ]
    },
    {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        password: 'hashed_password',
        created_at: '2024-02-20T14:00:00Z'
        // No profile or posts loaded
    }
];

// Define Resources
class PostResource extends Resource {
    static transform(post) {
        return {
            id: post.id,
            title: post.title,
            excerpt: post.content.substring(0, 50)
        };
    }
}

class UserResource extends Resource {
    static transform(user, options = {}) {
        const { isAdmin = false, includeEmail = false } = options;

        return Resource.clean({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,

            // Only include email for admins or when explicitly requested
            email: Resource.when(isAdmin || includeEmail, user.email),

            // Include profile only if it was loaded
            profile: Resource.whenLoaded(user, 'profile', (profile) => ({
                bio: profile.bio,
                avatar_url: Resource.whenNotNull(profile.avatar, (url) =>
                    `https://cdn.example.com/${url}`
                )
            })),

            // Include posts only if loaded, transform with PostResource
            posts: Resource.whenLoaded(user, 'posts', () =>
                PostResource.collection(user.posts)
            ),

            // Sensitive data only for admins
            ...Resource.when(isAdmin, {
                created_at: user.created_at,
                has_password: !!user.password
            })
        });
    }
}

// Examples
console.log('=== Single User (public view) ===');
console.log(JSON.stringify(UserResource.transform(users[0]), null, 2));

console.log('\n=== Single User (admin view) ===');
console.log(JSON.stringify(UserResource.transform(users[0], { isAdmin: true }), null, 2));

console.log('\n=== User without relations loaded ===');
console.log(JSON.stringify(UserResource.transform(users[1]), null, 2));

console.log('\n=== Collection ===');
console.log(JSON.stringify(UserResource.collection(users, { includeEmail: true }), null, 2));

console.log('\n=== Wrapped Response ===');
console.log(JSON.stringify(UserResource.wrap(UserResource.transform(users[0])), null, 2));

console.log('\n=== Paginated Response ===');
const paginatedResult = {
    results: users,
    total: 50
};
console.log(JSON.stringify(UserResource.paginate(paginatedResult, { page: 1, perPage: 15 }), null, 2));

console.log('\n=== Quick Resource with define() ===');
const SimpleUser = Resource.define((user) => ({
    id: user.id,
    full_name: `${user.first_name} ${user.last_name}`
}));
console.log(JSON.stringify(SimpleUser.collection(users), null, 2));
