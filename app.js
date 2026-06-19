// ====== CONFIGURACIÓN DE FIREBASE ======
const firebaseConfig = {
  apiKey: "AIzaSyBlyIgJ7n0puBqIYyc-RD5xKsycLY5vLuY",
  authDomain: "lista-anime-bec07.firebaseapp.com",
  databaseURL: "https://lista-anime-bec07-default-rtdb.firebaseio.com",
  projectId: "lista-anime-bec07",
  storageBucket: "lista-anime-bec07.firebasestorage.app",
  messagingSenderId: "1074858855317",
  appId: "1:1074858855317:web:c538ea55f79697d068449c"
};

// Inicializamos Firebase y la Realtime Database
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const animeRef = database.ref('animes'); 

// ====== LÓGICA DE LA APP ======
let animeList = [];

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

// ESCUCHAR CAMBIOS EN TIEMPO REAL DESDE LA NUBE
animeRef.on('value', (snapshot) => {
    const data = snapshot.val();
    animeList = [];
    if (data) {
        Object.keys(data).forEach(key => {
            animeList.push({ id: key, ...data[key] });
        });
    }
    renderGrid();
});

// Abrir formulario para un anime NUEVO
document.getElementById('btnOpenForm').addEventListener('click', () => {
    form.reset();
    editIdInput.value = ''; 
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

// Guardar (crear o editar en Firebase)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('coverFile');
    const idToEdit = editIdInput.value;
    let finalCoverUrl = '';

    if (fileInput.files.length > 0) {
        finalCoverUrl = await fileToBase64(fileInput.files[0]);
    }

    if (idToEdit) {
        // ACTUALIZAR EN FIREBASE
        const updates = {
            title: document.getElementById('title').value.trim(),
            status: statusSelect.value,
            episode: parseInt(document.getElementById('episode').value) || 0,
            releaseDate: document.getElementById('releaseDate').value || null
        };
        // Solo cambia la portada si se subió un archivo nuevo
        if (finalCoverUrl) updates.coverUrl = finalCoverUrl;

        await database.ref('animes/' + idToEdit).update(updates);
    } else {
        // CREAR NUEVO EN FIREBASE
        const newAnime = {
            title: document.getElementById('title').value.trim(),
            coverUrl: finalCoverUrl || 'https://placehold.co/220x300/1a1a1a/a0a0a0?text=Falta+Imagen', 
            status: statusSelect.value,
            episode: parseInt(document.getElementById('episode').value) || 0,
            releaseDate: document.getElementById('releaseDate').value || null
        };
        await animeRef.push(newAnime); 
    }

    form.reset();
    modal.close();
});

searchInput.addEventListener('input', renderGrid);
filterStatus.addEventListener('change', renderGrid);

window.updateEpisode = async function(id, increment) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        let newEp = anime.episode + increment;
        if (newEp < 0) newEp = 0;
        await database.ref('animes/' + id).update({ episode: newEp });
    }
};

window.updateDate = async function(id, newDate) {
    await database.ref('animes/' + id).update({ releaseDate: newDate });
};

window.changeStatus = async function(id, newStatus) {
    await database.ref('animes/' + id).update({ status: newStatus });
};

window.editAnime = function(id) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        editIdInput.value = anime.id;
        modalTitle.textContent = 'Editar Anime';
        document.getElementById('title').value = anime.title;
        statusSelect.value = anime.status;
        document.getElementById('episode').value = anime.episode;
        document.getElementById('releaseDate').value = anime.releaseDate || '';
        
        statusSelect.dispatchEvent(new Event('change'));
        modal.showModal();
    }
};

window.duplicateAnime = async function(id) {
    const anime = animeList.find(a => a.id === id);
    if (anime) {
        const duplicate = {
            title: anime.title + ' (Copia)',
            coverUrl: anime.coverUrl,
            status: anime.status,
            episode: anime.episode,
            releaseDate: anime.releaseDate || null
        };
        await animeRef.push(duplicate);
    }
};

window.deleteAnime = async function(id) {
    if (confirm('¿Querés eliminar este anime de la lista?')) {
        await database.ref('animes/' + id).remove();
    }
};

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
        } else if (anime.status === 'finalizado') {
            dynamicControls = `
                <div class="ep-control">
                    <span>✨ ¡Finalizado! (<strong>${anime.episode}</strong> eps)</span>
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
