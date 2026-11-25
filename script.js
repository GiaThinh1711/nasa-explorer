const APOD_URL = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";
const IOTD_URL =
  "https://www.nasa.gov/wp-json/wp/v2/image-article?_embed&per_page=30";

function addLine(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.classList.add(className);
  parent.append(element);
  return element;
}

function getNasaImage(item) {
  if (item._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
    return item._embedded["wp:featuredmedia"][0].source_url;
  }
  if (item.yoast_head_json?.og_image?.[0]?.url) {
    return item.yoast_head_json.og_image[0].url;
  }
  const div = document.createElement("div");
  div.innerHTML = item.content?.rendered || "";
  return div.querySelector("img")?.src || "";
}

function getEmbedVideoUrl(rawUrl) {
    if (!rawUrl) return '';
    if (rawUrl.includes('youtube.com/watch?v=')) {
        const videoId = rawUrl.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (rawUrl.includes('youtu.be/')) {
        const videoId = rawUrl.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return rawUrl;
}

async function loadGallery(gridEl, query = "") {
  gridEl.textContent = "Loading NASA Image of the Day...";
  const url = query
    ? `${IOTD_URL}&search=${encodeURIComponent(query)}`
    : IOTD_URL;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const items = await response.json();
    gridEl.innerHTML = "";

    if (items.length === 0) {
      addLine(gridEl, "p", `No images found for "${query}".`);
      return;
    }

    for (const item of items) {
      const imgUrl = getNasaImage(item);
      if (!imgUrl) continue;

      const card = document.createElement("article");
      card.classList.add("grid-item");

      const titleParser = document.createElement("div");
      titleParser.innerHTML = item.title.rendered;
      const cleanTitle = titleParser.textContent;

      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = cleanTitle;
      img.loading = "lazy";
      card.append(img);

      const overlay = document.createElement("div");
      overlay.classList.add("item-overlay");
      addLine(overlay, "h4", cleanTitle);
      addLine(overlay, "small", item.date.split("T")[0]);

      card.append(overlay);
      gridEl.append(card);
    }
  } catch (error) {
    gridEl.innerHTML = "";
    addLine(gridEl, "p", `Error: ${error.message}`, "error");
  }
}

async function loadAPOD(container) {
  container.textContent = "Loading today's picture...";
  const url = `${APOD_URL}?api_key=${NASA_API_KEY}`;

  try {
    const response = await fetch(url);
    if (response.status === 403)
      throw new Error("NASA rejected the API key. Check config.js.");
    if (response.status === 429)
      throw new Error("Too many requests. Wait an hour and try again.");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const rawData = await response.json();
    const data = Array.isArray(rawData) ? rawData[0] : rawData;

    container.innerHTML = "";

    const mediaDiv = document.createElement("div");
    mediaDiv.classList.add("apod-media");

    const mediaUrl = data.hdurl || data.url || "";
    const isEmbedIframe = /youtube\.com|youtu\.be|vimeo\.com/i.test(mediaUrl);
    const isDirectVideo =
      data.media_type === "video" ||
      /assets\.science\.nasa\.gov|\.mp4|\.webm|\.mov/i.test(mediaUrl);

    if (isEmbedIframe) {
      const iframe = document.createElement("iframe");
      iframe.src = getEmbedVideoUrl(mediaUrl);
      iframe.title = data.title || "NASA APOD Video";
      iframe.allowFullscreen = true;
      iframe.style.width = "100%";
      iframe.style.aspectRatio = "16 / 9";
      iframe.style.border = "none";
      mediaDiv.append(iframe);
    } else if (isDirectVideo) {
      const video = document.createElement("video");
      video.src = mediaUrl;
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      if (data.thumbnail_url) video.poster = data.thumbnail_url;
      video.style.width = "100%";
      video.style.borderRadius = "8px";

      video.onerror = () => {
        mediaDiv.innerHTML = "";
        if (data.thumbnail_url) {
          const fallbackImg = document.createElement("img");
          fallbackImg.src = data.thumbnail_url;
          fallbackImg.alt = data.title;
          mediaDiv.append(fallbackImg);
        }
        const link = document.createElement("a");
        link.href = mediaUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "▶ Watch Original Video on NASA";
        link.style.display = "inline-block";
        link.style.marginTop = "12px";
        link.style.padding = "10px 16px";
        link.style.backgroundColor = "#0b3d91";
        link.style.color = "#ffffff";
        link.style.borderRadius = "6px";
        link.style.textDecoration = "none";
        link.style.fontWeight = "bold";
        mediaDiv.append(link);
      };

      mediaDiv.append(video);
    } else {
      const img = document.createElement("img");
      img.src = mediaUrl;
      img.alt = data.alt || data.title;
      img.onerror = () => {
        if (data.url && img.src !== data.url) {
          img.src = data.url;
        } else if (data.thumbnail_url && img.src !== data.thumbnail_url) {
          img.src = data.thumbnail_url;
        }
      };
      mediaDiv.append(img);
    }

    const infoDiv = document.createElement("div");
    infoDiv.classList.add("apod-info");

    addLine(infoDiv, "h3", data.title);
    addLine(infoDiv, "span", data.date, "date");

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = data.explanation;
    addLine(infoDiv, "p", tempDiv.textContent);

    container.append(mediaDiv, infoDiv);
  } catch (error) {
    container.innerHTML = "";
    addLine(container, "p", `Error: ${error.message}`, "error");
  }
}

async function main() {
  const apodContainer = document.querySelector("#apod-container");
  const galleryGrid = document.querySelector("#gallery-grid");
  const galleryTitle = document.querySelector("#gallery-title");
  const searchForm = document.querySelector("#search-form");
  const searchInput = document.querySelector("#search-input");
  const filterButtons = document.querySelectorAll(".filter-btn");

  if (typeof NASA_API_KEY === "undefined") {
    apodContainer.textContent =
      "No API key found. Copy config.example.js to config.js and add your key.";
    return;
  }

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const keyword = searchInput.value.trim();
    if (keyword) {
      galleryTitle.textContent = `Search Results for "${keyword}"`;
      loadGallery(galleryGrid, keyword);
    }
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.query;
      galleryTitle.textContent = `Space Category: ${btn.textContent}`;
      loadGallery(galleryGrid, category);
    });
  });

  await loadAPOD(apodContainer);
  await loadGallery(galleryGrid);
}

main();
