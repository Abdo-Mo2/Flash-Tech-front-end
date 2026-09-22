import http from 'k6/http';
import { check, sleep } from 'k6';

const FRONTEND = 'https://flash-tech-mocha.vercel.app';
const SUPABASE = 'https://wjtesrtznujpjpxlzbqv.supabase.co';

export const options = {
  vus: 500,
  duration: '1m',

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

function checkPage(name, res) {
  check(res, {
    [`${name} - status 200`]: (r) => r.status === 200,
    [`${name} - under 2s`]: (r) => r.timings.duration < 2000,
  });
}

function checkApi(name, res) {
  check(res, {
    [`${name} - API success`]: (r) =>
      r.status >= 200 && r.status < 300,

    [`${name} - API under 2s`]: (r) =>
      r.timings.duration < 2000,
  });
}

export default function () {

  // =========================================================
  // FRONTEND
  // =========================================================

  let home = http.get(`${FRONTEND}/`);
  checkPage('HOME', home);

  sleep(0.5);

  let shop = http.get(`${FRONTEND}/shop`);
  checkPage('SHOP', shop);

  sleep(0.5);

  let category = http.get(`${FRONTEND}/shop/desktop-pcs`);
  checkPage('CATEGORY', category);

  sleep(0.5);

  let search = http.get(
    `${FRONTEND}/search?q=laptop`
  );
  checkPage('SEARCH', search);

  sleep(0.5);

  let auth = http.get(`${FRONTEND}/auth`);
  checkPage('AUTH', auth);

  sleep(0.5);

  let contact = http.get(`${FRONTEND}/contact`);
  checkPage('CONTACT', contact);

  sleep(0.5);

  let cart = http.get(`${FRONTEND}/cart`);
  checkPage('CART', cart);

  sleep(0.5);

  // =========================================================
  // SUPABASE BACKEND
  // READ ONLY - NO DATA MODIFICATION
  // =========================================================

  const headers = {
    apikey: __ENV.SUPABASE_KEY || '',
    Authorization:
      `Bearer ${__ENV.SUPABASE_KEY || ''}`,
  };

  // Products
  let products = http.get(
    `${SUPABASE}/rest/v1/products?select=id,name,price&limit=20`,
    { headers }
  );

  checkApi('PRODUCTS API', products);

  sleep(0.3);

  // Categories
  let categories = http.get(
    `${SUPABASE}/rest/v1/categories?select=id,name&limit=20`,
    { headers }
  );

  checkApi('CATEGORIES API', categories);

  sleep(0.3);

  // Brands
  let brands = http.get(
    `${SUPABASE}/rest/v1/brands?select=id,name&limit=20`,
    { headers }
  );

  checkApi('BRANDS API', brands);

  sleep(0.3);

  // =========================================================
  // SUPABASE STORAGE
  // =========================================================

  let storage = http.get(
    `${SUPABASE}/storage/v1/object/list/hero-images`,
    { headers }
  );

  checkApi('STORAGE API', storage);

  sleep(0.3);

  // =========================================================
  // FINAL PRODUCT QUERY
  // Simulates product browsing/filtering
  // =========================================================

  let productSearch = http.get(
    `${SUPABASE}/rest/v1/products?select=id,name,price&name=ilike.*laptop*&limit=20`,
    { headers }
  );

  checkApi('PRODUCT SEARCH API', productSearch);

  sleep(1);
}