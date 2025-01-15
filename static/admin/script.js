// Функция для открытия модального окна редактирования
function openEditModal(itemId, name, description, price, category) {
    // Закрываем предыдущее модальное окно, если оно существует
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Редагувати страву</h2>
            <form id="editItemForm">
                <div class="form-group">
                    <label>Назва</label>
                    <input type="text" name="name" value="${name}" required>
                </div>
                <div class="form-group">
                    <label>Опис</label>
                    <textarea name="description" required>${description}</textarea>
                </div>
                <div class="form-group">
                    <label>Ціна</label>
                    <input type="number" name="price" value="${price}" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Категорія</label>
                    <select name="category" required>
                        <option value="pizza" ${category === 'pizza' ? 'selected' : ''}>Піца</option>
                        <option value="sushi" ${category === 'sushi' ? 'selected' : ''}>Суші</option>
                        <option value="snacks" ${category === 'snacks' ? 'selected' : ''}>Закуски</option>
                        <option value="salads" ${category === 'salads' ? 'selected' : ''}>Салати</option>
                        <option value="burgers" ${category === 'burgers' ? 'selected' : ''}>Бургери</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Нове зображення (необов'язково)</label>
                    <input type="file" name="image" accept="image/*">
                </div>
                <button type="submit">Зберегти зміни</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Закрытие модального окна
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = () => {
        modal.remove();
    };

    // Обработка формы редактирования
    const form = modal.querySelector('#editItemForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        try {
            const response = await fetch(`/admin/edit-item/${itemId}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                alert('Страва успішно оновлена!');
                location.reload();
            } else {
                alert('Помилка: ' + data.message);
            }
        } catch (error) {
            alert('Помилка при оновленні страви');
        }
    };

    // Добавляем обработчик клика вне модального окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Добавляем обработчик клавиши Escape
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

// Обработчики событий для кнопок
document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = () => {
        const item = btn.closest('.menu-item');
        const itemId = item.dataset.id;
        const name = item.querySelector('h3').textContent;
        const description = item.querySelector('p').textContent;
        const price = item.querySelector('.price').textContent.replace(' ₴', '');
        const category = item.dataset.category;

        openEditModal(itemId, name, description, price, category);
    };
});

document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
        if (confirm('Ви впевнені, що хочете видалити цю страву?')) {
            const itemId = btn.closest('.menu-item').dataset.id;

            try {
                const response = await fetch(`/admin/delete-item/${itemId}`, {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    btn.closest('.menu-item').remove();
                } else {
                    alert('Помилка: ' + data.message);
                }
            } catch (error) {
                alert('Помилка при видаленні страви');
            }
        }
    };
});

// Обработчик формы добавления блюда
document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('newItemName').value);
    formData.append('description', document.getElementById('newItemDescription').value);
    formData.append('price', document.getElementById('newItemPrice').value);
    formData.append('category', document.getElementById('newItemCategory').value);
    
    const imageFile = document.getElementById('newItemImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch('/admin/add-item', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('Страва успішно додана!');
            location.reload();
        } else {
            alert('Помилка: ' + (data.message || 'Невідома помилка'));
        }
    } catch (error) {
        console.error('Помилка:', error);
        alert('Помилка при додаванні страви');
    }
}); 