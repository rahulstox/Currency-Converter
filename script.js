// --- Three.js 3D Background Animation ---
if (typeof THREE === 'undefined') {
    console.error('Three.js library is not loaded.');
} else {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('bg-canvas'),
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    const coinGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 32);
    const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 });

    for (let i = 0; i < 50; i++) {
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const radius = 2 + Math.random() * 3;
        coin.position.x = radius * Math.sin(theta) * Math.cos(phi);
        coin.position.y = radius * Math.sin(theta) * Math.sin(phi);
        coin.position.z = radius * Math.cos(theta);
        coin.rotation.x = Math.random() * 2 * Math.PI;
        coin.rotation.y = Math.random() * 2 * Math.PI;
        coinGroup.add(coin);
    }

    camera.position.z = 5;

    // Interactive mouse movement
    const mouse = new THREE.Vector2();
    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        // Gently rotate the coin group based on mouse position
        coinGroup.rotation.y += (mouse.x * 0.5 - coinGroup.rotation.y) * 0.02;
        coinGroup.rotation.x += (-mouse.y * 0.5 - coinGroup.rotation.x) * 0.02;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- Currency Converter Logic ---
const amountEl = document.getElementById('amount');
const fromCurrencyEl = document.getElementById('from-currency');
const toCurrencyEl = document.getElementById('to-currency');
const fromFlagEl = document.getElementById('from-flag');
const toFlagEl = document.getElementById('to-flag');
const swapButton = document.getElementById('swap-button');
const resultTextEl = document.getElementById('result-text');
const reverseRateTextEl = document.getElementById('reverse-rate-text');
const lastUpdatedEl = document.getElementById('last-updated');
const loaderEl = document.getElementById('loader');
const errorMessageEl = document.getElementById('error-message');
const copyButton = document.getElementById('copy-button');
const chartToggleButton = document.getElementById('chart-toggle-button');
const chartContainer = document.getElementById('chart-container');
const chartCanvas = document.getElementById('historical-chart');
let historicalChart = null;

const primaryApiUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
const fallbackApiUrl = 'https://latest.currency-api.pages.dev/v1';

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

function updateFlag(selectElement, imgElement) {
    const currencyCode = selectElement.value.toUpperCase();
    let countryCode = currencyCode.substring(0, 2);
    const specialCases = { 'EUR': 'EU', 'ANG': 'NL', 'XCD': 'AG', 'XAF': 'CM', 'XOF': 'SN', 'CUP': 'CU', 'GGP': 'GG', 'IMP': 'IM', 'JEP': 'JE', 'KID': 'KI', 'TVD': 'TV' };
    if (specialCases[currencyCode]) countryCode = specialCases[currencyCode];
    imgElement.src = `https://flagsapi.com/${countryCode}/flat/64.png`;
    imgElement.style.display = 'block';
    imgElement.onerror = () => { imgElement.style.display = 'none'; };
}

async function populateCurrencies() {
    showLoader();
    try {
        const currencies = await fetchWithFallback('/currencies.json');
        for (const [code, name] of Object.entries(currencies)) {
            const option1 = document.createElement('option');
            option1.value = code;
            option1.textContent = `${code.toUpperCase()} - ${name}`;
            fromCurrencyEl.appendChild(option1);
            const option2 = option1.cloneNode(true);
            toCurrencyEl.appendChild(option2);
        }
        fromCurrencyEl.value = 'usd';
        toCurrencyEl.value = 'eur';
        updateFlag(fromCurrencyEl, fromFlagEl);
        updateFlag(toCurrencyEl, toFlagEl);
        await convertCurrency();
    } catch (error) {
        console.error('Error populating currencies:', error);
        showError('Could not load currency list. Check network and try again.');
    } finally {
        hideLoader();
    }
}

async function convertCurrency() {
    const amount = parseFloat(amountEl.value);
    const fromCurrency = fromCurrencyEl.value;
    const toCurrency = toCurrencyEl.value;
    if (isNaN(amount) || !fromCurrency || !toCurrency) return;
    showLoader();
    hideError();
    resultTextEl.textContent = '';
    reverseRateTextEl.textContent = '';
    try {
        const data = await fetchWithFallback(`/currencies/${fromCurrency}.json`);
        const rate = data[fromCurrency][toCurrency];
        if (rate === undefined) throw new Error(`Rate not found for ${fromCurrency} to ${toCurrency}`);
        const convertedAmount = (amount * rate).toFixed(2);
        resultTextEl.textContent = `${amount} ${fromCurrency.toUpperCase()} = ${convertedAmount} ${toCurrency.toUpperCase()}`;
        const reverseRate = (1 / rate).toFixed(4);
        reverseRateTextEl.textContent = `1 ${toCurrency.toUpperCase()} = ${reverseRate} ${fromCurrency.toUpperCase()}`;
        const updateDate = new Date(data.date);
        lastUpdatedEl.textContent = `Last updated: ${updateDate.toLocaleDateString()}`;
    } catch (error) {
        console.error('Error converting currency:', error);
        showError(error.message);
    } finally {
        hideLoader();
    }
}

async function fetchHistoricalData() {
    const fromCurrency = fromCurrencyEl.value;
    const toCurrency = toCurrencyEl.value;
    const dates = [];
    const rates = [];
    showLoader();
    try {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const historicalApiUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateString}/v1/currencies/${fromCurrency}.json`;
            const data = await (await fetch(historicalApiUrl)).json();
            const rate = data[fromCurrency][toCurrency];
            if (rate) {
                dates.push(dateString);
                rates.push(rate);
            }
        }
        renderChart(dates, rates);
    } catch (error) {
        console.error('Error fetching historical data:', error);
        showError('Could not fetch historical data.');
    } finally {
        hideLoader();
    }
}

function renderChart(labels, data) {
    if (historicalChart) {
        historicalChart.destroy();
    }
    historicalChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Exchange Rate (${fromCurrencyEl.value.toUpperCase()} to ${toCurrencyEl.value.toUpperCase()})`,
                data: data,
                borderColor: 'rgba(79, 70, 229, 1)',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}

function showLoader() { loaderEl.style.display = 'block'; }
function hideLoader() { loaderEl.style.display = 'none'; }
function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.style.display = 'block';
    resultTextEl.textContent = '';
    reverseRateTextEl.textContent = '';
    lastUpdatedEl.textContent = '';
}
function hideError() { errorMessageEl.style.display = 'none'; }

// --- Event Listeners ---
amountEl.addEventListener('input', convertCurrency);
fromCurrencyEl.addEventListener('change', () => {
    updateFlag(fromCurrencyEl, fromFlagEl);
    convertCurrency();
});
toCurrencyEl.addEventListener('change', () => {
    updateFlag(toCurrencyEl, toFlagEl);
    convertCurrency();
});
swapButton.addEventListener('click', () => {
    const temp = fromCurrencyEl.value;
    fromCurrencyEl.value = toCurrencyEl.value;
    toCurrencyEl.value = temp;
    updateFlag(fromCurrencyEl, fromFlagEl);
    updateFlag(toCurrencyEl, toFlagEl);
    convertCurrency();
});
copyButton.addEventListener('click', () => {
    const textToCopy = resultTextEl.textContent.split('=')[1]?.trim();
    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy.split(' ')[0])
            .then(() => {
                copyButton.innerHTML = 'Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;
                }, 2000);
            })
            .catch(err => console.error('Failed to copy: ', err));
    }
});
chartToggleButton.addEventListener('click', () => {
    const isHidden = chartContainer.style.maxHeight === '0px' || !chartContainer.style.maxHeight;
    if (isHidden) {
        chartContainer.style.maxHeight = '500px';
        chartToggleButton.textContent = 'Hide Historical Chart';
        fetchHistoricalData();
    } else {
        chartContainer.style.maxHeight = '0px';
        chartToggleButton.textContent = 'Show Historical Chart';
    }
});

document.addEventListener('DOMContentLoaded', populateCurrencies);
