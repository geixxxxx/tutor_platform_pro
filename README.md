# Tutor Platform Pro

Полноценная образовательная платформа с ролями ученика и репетитора, PostgreSQL-базой, frontend на HTML/CSS/JS и backend на Node.js.

## Установка

1. Установите зависимости:

```bash
cd /Users/yaromirtribunsky/Downloads/tutor_platform_pro
npm install
```

2. Настройте PostgreSQL и переменные окружения.

Создайте базу данных и запустите схему:

```bash
export POSTGRES_URL="postgres://postgres:postgres@localhost:5432/tutor_platform"
npm run init-db
```

3. Запустите сервер:

```bash
npm start
```

4. Откройте в браузере:

```
http://localhost:4000
```

## Переменные окружения

- `POSTGRES_URL` — строка подключения к PostgreSQL
- `JWT_SECRET` — секрет для JWT токенов
- `PORT` — порт сервера (по умолчанию 4000)

## Функции платформы

- регистрация и авторизация учеников и репетиторов
- разделение кабинетов по ролям
- личный кабинет ученика с расписанием, домашними заданиями, магазином и медиаплеером
- личный кабинет репетитора с учениками, заданиями, вебинарами и расписанием
- корзина и имитация оплаты через ЮКассу
- PostgreSQL-схема для хранения пользователей, курсов, заданий, вебинаров и заказов

## Демонстрационные аккаунты

- Ученик: `student@example.com` / `password`
- Репетитор: `tutor@example.com` / `password`
