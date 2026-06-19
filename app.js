let animeList = JSON.parse(localStorage.getItem('myAnimeList')) || [];

const grid = document.getElementById('animeGrid');
const modal = document.getElementById('animeModal');
const form = document.getElementById('animeForm');
const statusSelect = document.getElementById('status');
const dateContainer = document.getElementById('dateContainer');
const epContainer = document.getElementById('epContainer');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const editIdInput = document.getElementById('editId');
const modalTitle = document.getElementById('modalTitle');

// Abrir formulario para un anime NUEVO
document.getElementById('btnOpenForm').addEventListener('click', () => {
    form.reset();
    editIdInput.value = ''; // Limpiamos el ID oculto
    modalTitle.textContent = 'Nuevo Anime';
    dateContainer.style.display = 'none';
    epContainer.style.display = 'block';
    modal.showModal();
});

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

document.getElementById('btnCancel').addEventListener('click', () => {
    form.reset();
    modal.close();
});

statusSelect.addEventListener('change', (e) => {
    if (e.target.value === 'proximamente') {
        dateContainer.style.display = 'block';
        epContainer.style.display = 'none';
    } else {
        dateContainer.style.display = 'none';
        epContainer.style.display = 'block';
    }
});

// Guardar (crear o editar)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('coverFile');
    const idToEdit = editIdInput.value;
    let finalCoverUrl = '';

    // Si el usuario subió un archivo, lo procesamos
    if (fileInput.files.length > 0) {
        finalCoverUrl = await fileToBase64(fileInput.files[0]);
    }

    if (idToEdit) {
        // EDITANDO
        const anime = animeList.find(a => a.id === idToEdit);
        if (anime) {
            anime.title = document.getElementById('title').value.trim();
            // Si subió foto nueva, la cambia; si no, deja la que estaba
            if (finalCoverUrl) anime.coverUrl = finalCoverUrl;
            anime.status = statusSelect.value;
            anime.episode = parseInt(document.getElementById('episode').value) || 0;
            anime.releaseDate = document.getElementById('releaseDate').value || null;
        }
    } else {
        // CREANDO
        const newAnime = {
            id: Date.now().toString(),
            title: document.getElementById('title').value.trim(),
            // Si no subió foto, usa una por defecto de placehold.co
            coverUrl: finalCoverUrl || 'https://placehold.co/220x300/1a1a1a/a0a0a0?text=Falta+Imagen', 
            status: statusSelect.value,
            episode: parseInt(document.getElementById('episode').value) || 0,
            releaseDate: document.getElementById('releaseDate').value || null
        };
        animeList.push(newAnime);
    }

    saveData();
    renderGrid();
    form.reset();
    modal.close();
});

searchInput.addEventListener('input', renderGrid);
filterStatus.addEventListener('change', renderGrid);

window.updateEpisode = function(id, increment) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        anime.episode += increment;
        if (anime.episode < 0) anime.episode = 0;
        saveData();
        renderGrid();
    }
};

window.updateDate = function(id, newDate) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        anime.releaseDate = newDate;
        saveData();
    }
};

window.changeStatus = function(id, newStatus) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        anime.status = newStatus;
        saveData();
        renderGrid();
    }
};

// NUEVA FUNCION: Cargar datos en el formulario para editar
window.editAnime = function(id) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        editIdInput.value = anime.id;
        modalTitle.textContent = 'Editar Anime';
        document.getElementById('title').value = anime.title;
        // Le quitamos el "previews/" para que solo veas el nombre del archivo en el input
        document.getElementById('coverName').value = anime.coverUrl.replace('previews/', '');
        
        statusSelect.value = anime.status;
        document.getElementById('episode').value = anime.episode;
        document.getElementById('releaseDate').value = anime.releaseDate || '';
        
        // Forzamos el evento change para que muestre los campos correctos (fecha o capítulos)
        statusSelect.dispatchEvent(new Event('change'));
        
        modal.showModal();
    }
};

// NUEVA FUNCION: Duplicar un anime
window.duplicateAnime = function(id) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        const duplicate = {
            ...anime,
            id: Date.now().toString(), // Generamos un ID nuevo
            title: anime.title + ' (Copia)' // Le agregamos "(Copia)" para diferenciarlo
        };
        animeList.push(duplicate);
        saveData();
        renderGrid();
    }
};

window.deleteAnime = function(id) {
    if (confirm('¿Querés eliminar este anime de la lista?')) {
        animeList = animeList.filter(a => a.id !== id);
        saveData();
        renderGrid();
    }
};

function saveData() {
    localStorage.setItem('myAnimeList', JSON.stringify(animeList));
}

function renderGrid() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedFilter = filterStatus.value;

    grid.innerHTML = '';

    const filteredList = animeList.filter(anime => {
        const matchesSearch = anime.title.toLowerCase().includes(searchTerm);
        const matchesFilter = selectedFilter === 'todos' || anime.status === selectedFilter;
        return matchesSearch && matchesFilter;
    });

    if (filteredList.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-secondary); text-align: center; padding: 40px 0;">No se encontraron elementos en la lista.</p>`;
        return;
    }

    filteredList.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';

        let dynamicControls = '';
        
        if (anime.status === 'proximamente') {
            dynamicControls = `
                <div class="date-control">
                    <label>Fecha Estreno:</label>
                    <input type="date" value="${anime.releaseDate || ''}" onchange="updateDate('${anime.id}', this.value)">
                </div>
            `;
        } else {
            dynamicControls = `
                <div class="ep-control">
                    <span>Capítulo: <strong>${anime.episode}</strong></span>
                    <div class="ep-buttons">
                        <button onclick="updateEpisode('${anime.id}', -1)">-</button>
                        <button onclick="updateEpisode('${anime.id}', 1)">+</button>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <img src="${anime.coverUrl}" alt="Portada de ${anime.title}" onerror="this.src='https://placehold.co/220x300/1a1a1a/a0a0a0?text=Falta+Imagen'">
            <div class="card-content">
                <h3>${anime.title}</h3>
                <select onchange="changeStatus('${anime.id}', this.value)">
                    <option value="viendo" ${anime.status === 'viendo' ? 'selected' : ''}>Viendo</option>
                    <option value="proximamente" ${anime.status === 'proximamente' ? 'selected' : ''}>Próximamente</option>
                    <option value="finalizado" ${anime.status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                </select>
                ${dynamicControls}
                
                <div class="card-actions">
                    <button class="btn-edit" onclick="editAnime('${anime.id}')">Editar</button>
                    <button class="btn-duplicate" onclick="duplicateAnime('${anime.id}')">Duplicar</button>
                    <button class="btn-delete" onclick="deleteAnime('${anime.id}')">Eliminar</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

renderGrid();