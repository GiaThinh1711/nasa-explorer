const APOD_URL = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';
const IOTD_URL = 'https://www.nasa.gov/wp-json/wp/v2/image-article?_embed&per_page=30';

function addLine(parent, tag, text, className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.classList.add(className);
    parent.append(element);
    return element;
}

function getNasaImage(item) {
    if (item._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
        return item._embedded['wp:featuredmedia'][0].source_url;
    }
    if (item.yoast_head_json?.og_image?.[0]?.url) {
        return item.yoast_head_json.og_image[0].url;
    }
    const div = document.createElement('div');
    div.innerHTML = item.content?.rendered || '';
    return div.querySelector('img')?.src || '';
}

async function loadGallery(gridEl, query = '') {
    gridEl.textContent = 'Loading NASA Image of the Day...';
    const url = query
        ? `${IOTD_URL}&search=${encodeURIComponent(query)}`
        : IOTD_URL;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const items = await response.json();
        gridEl.innerHTML = '';

        if (items.length === 0) {
            addLine(gridEl, 'p', `No images found for "${query}".`);
            return;
        }

        for (const item of items) {
            const imgUrl = getNasaImage(item);
            if (!imgUrl) continue;

            const card = document.createElement('article');
            card.classList.add('grid-item');

            const titleParser = document.createElement('div');
            titleParser.innerHTML = item.title.rendered;
            const cleanTitle = titleParser.textContent;

            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = cleanTitle;
            img.loading = 'lazy';
            card.append(img);

            const overlay = document.createElement('div');
            overlay.classList.add('item-overlay');
            addLine(overlay, 'h4', cleanTitle);
            addLine(overlay, 'small', item.date.split('T')[0]);

            card.append(overlay);
            gridEl.append(card);
        }
    } catch (error) {
        gridEl.innerHTML = '';
        addLine(gridEl, 'p', `Error: ${error.message}`, 'error');
    }
}

async function loadAPOD(container) {
    container.textContent = 'Loading today\'s picture...';
    const url = `${APOD_URL}?api_key=${NASA_API_KEY}`;

    try {
        const response = await fetch(url);
        if (response.status === 403) throw new Error('NASA rejected the API key. Check config.js.');
        if (response.status === 429) throw new Error('Too many requests. Wait an hour and try again.');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const rawData = await response.json();
        const data = Array.isArray(rawData) ? rawData[0] : rawData;

        container.innerHTML = '';

        const mediaDiv = document.createElement('div');
        mediaDiv.classList.add('apod-media');

        if (data.media_type === 'video') {
            const iframe = document.createElement('iframe');
            iframe.src = data.url;
            iframe.title = data.title;
            iframe.allowFullscreen = true;
            mediaDiv.append(iframe);
        } else {
            const img = document.createElement('img');
            img.src = data.hdurl || data.url;
            img.alt = data.alt || data.title;
            mediaDiv.append(img);
        }

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('apod-info');

        addLine(infoDiv, 'h3', data.title);
        addLine(infoDiv, 'span', data.date, 'date');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.explanation;
        addLine(infoDiv, 'p', tempDiv.textContent);

        container.append(mediaDiv, infoDiv);
    } catch (error) {
        container.innerHTML = '';
        addLine(container, 'p', `Error: ${error.message}`, 'error');
    }
}

async function main() {
    const apodContainer = document.querySelector('#apod-container');
    const galleryGrid = document.querySelector('#gallery-grid');
    const galleryTitle = document.querySelector('#gallery-title');
    const searchForm = document.querySelector('#search-form');
    const searchInput = document.querySelector('#search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');

    if (typeof NASA_API_KEY === 'undefined') {
        apodContainer.textContent = 'No API key found. Copy config.example.js to config.js and add your key.';
        return;
    }

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const keyword = searchInput.value.trim();
        if (keyword) {
            galleryTitle.textContent = `Search Results for "${keyword}"`;
            loadGallery(galleryGrid, keyword);
        }
    });

    filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.query;
            galleryTitle.textContent = `Space Category: ${btn.textContent}`;
            loadGallery(galleryGrid, category);
        });
    });

    await loadAPOD(apodContainer);
    await loadGallery(galleryGrid);
}

main();