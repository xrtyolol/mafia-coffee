from flask import Flask, send_from_directory, send_file, jsonify, request, render_template, redirect, url_for, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import os
import time
import logging
from logging.handlers import RotatingFileHandler
import gzip
import functools
from datetime import datetime
import uuid

# Настройка логирования
if not os.path.exists('logs'):
    os.makedirs('logs')

formatter = logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s'
)

file_handler = RotatingFileHandler(
    'logs/app.log', 
    maxBytes=10000000,  # 10MB
    backupCount=5
)
file_handler.setFormatter(formatter)

logger = logging.getLogger(__name__)
logger.addHandler(file_handler)
logger.setLevel(logging.INFO)

# Инициализация приложения
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///menu.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/images/menu'

# Отключаем кеширование статических файлов
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Инициализация расширений
db = SQLAlchemy(app)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
login_manager = LoginManager(app)
login_manager.login_view = 'admin_login'

# Модели базы данных
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

class MenuItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    image = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Функции-помощники
def cache_control(max_age):
    def decorator(view):
        @functools.wraps(view)
        def wrapped(*args, **kwargs):
            response = view(*args, **kwargs)
            response.headers['Cache-Control'] = f'public, max-age={max_age}'
            return response
        return wrapped
    return decorator

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Разрешенные расширения файлов
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Маршруты
@app.route('/')
@app.route('/index')
def index():
    menu_items = MenuItem.query.all()
    return render_template('index.html', menu_items=menu_items)

@app.route('/static/fonts/<path:filename>')
def serve_fonts(filename):
    try:
        return send_from_directory('static/fonts', filename)
    except Exception as e:
        logger.error(f'Error serving font {filename}: {str(e)}')
        return jsonify({'error': 'Font not found'}), 404

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

# Маршруты для админ-панели
@app.route('/admin/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            logger.info(f'Successful login for user: {username}')
            return redirect(url_for('admin_dashboard'))
        
        logger.warning(f'Failed login attempt for username: {username}')
        return 'Invalid credentials', 401
    
    return render_template('admin/login.html')

@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    menu_items = MenuItem.query.all()
    return render_template('admin/dashboard.html', menu_items=menu_items)

@app.route('/admin/add-item', methods=['POST'])
@login_required
def add_item():
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'Не вибрано зображення'})
        
    file = request.files['image']
    name = request.form.get('name')
    description = request.form.get('description')
    price = request.form.get('price')
    category = request.form.get('category')
    
    if not all([name, description, price, category]):
        return jsonify({'success': False, 'message': 'Всі поля обов\'язкові'})
    
    if file and allowed_file(file.filename):
        # Генерируем уникальное имя файла
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
        
        # Сохраняем файл
        file_path = os.path.join('static', 'images', 'menu', unique_filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        file.save(file_path)
        
        # Создаем новое блюдо
        new_item = MenuItem(
            name=name,
            description=description,
            price=float(price),
            image=f"images/menu/{unique_filename}",
            category=category
        )
        
        try:
            db.session.add(new_item)
            db.session.commit()
            return jsonify({'success': True})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)})
    
    return jsonify({'success': False, 'message': 'Недопустимий формат файлу'})

@app.route('/admin/edit-item/<int:item_id>', methods=['POST'])
@login_required
def edit_menu_item(item_id):
    try:
        item = MenuItem.query.get_or_404(item_id)
        
        item.name = request.form.get('name', item.name)
        item.description = request.form.get('description', item.description)
        item.price = float(request.form.get('price', item.price))
        item.category = request.form.get('category', item.category)

        image = request.files.get('image')
        if image:
            filename = secure_filename(image.filename)
            image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            item.image = f'images/menu/{filename}'

        db.session.commit()
        logger.info(f'Menu item updated: {item.name}')
        return jsonify({'success': True, 'message': 'Item updated successfully'})
    except Exception as e:
        logger.error(f'Error updating menu item: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/admin/delete-item/<int:item_id>', methods=['POST'])
@login_required
def delete_menu_item(item_id):
    try:
        item = MenuItem.query.get_or_404(item_id)
        db.session.delete(item)
        db.session.commit()
        logger.info(f'Menu item deleted: {item.name}')
        return jsonify({'success': True, 'message': 'Item deleted successfully'})
    except Exception as e:
        logger.error(f'Error deleting menu item: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    return redirect(url_for('admin_login'))

# API для меню
@app.route('/api/menu')
def get_menu():
    menu_items = MenuItem.query.all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'description': item.description,
        'price': item.price,
        'image': item.image,
        'category': item.category
    } for item in menu_items])

@app.after_request
def add_header(response):
    # Принудительно отключаем кеширование для всех ответов
    response.direct_passthrough = False
    if 'Cache-Control' not in response.headers:
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                password_hash=generate_password_hash('your-password-here')
            )
            db.session.add(admin)
            db.session.commit()
            logger.info('Admin user created')
    
    ssl_context = None
    if os.path.exists('cert.pem') and os.path.exists('key.pem'):
        ssl_context = ('cert.pem', 'key.pem')
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True,
        ssl_context=ssl_context,
        use_reloader=True
    )