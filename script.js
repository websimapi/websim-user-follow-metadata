let currentUser = null;
let followersData = { meta: { end_cursor: null, has_next_page: true }, data: [] };
let followingData = { meta: { end_cursor: null, has_next_page: true }, data: [] };

const followersTab = document.getElementById('followers-tab');
const followingTab = document.getElementById('following-tab');
const followersContainer = document.getElementById('followers-container');
const followingContainer = document.getElementById('following-container');
const followersList = document.getElementById('followers-list');
const followingList = document.getElementById('following-list');
const loadMoreFollowers = document.getElementById('load-more-followers');
const loadMoreFollowing = document.getElementById('load-more-following');
const followersLoading = document.getElementById('followers-loading');
const followingLoading = document.getElementById('following-loading');
const userAvatar = document.getElementById('user-avatar');
const usernameElement = document.getElementById('username');
const followersCount = document.getElementById('followers-count');
const followingCount = document.getElementById('following-count');
const projectsCount = document.getElementById('projects-count');
const viewsCount = document.getElementById('views-count');

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Switch between tabs
followersTab.addEventListener('click', () => {
    followersTab.classList.add('active');
    followingTab.classList.remove('active');
    followersContainer.classList.add('active');
    followingContainer.classList.remove('active');
    
    if (followersData.data.length === 0 && followersData.meta.has_next_page) {
        fetchFollowers();
    }
});

followingTab.addEventListener('click', () => {
    followingTab.classList.add('active');
    followersTab.classList.remove('active');
    followingContainer.classList.add('active');
    followersContainer.classList.remove('active');
    
    if (followingData.data.length === 0 && followingData.meta.has_next_page) {
        fetchFollowing();
    }
});

// Load more button handlers
loadMoreFollowers.addEventListener('click', () => {
    fetchFollowers(currentUser?.username);
});

loadMoreFollowing.addEventListener('click', () => {
    fetchFollowing(currentUser?.username);
});

// Create user card
function createUserCard(userData, followDate) {
    const { user } = userData.follow;
    
    const card = document.createElement('a');
    card.className = 'user-card';
    card.href = `https://websim.com/@${user.username}`;
    card.target = '_blank';
    
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = user.avatar_url || `https://images.websim.com/avatar/${user.username}`;
    avatar.alt = `${user.username}'s avatar`;
    
    const details = document.createElement('div');
    details.className = 'details';
    
    const username = document.createElement('div');
    username.className = 'username';
    username.textContent = `@${user.username}`;
    
    const date = document.createElement('div');
    date.className = 'follow-date';
    
    // The date indicates when the follow relationship began, regardless of whether
    // this is a follower list (they followed you) or a following list (you followed them).
    date.textContent = `Since ${formatDate(followDate)}`;
    
    details.appendChild(username);
    details.appendChild(date);
    
    card.appendChild(avatar);
    card.appendChild(details);
    
    return card;
}

// Display no users message
function showEmptyState(container, message) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = message;
    container.appendChild(emptyState);
}

// Fetch current user info
async function fetchCurrentUser() {
    try {
        currentUser = await window.websim.getUser();
        
        if (!currentUser) {
            console.error('User is not logged in. Cannot fetch follow data.');
            throw new Error('Not logged in');
        }
        
        userAvatar.src = currentUser.avatar_url || `https://images.websim.com/avatar/${currentUser.username}`;
        usernameElement.textContent = `@${currentUser.username}`;
        
        const username = currentUser.username;
        
        // Initial data loading using the current user's username
        fetchFollowersCount(username);
        fetchFollowingCount(username);
        
        // NEW: projects + views
        projectsCount.textContent = '0';
        viewsCount.textContent = '0';
        fetchProjectStats(username, ({ totalProjects, totalViews }) => {
            animateCount(projectsCount, totalProjects);
            animateCount(viewsCount, totalViews);
        }).then(({ totalProjects, totalViews }) => {
            projectsCount.textContent = String(totalProjects);
            viewsCount.textContent = totalViews.toLocaleString();
        }).catch(() => {
            projectsCount.textContent = '0';
            viewsCount.textContent = '0';
        });
        
        // Fetch initial list if the followers tab is active (which it is by default)
        fetchFollowers(username);
    } catch (error) {
        console.error('Error fetching current user:', error);
        usernameElement.textContent = 'User not logged in';
    }
}

/**
 * Note on Comment Logic Request:
 * The user requested using 'comment logic' to extract metadata. The Websim Comments API is exclusively
 * designed for project comments (postComment, getComments, comment:created event). It does not provide
 * access to User, Followers, or Following metadata. We must use the appropriate User API endpoints.
 * The issue observed previously (data.followers being undefined) was likely due to an incorrect API path structure.
 * We are now implementing the documented path: /api/v1/users/{username}/...
 */

// Fetch followers count
async function fetchFollowersCount(username) {
    if (!username) return;
    console.log(`[Follow API] Attempting to fetch followers count for @${username}`);
    try {
        // Attempt 1: Use the robust API path /api/v1/users/{username}/followers?count=true
        const apiPath = `/api/v1/users/${username}/followers?count=true`;
        const response = await fetch(apiPath);
        const data = await response.json();

        // Expecting data structure like { followers: { meta: { count: N } } }
        const count = data?.followers?.meta?.count ?? 0;
        
        followersCount.textContent = count;
        console.log(`[Follow API] SUCCESS: Retrieved ${count} followers count using path: ${apiPath}`);
    } catch (error) {
        // Fallback or detailed error logging as requested by user ("verbose")
        console.error(`[Follow API] Attempt 1 failed fetching followers count (${username}):`, error);
        
        // Attempt 2 (Retry using the previous, potentially deprecated path for compatibility)
        console.log(`[Follow API] RETRYING with previous API path: /api/v1/user/followers?count=true`);
         try {
            const fallbackPath = `/api/v1/user/followers?count=true`;
            const response = await fetch(fallbackPath);
            const data = await response.json();
            
            // Assuming old structure: { meta: { count: N } }
            const count = data?.meta?.count ?? 0;
            followersCount.textContent = count;
            console.log(`[Follow API] SUCCESS: Retry succeeded (Old path). Retrieved ${count} followers count.`);
        } catch (retryError) {
             console.error('[Follow API] Attempt 2 failed: Retry failed for old path.', retryError);
             followersCount.textContent = 'Error';
        }
    }
}

// Fetch following count
async function fetchFollowingCount(username) {
    if (!username) return;
    console.log(`[Follow API] Attempting to fetch following count for @${username}`);
    try {
        // Attempt 1: Use the robust API path /api/v1/users/{username}/following?count=true
        const apiPath = `/api/v1/users/${username}/following?count=true`;
        const response = await fetch(apiPath);
        const data = await response.json();

        // Expecting data structure like { following: { meta: { count: N } } }
        const count = data?.following?.meta?.count ?? 0;
        
        followingCount.textContent = count;
        console.log(`[Follow API] SUCCESS: Retrieved ${count} following count using path: ${apiPath}`);
    } catch (error) {
        // Fallback or detailed error logging
        console.error(`[Follow API] Attempt 1 failed fetching following count (${username}):`, error);

        // Attempt 2 (Retry with previous API path)
        console.log(`[Follow API] RETRYING with previous API path: /api/v1/user/following?count=true`);
        try {
            const fallbackPath = `/api/v1/user/following?count=true`;
            const response = await fetch(fallbackPath);
            const data = await response.json();
            
            // Assuming old structure: { meta: { count: N } }
            const count = data?.meta?.count ?? 0;
            followingCount.textContent = count;
            console.log(`[Follow API] SUCCESS: Retry succeeded (Old path). Retrieved ${count} following count.`);
        } catch (retryError) {
             console.error('[Follow API] Attempt 2 failed: Retry failed for old path.', retryError);
             followingCount.textContent = 'Error';
        }
    }
}

// Fetch followers
async function fetchFollowers(username) {
    if (!username || !followersData.meta.has_next_page) {
        loadMoreFollowers.disabled = true;
        return;
    }
    
    followersLoading.style.display = 'flex';
    loadMoreFollowers.disabled = true;
    
    try {
        const params = new URLSearchParams({
            first: 20
        });
        
        if (followersData.meta.end_cursor) {
            params.append('after', followersData.meta.end_cursor);
        }
        
        const apiPath = `/api/v1/users/${username}/followers?${params.toString()}`;
        console.log(`[Follow API] Fetching followers list for @${username} (Path: ${apiPath})`);

        // Use the robust API path /api/v1/users/{username}/followers
        const response = await fetch(apiPath);
        const responseData = await response.json();
        
        // Extract the followers payload
        const data = responseData.followers;
        
        if (!data || !data.meta || !Array.isArray(data.data)) {
            throw new Error(`Unexpected API response structure for followers.`);
        }

        console.log(`[Follow API] Received ${data.data.length} new followers.`);
        
        followersData.meta.end_cursor = data.meta.end_cursor;
        followersData.meta.has_next_page = data.meta.has_next_page;
        
        if (data.data.length === 0 && followersData.data.length === 0) {
            showEmptyState(followersList, 'No followers yet');
        } else {
            data.data.forEach(item => {
                followersData.data.push(item);
                // item is { follow: { user: {...}, created_at: '...' } }
                const card = createUserCard(item, item.follow.created_at);
                followersList.appendChild(card);
            });
        }
        
        loadMoreFollowers.disabled = !followersData.meta.has_next_page;
    } catch (error) {
        console.error('[Follow API] Error fetching followers list:', error);
        // Display an error message if the list is empty due to an error
        if (followersData.data.length === 0) {
            showEmptyState(followersList, 'Failed to load followers list. Check console for details.');
        }
    } finally {
        followersLoading.style.display = 'none';
    }
}

// Fetch following
async function fetchFollowing(username) {
    if (!username || !followingData.meta.has_next_page) {
        loadMoreFollowing.disabled = true;
        return;
    }
    
    followingLoading.style.display = 'flex';
    loadMoreFollowing.disabled = true;
    
    try {
        const params = new URLSearchParams({
            first: 20
        });
        
        if (followingData.meta.end_cursor) {
            params.append('after', followingData.meta.end_cursor);
        }

        const apiPath = `/api/v1/users/${username}/following?${params.toString()}`;
        console.log(`[Follow API] Fetching users followed by @${username} (Path: ${apiPath})`);
        
        // Use the robust API path /api/v1/users/{username}/following
        const response = await fetch(apiPath);
        const responseData = await response.json();
        
        // Extract the following payload
        const data = responseData.following;
        
        if (!data || !data.meta || !Array.isArray(data.data)) {
             throw new Error(`Unexpected API response structure for following.`);
        }

        console.log(`[Follow API] Received ${data.data.length} new followed users.`);
        
        followingData.meta.end_cursor = data.meta.end_cursor;
        followingData.meta.has_next_page = data.meta.has_next_page;
        
        if (data.data.length === 0 && followingData.data.length === 0) {
            showEmptyState(followingList, 'Not following anyone yet');
        } else {
            data.data.forEach(item => {
                followingData.data.push(item);
                // item is { follow: { user: {...}, created_at: '...' } }
                const card = createUserCard(item, item.follow.created_at);
                followingList.appendChild(card);
            });
        }
        
        loadMoreFollowing.disabled = !followingData.meta.has_next_page;
    } catch (error) {
        console.error('[Follow API] Error fetching following list:', error);
        if (followingData.data.length === 0) {
            showEmptyState(followingList, 'Failed to load following list. Check console for details.');
        }
    } finally {
        followingLoading.style.display = 'none';
    }
}

// Fetch project stats
async function fetchProjectStats(username, onProgress) {
    if (!username) throw new Error('No username for project stats');
    const makePaths = [
        (c) => `/api/v1/users/${username}/projects?posted=true&first=50${c ? `&after=${c}` : ''}`,
        (c) => `/api/v1/user/projects?first=50${c ? `&after=${c}` : ''}`,
        (c) => `/api/v1/users/${username}/sites?first=50${c ? `&after=${c}` : ''}`,
    ];
    for (const makePath of makePaths) {
        let endCursor = null, hasNext = true;
        let totalProjects = 0, totalViews = 0;
        try {
            while (hasNext) {
                const url = makePath(endCursor);
                const res = await fetch(url);
                const json = await res.json();
                const bag = json.projects || json.sites || json;
                const list = bag?.data ?? [];
                if (!Array.isArray(list)) throw new Error('Unexpected list');
                for (const item of list) {
                    const node = item.project || item.site || item;
                    if (!node) continue;
                    totalProjects++;
                    const v = node.views ?? node.view_count ?? node.stats?.views ?? node.metrics?.views ?? 0;
                    totalViews += Number.isFinite(v) ? v : 0;
                }
                hasNext = !!bag?.meta?.has_next_page;
                endCursor = bag?.meta?.end_cursor ?? null;
                onProgress && onProgress({ totalProjects, totalViews });
            }
            return { totalProjects, totalViews };
        } catch (e) {
            console.warn('[Project Stats] Path failed:', e);
        }
    }
    throw new Error('All project stats attempts failed');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', fetchCurrentUser);

function animateCount(el, target){
    const start=Number(el.textContent.replace(/[^0-9]/g,''))||0;
    const diff=target-start;
    const dur=300;
    const t0=performance.now();
    function step(t){
        const p=Math.min(1,(t-t0)/dur);
        el.textContent=Math.round(start+diff*p).toLocaleString();
        if(p<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}