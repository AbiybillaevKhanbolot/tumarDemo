// Конфигурация API
const BACKEND_API_URL = 'https://tumarbackend.onrender.com'; // Замените на ваш URL Render

// Состояние приложения
const state = {
    currentUser: null,
    currentPage: 'home',
    messages: [],
    isTyping: false,
    authToken: null
};

// DOM Elements
const app = document.getElementById('app');
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const authForm = document.getElementById('authForm');
const switchToRegister = document.getElementById('switchToRegister');

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await checkBackendHealth();
    loadPage('home');
    setupEventListeners();
    checkAuthStatus();
});

// Проверка здоровья бекенда
async function checkBackendHealth() {
    try {
        console.log('🔍 Проверка доступности бекенда...');
        const response = await fetch(`${BACKEND_API_URL}/api/health`);
        const data = await response.json();
        console.log('✅ Бекенд доступен:', data);
        return true;
    } catch (error) {
        console.error('❌ Бекенд недоступен:', error);
        alert('⚠️ Бекенд временно недоступен. Попробуйте позже.');
        return false;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    loginBtn.addEventListener('click', () => authModal.style.display = 'block');
    
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal || e.target.classList.contains('close')) {
            authModal.style.display = 'none';
        }
    });
    
    authForm.addEventListener('submit', handleAuth);
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
}

// Переключение между регистрацией и входом
function toggleAuthMode() {
    const submitBtn = authForm.querySelector('.auth-submit');
    const switchText = authForm.querySelector('.auth-switch');
    const title = authForm.querySelector('h2');
    
    if (submitBtn.textContent === 'Войти') {
        submitBtn.textContent = 'Зарегистрироваться';
        title.textContent = 'Регистрация в Tumar.AI';
        switchText.innerHTML = 'Есть аккаунт? <a href="#" id="switchToLogin">Войти</a>';
        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    } else {
        submitBtn.textContent = 'Войти';
        title.textContent = 'Вход в Tumar.AI';
        switchText.innerHTML = 'Нет аккаунта? <a href="#" id="switchToRegister">Зарегистрироваться</a>';
        document.getElementById('switchToRegister').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    }
}

// Проверка статуса авторизации
function checkAuthStatus() {
    const user = localStorage.getItem('currentUser');
    const token = localStorage.getItem('authToken');
    
    if (user && token) {
        state.currentUser = JSON.parse(user);
        state.authToken = token;
        updateAuthUI();
    }
    
    const messages = localStorage.getItem('chatMessages');
    if (messages) {
        state.messages = JSON.parse(messages);
    }
}

// Обновление UI в зависимости от авторизации
function updateAuthUI() {
    if (state.currentUser) {
        loginBtn.textContent = 'Выйти';
        loginBtn.onclick = handleLogout;
    } else {
        loginBtn.textContent = 'Войти';
        loginBtn.onclick = () => authModal.style.display = 'block';
    }
}

// Обработка авторизации
async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isLogin = e.submitter.textContent === 'Войти';
    
    try {
        const endpoint = isLogin ? '/api/login' : '/api/register';
        console.log(`🔄 Отправка запроса: ${endpoint}`);
        
        const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name: email.split('@')[0] })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка авторизации');
        }

        console.log('✅ Авторизация успешна:', data);
        
        // Сохраняем токен и пользователя
        state.currentUser = data.user;
        state.authToken = data.token;
        
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('authToken', data.token);
        
        authModal.style.display = 'none';
        updateAuthUI();
        
        if (state.currentPage === 'home') {
            loadPage('chat');
        }
        
    } catch (error) {
        console.error('❌ Ошибка авторизации:', error);
        alert('Ошибка авторизации: ' + error.message);
    }
}

// Выход из системы
function handleLogout() {
    state.currentUser = null;
    state.authToken = null;
    state.messages = [];
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('chatMessages');
    updateAuthUI();
    loadPage('home');
}

// Загрузка страниц
function loadPage(page) {
    state.currentPage = page;
    
    switch (page) {
        case 'home':
            renderHomePage();
            break;
        case 'chat':
            if (state.currentUser) {
                renderChatPage();
            } else {
                authModal.style.display = 'block';
            }
            break;
    }
}

// Сохранение сообщения в localStorage
async function saveMessageToDB(content, role) {
    const message = {
        id: Date.now(),
        content,
        role,
        timestamp: new Date().toISOString()
    };
    
    const messages = JSON.parse(localStorage.getItem('chatMessages') || '[]');
    messages.push(message);
    localStorage.setItem('chatMessages', JSON.stringify(messages));
    
    return Promise.resolve(message);
}

// Функция для запроса к AI через бэкенд
async function fetchOpenRouterResponse(prompt) {
    console.log('🔍 Отправка запроса к AI через бэкенд...');

    try {
        console.log('📤 Отправка запроса к бэкенду...');

        const response = await fetch(`${BACKEND_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.authToken}`
            },
            body: JSON.stringify({ 
                message: prompt,
                model: "tngtech/deepseek-r1t2-chimera:free"
            })
        });

        console.log('📥 Ответ от бэкенда:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Успешный ответ от бэкенда:', data);

        if (data.response) {
            return data.response;
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Неверный формат ответа от сервера');
        }

    } catch (error) {
        console.error('💥 Ошибка при обращении к AI:', error);
        throw error;
    }
}

// Обработка отправки сообщения
async function handleSendMessage(content) {
    if (!content.trim()) return;
    
    // Проверяем авторизацию
    if (!state.authToken) {
        alert('Пожалуйста, войдите в систему');
        authModal.style.display = 'block';
        return;
    }
    
    // Добавляем сообщение пользователя
    const userMessage = {
        id: Date.now(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date()
    };
    
    state.messages.push(userMessage);
    await saveMessageToDB(content.trim(), 'user');
    renderChatPage();
    
    // Показываем индикатор набора текста
    state.isTyping = true;
    renderChatPage();
    
    try {
        // Отправляем запрос к AI
        const response = await fetchOpenRouterResponse(content);
        
        // Добавляем ответ ассистента
        const assistantMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: response,
            timestamp: new Date()
        };
        
        state.messages.push(assistantMessage);
        await saveMessageToDB(response, 'assistant');
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        
        let errorMessage = 'Извините, произошла ошибка. ';
        
        if (error.message.includes('Неверный API ключ')) {
            errorMessage = '❌ Неверный API ключ OpenRouter. Проверьте ключ в личном кабинете.';
        } else if (error.message.includes('Модель не найдена')) {
            errorMessage = '❌ Модель не найдена. Проверьте название модели.';
        } else if (error.message.includes('Превышен лимит')) {
            errorMessage = '⚠️ Превышен лимит запросов. Попробуйте позже.';
        } else if (error.message.includes('401')) {
            errorMessage = '❌ Ошибка авторизации. Пожалуйста, войдите снова.';
            handleLogout();
        } else {
            errorMessage += error.message;
        }
        
        const errorMessageObj = {
            id: Date.now() + 1,
            role: 'assistant', 
            content: errorMessage,
            timestamp: new Date()
        };
        
        state.messages.push(errorMessageObj);
        await saveMessageToDB(errorMessageObj.content, 'assistant');
    } finally {
        state.isTyping = false;
        renderChatPage();
    }
}

// Рендер главной страницы
function renderHomePage() {
    app.innerHTML = `
        <section class="hero">
            <div class="hero-bg">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6922e606e07c9ca3bcf97358/c95401746_2.jpg" alt="Hero Background">
            </div>
            <div class="hero-content">
                <div class="badge">
                    <span>Следующее поколение AI</span>
                </div>
                <h1 class="hero-title">TUMAR.AI</h1>
                <p class="hero-subtitle">
                    Интеллектуальный интерфейс будущего. Абсолютная точность, 
                    безупречный стиль и мгновенная обработка данных.
                </p>
                <button class="cta-button" onclick="loadPage('chat')">
                    <span>Начать общение 
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m9 18 6-6-6-6"/>
                        </svg>
                    </span>
                </button>
            </div>
        </section>

        <section class="features">
            <div class="features-container">
                <div class="feature">
                    <div class="feature-image">
                        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6922e606e07c9ca3bcf97358/780fdcd41_FuturisticBlackGem-Photoroom.png" alt="Deep Analysis">
                    </div>
                    <div class="feature-content">
                        <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
                        </svg>
                        <h2 class="feature-title">Глубокий анализ</h2>
                        <p class="feature-description">
                            Используя передовые алгоритмы AI, Tumar.AI проникает в суть ваших запросов,
                            предоставляя ответы с невероятной точностью и контекстуальным пониманием.
                            Это не просто чат, это расширение вашего интеллекта.
                        </p>
                    </div>
                </div>

                <div class="feature">
                    <div class="feature-image">
                        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6922e606e07c9ca3bcf97358/bb60ad9c3_Futuristic3DLattice-Photoroom.png" alt="Security">
                    </div>
                    <div class="feature-content">
                        <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <h2 class="feature-title">Безопасность данных</h2>
                        <p class="feature-description">
                            Ваши диалоги защищены современными протоколами шифрования. 
                            Мы ценим вашу приватность превыше всего, создавая безопасное пространство 
                            для ваших идей и проектов.
                        </p>
                    </div>
                </div>

                <div class="feature">
                    <div class="feature-image">
                        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6922e606e07c9ca3bcf97358/ed12566c3_Futuristic3DObject-Photoroom.png" alt="Performance">
                    </div>
                    <div class="feature-content">
                        <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                        <h2 class="feature-title">Мгновенный отклик</h2>
                        <p class="feature-description">
                            Никаких задержек. Оптимизированная архитектура обеспечивает молниеносную
                            генерацию ответов, позволяя вам поддерживать поток мыслей без прерываний.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section class="cta-section">
            <div class="cta-container">
                <h2>Готовы к будущему?</h2>
                <p>Присоединяйтесь к Tumar.AI сегодня.</p>
                <button class="cta-button" onclick="loadPage('chat')">Начать сейчас</button>
            </div>
        </section>
    `;
    
    initAnimations();
}

// Рендер страницы чата
function renderChatPage() {
    app.innerHTML = `
        <div class="chat-container">
            <div class="chat-bg-ambience"></div>
            <div class="chat-bg-ambience"></div>
            
            <div class="sidebar">
                <div class="user-info">
                    <div class="user-avatar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div class="user-details">
                        <div class="user-email">${state.currentUser ? state.currentUser.email : 'Гость'}</div>
                        <div class="user-status">Online</div>
                    </div>
                </div>
                
                <div class="chat-history">
                    <div class="history-title">История</div>
                    <div class="current-chat">Текущий чат</div>
                </div>
                
                <button class="logout-btn" onclick="handleLogout()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16,17 21,12 16,7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Выйти
                </button>
            </div>

            <div class="chat-main">
                <div class="messages-container" id="messagesContainer">
                    ${state.messages.length === 0 ? `
                        <div class="empty-chat">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <p>Tumar.AI готов к работе</p>
                        </div>
                    ` : state.messages.map(msg => `
                        <div class="message ${msg.role}">
                            <div class="avatar ${msg.role}">
                                ${msg.role === 'user' ? `
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                ` : `
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 8V4H8"/>
                                        <rect width="16" height="12" x="4" y="8" rx="2"/>
                                        <path d="M2 14h2"/>
                                        <path d="M20 14h2"/>
                                        <path d="M15 13v2"/>
                                        <path d="M9 13v2"/>
                                    </svg>
                                `}
                            </div>
                            <div class="message-bubble ${msg.role}">${msg.content}</div>
                        </div>
                    `).join('')}
                    ${state.isTyping ? `
                        <div class="message">
                            <div class="avatar bot">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 8V4H8"/>
                                    <rect width="16" height="12" x="4" y="8" rx="2"/>
                                    <path d="M2 14h2"/>
                                    <path d="M20 14h2"/>
                                    <path d="M15 13v2"/>
                                    <path d="M9 13v2"/>
                                </svg>
                            </div>
                            <div class="typing-indicator">
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="chat-input-container">
                    <form class="chat-form" id="chatForm">
                        <input 
                            type="text" 
                            class="chat-input" 
                            placeholder="Отправьте сообщение Tumar.AI..."
                            id="chatInput"
                        >
                        <button type="submit" class="send-button" id="sendButton">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22,2 15,22 11,13 2,9"/>
                            </svg>
                        </button>
                    </form>
                    <p class="input-note">
                        Tumar.AI может допускать ошибки. Проверяйте важную информацию.
                    </p>
                </div>
            </div>
        </div>
    `;

    setupChatEventListeners();
    scrollToBottom();
}

// Настройка обработчиков событий для чата
function setupChatEventListeners() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (message) {
                await handleSendMessage(message);
                chatInput.value = '';
            }
        });
    }
}

// Прокрутка вниз
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Инициализация анимаций
function initAnimations() {
    if (typeof gsap !== 'undefined') {
        gsap.to('.feature-image img', {
            y: -20,
            rotation: 5,
            duration: 6,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: 0.5
        });
    }
}

// Глобальные функции для onclick
window.loadPage = loadPage;
window.handleLogout = handleLogout;