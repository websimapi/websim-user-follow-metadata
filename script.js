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
    fetchFollowers();
});

loadMoreFollowing.addEventListener('click', () => {
    fetchFollowing();
});

// Create user card
function createUserCard(userData, followDate) {
    const { user } = userData.follow;
    
    const card = document.createElement('a');
    card.className = 'user-card';
    card.href = `https://websim.ai/@${user.username}`;
    card.target = '_blank';
    
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = user.avatar_url || `https://images.websim.ai/avatar/${user.username}`;
    avatar.alt = `${user.username}'s avatar`;
    
    const details = document.createElement('div');
    details.className = 'details';
    
    const username = document.createElement('div');
    username.className = 'username';
    username.textContent = `@${user.username}`;
    
    const date = document.createElement('div');
    date.className = 'follow-date';
    
    // Fix: Show correct text for followers vs following
    if (userData.follow.user.id === currentUser.id) {
        date.textContent = `Followed you on ${formatDate(followDate)}`;
    } else {
        date.textContent = `Following since ${formatDate(followDate)}`;
    }
    
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
            throw new Error('Not logged in');
        }
        
        userAvatar.src = currentUser.avatar_url || `https://images.websim.ai/avatar/${currentUser.username}`;
        usernameElement.textContent = `@${currentUser.username}`;
        
        // Initial data loading
        fetchFollowers();
        fetchFollowersCount();
        fetchFollowingCount();
    } catch (error) {
        console.error('Error fetching current user:', error);
        usernameElement.textContent = 'User not logged in';
    }
}

// Fetch followers count
async function fetchFollowersCount() {
    try {
        const response = await fetch(`/api/v1/user/followers?count=true`);
        const data = await response.json();
        followersCount.textContent = data.followers.meta.count || 0;
    } catch (error) {
        console.error('Error fetching followers count:', error);
    }
}

// Fetch following count
async function fetchFollowingCount() {
    try {
        const response = await fetch(`/api/v1/user/following?count=true`);
        const data = await response.json();
        followingCount.textContent = data.following.meta.count || 0;
    } catch (error) {
        console.error('Error fetching following count:', error);
    }
}

// Fetch followers
async function fetchFollowers() {
    if (!followersData.meta.has_next_page) {
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
        
        const response = await fetch(`/api/v1/user/followers?${params.toString()}`);
        const data = await response.json();
        
        followersData.meta.end_cursor = data.followers.meta.end_cursor;
        followersData.meta.has_next_page = data.followers.meta.has_next_page;
        
        if (data.followers.data.length === 0 && followersData.data.length === 0) {
            showEmptyState(followersList, 'No followers yet');
        } else {
            data.followers.data.forEach(item => {
                followersData.data.push(item);
                const card = createUserCard(item, item.follow.created_at);
                followersList.appendChild(card);
            });
        }
        
        loadMoreFollowers.disabled = !followersData.meta.has_next_page;
    } catch (error) {
        console.error('Error fetching followers:', error);
    } finally {
        followersLoading.style.display = 'none';
    }
}

// Fetch following
async function fetchFollowing() {
    if (!followingData.meta.has_next_page) {
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
        
        const response = await fetch(`/api/v1/user/following?${params.toString()}`);
        const data = await response.json();
        
        followingData.meta.end_cursor = data.following.meta.end_cursor;
        followingData.meta.has_next_page = data.following.meta.has_next_page;
        
        if (data.following.data.length === 0 && followingData.data.length === 0) {
            showEmptyState(followingList, 'Not following anyone yet');
        } else {
            data.following.data.forEach(item => {
                followingData.data.push(item);
                const card = createUserCard(item, item.follow.created_at);
                followingList.appendChild(card);
            });
        }
        
        loadMoreFollowing.disabled = !followingData.meta.has_next_page;
    } catch (error) {
        console.error('Error fetching following:', error);
    } finally {
        followingLoading.style.display = 'none';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', fetchCurrentUser);