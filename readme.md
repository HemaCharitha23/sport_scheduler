# Sports Scheduler

The **Sports Scheduler** application is a web-based platform that helps users manage sports sessions. It allows **Admin** users to create sports and sessions, while **Player** users can join or cancel sessions. The application is built using **Node.js**, **Express**, **Sequelize ORM**, and **Passport.js** for authentication.

## Features

### General Features:
- **User Authentication**: Secure login and sign-up functionality with hashed passwords using **bcrypt**.
- **Role-based Access**: Users are classified as either **admin** or **player**, with different permissions.
- **Sports Management**: Admins can create and manage sports.
- **Session Management**: Admins and players can create, join, and cancel sports sessions.
- **Session Participation**: Players can join available sessions, and admins can view the teams.

### Admin Features:
- **Admin Dashboard**: View and manage sports, sessions, and players.
- **Create Sport**: Admins can create new sports for scheduling sessions.
- **Create and Delete Sessions**: Admins can create new sessions and delete existing ones.

### Player Features:
- **Player Dashboard**: View available sessions and join them based on sport.
- **Join Session**: Players can join active sessions.
- **Cancel Session**: Players can cancel their participation in a session.
- **View Sessions**: Players can see all sessions they have joined.

### Security Features:
- **CSRF Protection**: All forms are protected against CSRF attacks using **csrf** middleware.
- **Session Management**: Users’ sessions are managed with **express-session**, ensuring secure handling of user data.

## Technologies Used:
- **Node.js**: JavaScript runtime for the server-side application.
- **Express.js**: Framework to handle HTTP requests and routing.
- **Sequelize**: ORM to interact with the SQLite database.
- **Passport.js**: Middleware to handle user authentication and sessions.
- **bcrypt.js**: Library for hashing and verifying passwords.
- **CSRF Protection**: Middleware to protect against CSRF attacks.

## Setup Instructions

### Prerequisites:
- **Node.js** (version 12 or higher)
- **NPM** (Node Package Manager)

### Steps to Run Locally:
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd sports-scheduler
