/* --------------------------------------------------
 * Backend Integration & Authentication
 * -------------------------------------------------- */
const API_BASE = ''; // Same origin, so no need for full URL
let currentUser = null;

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// Set auth token
function setAuthToken(token) {
  localStorage.setItem('auth_token', token);
}

// Remove auth token
function removeAuthToken() {
  localStorage.removeItem('auth_token');
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}/api${endpoint}`, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    // Token expired or invalid
    removeAuthToken();
    currentUser = null;
    updateUIForAuthState();
  }
  
  return response;
}

// Check if user is logged in on page load
async function checkAuthState() {
  const token = getAuthToken();
  if (!token) {
    updateUIForAuthState();
    return;
  }
  
  try {
    const response = await apiRequest('/auth/me');
    if (response.ok) {
      currentUser = await response.json();
      updateUIForAuthState();
    } else {
      removeAuthToken();
      currentUser = null;
      updateUIForAuthState();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    removeAuthToken();
    currentUser = null;
    updateUIForAuthState();
  }
}

// Update UI based on authentication state
function updateUIForAuthState() {
  const loginLinks = document.querySelectorAll('a[href="login.html"]');
  const signupLinks = document.querySelectorAll('a[href="login.html#signup"]');
  
  if (currentUser) {
    // User is logged in
    loginLinks.forEach(link => {
      if (link.textContent.includes('Logga in')) {
        link.textContent = currentUser.name;
        link.href = '#';
        link.onclick = showUserMenu;
      }
    });
    
    signupLinks.forEach(link => {
      if (link.textContent.includes('Registrera')) {
        link.textContent = 'Logga ut';
        link.href = '#';
        link.onclick = logout;
      }
    });
  } else {
    // User is not logged in
    loginLinks.forEach(link => {
      link.textContent = 'Logga in';
      link.href = 'login.html';
      link.onclick = null;
    });
    
    signupLinks.forEach(link => {
      link.textContent = 'Registrera';
      link.href = 'login.html#signup';
      link.onclick = null;
    });
  }
}

// Show user menu (placeholder)
function showUserMenu(e) {
  e.preventDefault();
  const actions = currentUser.role === 'landlord' 
    ? ['Mina annonser', 'Skapa annons', 'Profil', 'Logga ut']
    : ['Mina sökningar', 'Profil', 'Logga ut'];
  
  const action = prompt('Välj åtgärd:\n' + actions.join('\n'));
  
  switch (action) {
    case 'Mina annonser':
      window.location.href = 'listings.html?user=me';
      break;
    case 'Skapa annons':
      window.location.href = 'create-listing.html';
      break;
    case 'Logga ut':
      logout();
      break;
  }
}

// Logout function
function logout() {
  removeAuthToken();
  currentUser = null;
  updateUIForAuthState();
  window.location.href = 'index.html';
}

/* --------------------------------------------------
 * API Data Functions
 * -------------------------------------------------- */

// Fetch listings from API
async function fetchListings(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiRequest(`/listings${queryString ? '?' + queryString : ''}`);
    
    if (response.ok) {
      return await response.json();
    } else {
      console.error('Failed to fetch listings');
      return SAMPLE_LISTINGS; // Fallback to sample data
    }
  } catch (error) {
    console.error('Error fetching listings:', error);
    return SAMPLE_LISTINGS; // Fallback to sample data
  }
}

// Fetch single listing
async function fetchListing(id) {
  try {
    const response = await apiRequest(`/listings/${id}`);
    
    if (response.ok) {
      return await response.json();
    } else {
      console.error('Failed to fetch listing');
      return SAMPLE_LISTINGS[0]; // Fallback
    }
  } catch (error) {
    console.error('Error fetching listing:', error);
    return SAMPLE_LISTINGS[0]; // Fallback
  }
}

/* --------------------------------------------------
 * Sample Data (Fallback)
 * -------------------------------------------------- */
const SAMPLE_LISTINGS = [
  {
    id: 1,
    title: "1:a i Solna nära Mall of Scandinavia",
    rent: 9500,
    size: 28,
    city: "Solna",
    address: "Frösundaviks allé 5",
    description: "Möblerad etta med balkong. 5 min till pendeltåg.",
    photos: ["assets/placeholder-apt.jpg"],
  },
  {
    id: 2,
    title: "2:a i Södermalm med utsikt",
    rent: 14500,
    size: 45,
    city: "Stockholm",
    address: "Hornsgatan 100",
    description: "Ljus lägenhet, nära T-bana.",
    photos: ["assets/placeholder-apt.jpg"],
  },
  {
    id: 3,
    title: "Rum uthyres i studentkollektiv KTH",
    rent: 5200,
    size: 12,
    city: "Flemingsberg",
    address: "Campusvägen 3",
    description: "Perfekt för studenter, delat kök.",
    photos: ["assets/placeholder-apt.jpg"],
  },
];

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */
function kr(x) {
  return new Intl.NumberFormat('sv-SE').format(x) + ' kr';
}

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

function setFooterYear(){
  const el = document.getElementById('ft-year');
  if(el){ el.textContent = new Date().getFullYear(); }
}

/* --------------------------------------------------
 * Index: featured listings
 * -------------------------------------------------- */
async function loadFeaturedListings() {
  const container = document.getElementById('featured-listings');
  if (!container) return;
  
  const listings = await fetchListings();
  const top = listings.slice(0, 3);
  container.innerHTML = top.map(l => listingCardHTML(l)).join('');
}

/* --------------------------------------------------
 * Listings page
 * -------------------------------------------------- */
async function loadAllListings() {
  const params = getQueryParams();
  const listings = await fetchListings(params);
  renderListings(listings);
  
  // Apply any additional filters from form
  applyFilters();
}

function renderListings(listings) {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;
  
  if (listings.length === 0) {
    grid.innerHTML = '<p>Inga bostäder hittades.</p>';
    return;
  }
  
  grid.innerHTML = listings.map(l => listingCardHTML(l)).join('');
}

async function applyFilters() {
  const form = document.getElementById('filters-form');
  if (!form) return;
  
  const data = new FormData(form);
  const params = {};
  
  if (data.get('minRent')) params.minRent = data.get('minRent');
  if (data.get('maxRent')) params.maxRent = data.get('maxRent');
  if (data.get('minSize')) params.minSize = data.get('minSize');
  if (data.get('maxSize')) params.maxSize = data.get('maxSize');
  if (data.get('area')) params.area = data.get('area');
  
  const listings = await fetchListings(params);
  renderListings(listings);
}

async function resetFilters(e) {
  e.preventDefault();
  const form = document.getElementById('filters-form');
  form.reset();
  
  const listings = await fetchListings();
  renderListings(listings);
}

/* --------------------------------------------------
 * Listing detail
 * -------------------------------------------------- */
async function loadListingFromQuery() {
  const { id } = getQueryParams();
  const listing = await fetchListing(id || 1);
  populateListing(listing);
}

function populateListing(l) {
  document.title = `${l.title} – Hyra Tryggt`;
  const titleEl = document.getElementById('listing-title');
  const locEl = document.getElementById('listing-location');
  const rentEl = document.getElementById('listing-rent');
  const sizeEl = document.getElementById('listing-size');
  const descEl = document.getElementById('listing-desc');
  const galleryEl = document.getElementById('listing-gallery');

  if (titleEl) titleEl.textContent = l.title;
  if (locEl) locEl.textContent = `${l.city} – ${l.address}`;
  if (rentEl) rentEl.textContent = kr(l.rent);
  if (sizeEl) sizeEl.textContent = l.size;
  if (descEl) descEl.textContent = l.description;
  if (galleryEl) {
    galleryEl.innerHTML = l.photos.map(src => `<img src="${src}" alt="Foto av ${l.title}" />`).join('');
  }
}

async function contactLandlord() {
  if (!currentUser) {
    alert('Du måste logga in för att kontakta uthyraren.');
    window.location.href = 'login.html';
    return;
  }
  
  const { id } = getQueryParams();
  const message = prompt('Skriv ditt meddelande till uthyraren:');
  
  if (!message) return;
  
  try {
    const response = await apiRequest(`/contact/${id}`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    
    if (response.ok) {
      alert('Ditt meddelande har skickats!');
    } else {
      alert('Något gick fel. Försök igen.');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Något gick fel. Försök igen.');
  }
}

/* --------------------------------------------------
 * Forms: index hero, create listing, auth, quick register
 * -------------------------------------------------- */
async function heroSearchSubmit(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[name="q"]');
  const q = encodeURIComponent(input.value.trim());
  window.location.href = `listings.html?q=${q}`;
  return false;
}

async function submitListingForm(e) {
  e.preventDefault();
  
  if (!currentUser) {
    alert('Du måste logga in för att skapa en annons.');
    window.location.href = 'login.html';
    return false;
  }
  
  const form = e.target;
  const formData = new FormData(form);
  const statusEl = document.getElementById('create-listing-status');
  
  try {
    statusEl.textContent = 'Skapar annons...';
    
    const response = await fetch('/api/listings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      statusEl.textContent = 'Din annons har publicerats!';
      form.reset();
      
      // Redirect to the new listing after a short delay
      setTimeout(() => {
        window.location.href = `listing.html?id=${result.listing.id}`;
      }, 1500);
    } else {
      const error = await response.json();
      statusEl.textContent = `Fel: ${error.error}`;
    }
  } catch (error) {
    console.error('Error creating listing:', error);
    statusEl.textContent = 'Något gick fel. Försök igen.';
  }
  
  return false;
}

async function quickRegisterBostad(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const statusEl = document.getElementById('quick-register-status');
  
  try {
    statusEl.textContent = 'Skickar...';
    
    const response = await apiRequest('/quick-register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      statusEl.textContent = 'Tack! Vi kontaktar dig snart.';
      form.reset();
    } else {
      const error = await response.json();
      statusEl.textContent = `Fel: ${error.error}`;
    }
  } catch (error) {
    console.error('Error with quick registration:', error);
    statusEl.textContent = 'Något gick fel. Försök igen.';
  }
  
  return false;
}

async function fakeLogin(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      const result = await response.json();
      setAuthToken(result.token);
      currentUser = result.user;
      updateUIForAuthState();
      
      alert('Inloggad!');
      window.location.href = 'index.html';
    } else {
      const error = await response.json();
      alert(`Fel: ${error.error}`);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Något gick fel. Försök igen.');
  }
  
  return false;
}

async function fakeSignup(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  
  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      const result = await response.json();
      setAuthToken(result.token);
      currentUser = result.user;
      updateUIForAuthState();
      
      alert('Konto skapat!');
      
      // Redirect based on role
      if (result.user.role === 'landlord') {
        window.location.href = 'create-listing.html';
      } else {
        window.location.href = 'index.html';
      }
    } else {
      const error = await response.json();
      alert(`Fel: ${error.error}`);
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('Något gick fel. Försök igen.');
  }
  
  return false;
}

/* --------------------------------------------------
 * Listing card markup
 * -------------------------------------------------- */
function listingCardHTML(l) {
  const img = l.photos?.[0] || 'assets/placeholder-apt.jpg';
  return `
  <article class="listing-card">
    <a href="listing.html?id=${l.id}" class="listing-card-link">
      <div class="listing-card-imgwrap">
        <img src="${img}" alt="${l.title}" loading="lazy"/>
      </div>
      <div class="listing-card-body">
        <h3>${l.title}</h3>
        <p class="listing-card-rent">${kr(l.rent)} / mån</p>
        <p class="listing-card-meta">${l.size} m² • ${l.city}</p>
      </div>
    </a>
  </article>`;
}

/* --------------------------------------------------
 * Initialize on page load
 * -------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication state on every page load
  checkAuthState();
  
  // Set footer year
  setFooterYear();
  
  // Page-specific initialization
  const path = window.location.pathname;
  
  if (path.includes('index.html') || path === '/') {
    loadFeaturedListings();
  } else if (path.includes('listings.html')) {
    loadAllListings();
  } else if (path.includes('listing.html')) {
    loadListingFromQuery();
  }
});