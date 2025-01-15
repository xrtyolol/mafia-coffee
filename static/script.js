// Прелоадер
window.addEventListener('load', function() {
    const preloader = document.querySelector('.preloader');
    setTimeout(() => {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }, 1500);
});

document.addEventListener('DOMContentLoaded', function() {
    // Получаем все кнопки фильтров и элементы меню
    const filterButtons = document.querySelectorAll('.filter-btn');
    const menuItems = document.querySelectorAll('.menu-item');

    // Функция для фильтрации элементов
    function filterItems(category) {
        console.log('Filtering category:', category); // Отладочный вывод
        
        menuItems.forEach(item => {
            const itemCategory = item.getAttribute('data-category');
            console.log('Item category:', itemCategory); // Отладочный вывод
            
            if (category === 'all' || itemCategory === category) {
                item.style.display = 'block';
                item.style.animation = 'fadeInMenu 0.6s ease forwards';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Добавляем обработчики событий для кнопок
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Button clicked:', this.getAttribute('data-filter')); // Отладочный вывод
            
            // Удаляем активный класс у всех кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Добавляем активный класс нажатой кнопке
            this.classList.add('active');
            
            // Получаем категорию из data-атрибута
            const category = this.getAttribute('data-filter');
            
            // Фильтруем элементы
            filterItems(category);
        });
    });

    // Активируем фильтр "Все" при загрузке страницы
    filterItems('all');

    // Ленивая загрузка изображений
    const lazyImages = document.querySelectorAll('img.lazy');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
});

// Бургер-меню
const burgerMenu = document.querySelector('.burger-menu');
const navLinks = document.querySelector('.nav-links');
const body = document.body;

if (burgerMenu && navLinks) {
    burgerMenu.addEventListener('click', () => {
        burgerMenu.classList.toggle('active');
        navLinks.classList.toggle('active');
        body.classList.toggle('menu-open');
    });

    // Закрытие меню при клике на ссылку
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            burgerMenu.classList.remove('active');
            navLinks.classList.remove('active');
            body.classList.remove('menu-open');
        });
    });

    // Закрытие меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-links') && 
            !e.target.closest('.burger-menu') && 
            navLinks.classList.contains('active')) {
            burgerMenu.classList.remove('active');
            navLinks.classList.remove('active');
            body.classList.remove('menu-open');
        }
    });

    // Закрытие меню при изменении размера окна
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
            burgerMenu.classList.remove('active');
            navLinks.classList.remove('active');
            body.classList.remove('menu-open');
        }
    });
}

// Плавная прокрутка
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 70,
                behavior: 'smooth'
            });
        }
    });
});

// Кнопка прокрутки вверх
const scrollButton = document.createElement('div');
scrollButton.className = 'scroll-to-top';
scrollButton.innerHTML = '↑';
document.body.appendChild(scrollButton);

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

scrollButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Загрузка и отображение меню
async function loadMenu() {
    try {
        const response = await fetch('/api/menu');
        const menuItems = await response.json();
        
        const menuGrid = document.querySelector('.menu-grid');
        menuGrid.innerHTML = ''; // Очищаем текущее меню
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.setAttribute('data-category', item.category);
            
            menuItem.innerHTML = `
                <div class="menu-item-image-container">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="menu-item-content">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <div class="menu-item-footer">
                        <span class="price">${item.price} ₴</span>
                    </div>
                </div>
            `;
            
            menuGrid.appendChild(menuItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки меню:', error);
    }
}

// Фильтрация меню
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const menuItems = document.querySelectorAll('.menu-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Убираем активный класс у всех кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Добавляем активный класс нажатой кнопке
            button.classList.add('active');
            
            const category = button.getAttribute('data-filter');
            
            menuItems.forEach(item => {
                if (category === 'all') {
                    item.style.display = '';
                } else {
                    const itemCategory = item.getAttribute('data-category');
                    item.style.display = itemCategory === category ? '' : 'none';
                }
            });
        });
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadMenu();
    setupFilters();
    
    // Активируем фильтр "Все" по умолчанию
    const defaultFilter = document.querySelector('[data-filter="all"]');
    if (defaultFilter) {
        defaultFilter.click();
    }
}); 