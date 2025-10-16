document.addEventListener('DOMContentLoaded', () => {

    // --- MODELO DE DATOS ---
    const sections = {
        museo: {
            name: "Recorrido Museo",
            path: "assets/museo/",
            images: ['Entrada.png', 'Entrada1.1.png', 'Entrada1.2.png', 'Entrada1.3.png', 'Izquierda.png', ...Array.from({ length: 37 }, (_, i) => `Izquierda1.${i + 1}.png`), 'Izquierda2.0.png', 'Izquierda2.1.png', 'Izquierda2.2.png', 'Izquierda3.0.png', ...Array.from({ length: 40 }, (_, i) => `Izquierda3.${i + 1}.png`)]
        },
        heroes: {
            name: "Héroes",
            path: "assets/heroes/",
            images: ['heroe_1.jpg', 'heroe_2.jpg']
        },
        historia: {
            name: "Historia",
            path: "assets/historia/",
            images: ['evento_1.jpg', 'evento_2.jpg', 'evento_3.jpg']
        }
    };

    const arrowKeyframes = {
        0: [50, 85], 10: [55, 80], 25: [65, 75], 40: [75, 80],
        55: [60, 85], 70: [50, 80], 85: [45, 85],
    };

    // --- ELEMENTOS DEL DOM ---
    const canvas = document.getElementById('main-canvas');
    const context = canvas.getContext('2d');
    const selector = document.getElementById('section-selector');
    const timelineScrubber = document.getElementById('timeline-scrubber');
    const prevButton = document.getElementById('prev-image');
    const nextButton = document.getElementById('next-image');

    // --- ESTADO DE LA APLICACIÓN ---
    let currentState = { section: 'museo', index: 0 };
    let images = [];
    let transform = { x: 0, y: 0, zoom: 1 };
    let isDragging = false, isTransitioning = false;
    let lastMouse = { x: 0, y: 0 };

    // --- FUNCIONES PRINCIPALES ---

    function populateDropdown() {
        for (const [id, data] of Object.entries(sections)) {
            selector.add(new Option(data.name, id));
        }
    }

    function loadSection(sectionId) {
        currentState = { section: sectionId, index: 0 };
        transform = { x: 0, y: 0, zoom: 1 };
        images = [];
        timelineScrubber.innerHTML = '';

        // Muestra u oculta la flecha dinámica
        nextButton.style.transition = (sectionId === 'museo') ? 'left 0.5s ease-in-out, top 0.5s ease-in-out' : 'none';
        nextButton.style.display = (sectionId === 'museo') ? 'block' : 'none';

        const section = sections[sectionId];
        const imagePromises = section.images.map((imgName, index) => new Promise(resolve => {
            const img = new Image();
            img.src = section.path + imgName;
            img.onload = () => {
                images[index] = img;
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail';
                thumb.style.backgroundImage = `url(${img.src})`;
                thumb.dataset.index = index;
                timelineScrubber.appendChild(thumb);
                thumb.addEventListener('click', () => changeImage(index));
                resolve();
            };
        }));

        Promise.all(imagePromises).then(() => changeImage(0, false));
    }

    function changeImage(index, withTransition = true) {
        if (isTransitioning) return;
        const oldIndex = currentState.index;
        currentState.index = index;
        transform = { x: 0, y: 0, zoom: 1 };

        if (currentState.section === 'museo') updateArrowPosition();

        if (!withTransition) {
            render();
            updateActiveThumbnail();
            return;
        }

        isTransitioning = true;
        let startTime = null;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / 500, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.globalAlpha = 1 - ease;
            if (images[oldIndex]) renderImage(images[oldIndex]);
            context.globalAlpha = ease;
            if (images[currentState.index]) renderImage(images[currentState.index]);
            if (progress < 1) requestAnimationFrame(animate);
            else { isTransitioning = false; context.globalAlpha = 1; render(); updateActiveThumbnail(); }
        };
        requestAnimationFrame(animate);
    }

    function updateActiveThumbnail() {
        document.querySelectorAll('.thumbnail').forEach((thumb, idx) => {
            const isActive = idx === currentState.index;
            thumb.classList.toggle('active', isActive);
            if (isActive) thumb.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        });
    }

    function updateArrowPosition() {
        const keys = Object.keys(arrowKeyframes).map(Number);
        let prevKey = keys.filter(k => k <= currentState.index).pop() ?? keys[0];
        let nextKey = keys.find(k => k > currentState.index) ?? keys[keys.length - 1];
        const prevPos = arrowKeyframes[prevKey];
        const nextPos = arrowKeyframes[nextKey];
        const interval = nextKey - prevKey;
        const progress = (interval === 0) ? 1 : (currentState.index - prevKey) / interval;
        const x = prevPos[0] + (nextPos[0] - prevPos[0]) * progress;
        const y = prevPos[1] + (nextPos[1] - prevPos[1]) * progress;
        nextButton.style.left = `${x}%`;
        nextButton.style.top = `${y}%`;
    }

    function render() { /* ... (sin cambios) ... */ }
    function renderImage(img) { /* ... (sin cambios) ... */ }
    function getTransformedRect(img) { /* ... (sin cambios) ... */ }

    // --- RENDERIZADO Y EVENTOS (la mayoría sin cambios) ---
    
    function render() {
        if (isTransitioning) return;
        const img = images[currentState.index];
        if (!img) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        renderImage(img);
    }

    function renderImage(img) {
        const rect = getTransformedRect(img);
        context.drawImage(img, rect.x, rect.y, rect.width, rect.height);
    }

    function getTransformedRect(img) {
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio) * transform.zoom;
        const w = img.width * ratio, h = img.height * ratio;
        return { x: transform.x + (canvas.width - w) / 2, y: transform.y + (canvas.height - h) / 2, width: w, height: h };
    }

    selector.addEventListener('change', (e) => loadSection(e.target.value));
    prevButton.addEventListener('click', () => changeImage((currentState.index - 1 + images.length) % images.length));
    nextButton.addEventListener('click', () => {
        if (currentState.section !== 'museo') {
            changeImage((currentState.index + 1) % images.length);
        } else {
            // La lógica de la flecha dinámica ya está en changeImage
            changeImage((currentState.index + 1) % images.length);
        }
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        if (isTransitioning) return;
        const oldZoom = transform.zoom;
        transform.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
        transform.zoom = Math.max(1, Math.min(transform.zoom, 5));
        const rect = canvas.getBoundingClientRect();
        transform.x = (e.clientX - rect.left - transform.x) * (transform.zoom / oldZoom) + transform.x - (e.clientX - rect.left);
        transform.y = (e.clientY - rect.top - transform.y) * (transform.zoom / oldZoom) + transform.y - (e.clientY - rect.top);
        render();
    });

    canvas.addEventListener('mousedown', e => {
        if (isTransitioning || transform.zoom <= 1) return;
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('mousemove', e => {
        if (!isDragging || isTransitioning) return;
        transform.x += e.clientX - lastMouse.x;
        transform.y += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        render();
    });

    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; render(); });

    // --- INICIALIZACIÓN ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    populateDropdown();
    loadSection('museo');
});
