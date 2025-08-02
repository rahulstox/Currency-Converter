// --- Three.js 3D Background Animation ---

// Check if Three.js is loaded
if (typeof THREE === 'undefined') {
    console.error('Three.js library is not loaded.');
} else {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('bg-canvas'),
        alpha: true // Make canvas transparent
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create a group for the coins
    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    // Coin geometry and material
    const coinGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 32);
    const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 });

    // Create and position multiple coins
    for (let i = 0; i < 50; i++) {
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        
        // Distribute coins in a spherical pattern
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const radius = 2 + Math.random() * 3;

        coin.position.x = radius * Math.sin(theta) * Math.cos(phi);
        coin.position.y = radius * Math.sin(theta) * Math.sin(phi);
        coin.position.z = radius * Math.cos(theta);
        
        // Random rotation for each coin
        coin.rotation.x = Math.random() * 2 * Math.PI;
        coin.rotation.y = Math.random() * 2 * Math.PI;
        
        coinGroup.add(coin);
    }

    camera.position.z = 5;

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Rotate the entire group of coins
        coinGroup.rotation.x += 0.001;
        coinGroup.rotation.y += 0.002;

        renderer.render(scene, camera);
    }
    animate();

    // Handle window resize to keep the scene responsive
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}


// --- Currency Converter Logic ---

// Get DOM elements
const amountEl = document.getElementById('amount');
const fromCurrencyEl = document.getElementById('from-currency');
const toCurrencyEl = document.getElementById('to-currency');
const fromFlagEl = document.getElementById('from-flag');
const toFlagEl = document.getElementById('to-flag');
const swapButton = document.getElementById('swap-button');
const resultTextEl = document.getElementById('result-text');
const lastUpdatedEl = document.getElementById('last-updated');
const loaderEl = document.getElementById('loader');
const errorMessageEl = document.getElementById('error-message');

// API Configuration
const primaryApiUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
const fallbackApiUrl = 'https://latest.currency-api.pages.dev/v1';

// Generic fetch function with a fallback mechanism
async function fetchWithFallback(endpoint) {
    try {
        const response = await fetch(`${primaryApiUrl}${endpoint}`);
        if (!response.ok) throw new Error('Primary API failed');
        return response.json();
    } catch (error) {
        console.warn('Primary API failed, trying fallback...');
        const response = await fetch(`${fallbackApiUrl}${endpoint}`);
        if (!response.ok) throw new Error('Fallback API also failed');
        return response.json();
    }
}

// Update the flag image based on the selected currency
function updateFlag(selectElement, imgElement) {
    const currencyCode = selectElement.value.toUpperCase();
    let countryCode = currencyCode.substring(0, 2);
    // Handle special currency codes that don't map directly to a country code
    const specialCases = { 'EUR': 'EU', 'ANG': 'NL', 'XCD': 'AG', 'XAF': 'CM', 'XOF': 'SN', 'CUP': 'CU', 'GGP': 'GG', 'IMP': 'IM', 'JEP': 'JE', 'KID': 'KI', 'TVD': 'TV' };
    if (specialCases[currencyCode]) {
        countryCode = specialCases[currencyCode];
    }
    imgElement.src = `https://flagsapi.com/${countryCode}/flat/64.png`;
    imgElement.style.display = 'block';
    // Hide the flag if the image fails to load
    imgElement.onerror = () => { imgElement.style.display = 'none'; };
}

// Fetch the list of currencies and populate the dropdowns
async function populateCurrencies() {
    showLoader();
    try {
        const currencies = await fetchWithFallback('/currencies.json');
        
        for (const [code, name] of Object.entries(currencies)) {
            const option1 = document.createElement('option');
            option1.value = code;
            option1.textContent = `${code.toUpperCase()} - ${name}`;
            fromCurrencyEl.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = code;
            option2.textContent = `${code.toUpperCase()} - ${name}`;
            toCurrencyEl.appendChild(option2);
        }

        // Set default currencies
        fromCurrencyEl.value = 'usd';
        toCurrencyEl.value = 'eur';
        
        // Update flags for default currencies
        updateFlag(fromCurrencyEl, fromFlagEl);
        updateFlag(toCurrencyEl, toFlagEl);

        // Perform initial conversion
        await convertCurrency();

    } catch (error) {
        console.error('Error populating currencies:', error);
        showError('Could not load currency list. Check network and try again.');
    } finally {
        hideLoader();
    }
}

// Perform the currency conversion
async function convertCurrency() {
    const amount = parseFloat(amountEl.value);
    const fromCurrency = fromCurrencyEl.value;
    const toCurrency = toCurrencyEl.value;

    if (isNaN(amount) || !fromCurrency || !toCurrency) return;

    showLoader();
    hideError();
    resultTextEl.textContent = '';

    try {
        const data = await fetchWithFallback(`/currencies/${fromCurrency}.json`);
        
        const rate = data[fromCurrency][toCurrency];
        if (rate === undefined) {
            throw new Error(`Rate not found for ${fromCurrency} to ${toCurrency}`);
        }
        
        const convertedAmount = (amount * rate).toFixed(2);
        resultTextEl.textContent = `${amount} ${fromCurrency.toUpperCase()} = ${convertedAmount} ${toCurrency.toUpperCase()}`;
        
        const updateDate = new Date(data.date);
        lastUpdatedEl.textContent = `Last updated: ${updateDate.toLocaleDateString()}`;

    } catch (error) {
        console.error('Error converting currency:', error);
        showError(error.message);
    } finally {
        hideLoader();
    }
}

// UI Helper functions
function showLoader() { loaderEl.style.display = 'block'; }
function hideLoader() { loaderEl.style.display = 'none'; }
function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.style.display = 'block';
    resultTextEl.textContent = '';
    lastUpdatedEl.textContent = '';
}
function hideError() { errorMessageEl.style.display = 'none'; }

// --- Event Listeners ---

// Convert currency on amount or currency change
amountEl.addEventListener('input', convertCurrency);
fromCurrencyEl.addEventListener('change', () => {
    updateFlag(fromCurrencyEl, fromFlagEl);
    convertCurrency();
});
toCurrencyEl.addEventListener('change', () => {
    updateFlag(toCurrencyEl, toFlagEl);
    convertCurrency();
});

// Swap currencies on button click
swapButton.addEventListener('click', () => {
    const temp = fromCurrencyEl.value;
    fromCurrencyEl.value = toCurrencyEl.value;
    toCurrencyEl.value = temp;
    
    updateFlag(fromCurrencyEl, fromFlagEl);
    updateFlag(toCurrencyEl, toFlagEl);
    convertCurrency();
});

// Populate currencies when the page loads
document.addEventListener('DOMContentLoaded', populateCurrencies);
