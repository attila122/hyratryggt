/* --------------------------------------------------
 * Fake Data (replace w/ API calls later)
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
function loadFeaturedListings() {
  const container = document.getElementById('featured-listings');
  if (!container) return;
  const top = SAMPLE_LISTINGS.slice(0, 3);
  container.innerHTML = top.map(l => listingCardHTML(l)).join('');
}

/* --------------------------------------------------
 * Listings page
 * -------------------------------------------------- */
function loadAllListings() {
  renderListings(SAMPLE_LISTINGS);
  applyFilters(); // apply query params if any
}

function renderListings(listings) {
  const grid = document.getElementById('listings-grid');
  if (!grid) return;
  grid.innerHTML = listings.map(l => listingCardHTML(l)).join('');
}

function applyFilters() {
  const form = document.getElementById('filters-form');
  if (!form) return;
  const data = new FormData(form);
  const minRent = parseInt(data.get('minRent'), 10) || 0;
  const maxRent = parseInt(data.get('maxRent'), 10) || Infinity;
  const minSize = parseInt(data.get('minSize'), 10) || 0;
  const maxSize = parseInt(data.get('maxSize'), 10) || Infinity;
  const area = (data.get('area') || '').trim().toLowerCase();

  const filtered = SAMPLE_LISTINGS.filter(l =>
    l.rent >= minRent &&
    l.rent <= maxRent &&
    l.size >= minSize &&
    l.size <= maxSize &&
    (!area || l.city.toLowerCase().includes(area) || l.address.toLowerCase().includes(area))
  );
  renderListings(filtered);
}

function resetFilters(e) {
  e.preventDefault();
  const form = document.getElementById('filters-form');
  form.reset();
  renderListings(SAMPLE_LISTINGS);
}

/* --------------------------------------------------
 * Listing detail
 * -------------------------------------------------- */
function loadListingFromQuery() {
  const { id } = getQueryParams();
  const listing = SAMPLE_LISTINGS.find(l => l.id === Number(id)) || SAMPLE_LISTINGS[0];
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

function contactLandlord() {
  alert('I MVP: öppna kontaktformulär eller logga in först.');
}

/* --------------------------------------------------
 * Forms: index hero, create listing, auth, quick register
 * -------------------------------------------------- */
function heroSearchSubmit(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[name="q"]');
  const q = encodeURIComponent(input.value.trim());
  window.location.href = `listings.html?area=${q}`;
  return false;
}

function submitListingForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const listing = Object.fromEntries(data.entries());
  console.log('Fake submit listing', listing);
  document.getElementById('create-listing-status').textContent = 'Din annons sparades (demo)';
  form.reset();
  return false;
}

function quickRegisterBostad(e){
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  console.log('Quick register bostad', data);
  const status = document.getElementById('quick-register-status');
  if(status){status.textContent = 'Tack! Vi kontaktar dig snart (demo).';}
  form.reset();
  return false;
}

function fakeLogin(e) {
  e.preventDefault();
  alert('Inloggad (demo).');
  window.location.href = 'index.html';
  return false;
}

function fakeSignup(e) {
  e.preventDefault();
  alert('Konto skapat (demo).');
  window.location.href = 'index.html#register-bostad';
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
      <div class=\"listing-card-imgwrap\">
        <img src="${img}" alt="${l.title}" loading="lazy"/>
      </div>
      <div class=\"listing-card-body\">
        <h3>${l.title}</h3>
        <p class=\"listing-card-rent\">${kr(l.rent)} / mån</p>
        <p class=\"listing-card-meta\">${l.size} m² • ${l.city}</p>
      </div>
    </a>
  </article>`;
}