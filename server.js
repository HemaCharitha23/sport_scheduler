'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const csrf = require('csurf');
const db = require('./models');
const bodyParser = require('body-parser');
const { User, Sport, Session} = require('./models'); 
const cookieParser = require('cookie-parser');
const path = require('path');
const flash = require('connect-flash');
const passport = require('passport');
const connectEnsureLogin = require('connect-ensure-login');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const { Sequelize } = require('sequelize');

const app = express();
const saltRounds = 10;


app.use(
  session({
    secret: 'my-secret-key-12345678',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Middleware configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(csrf({ cookie: true }));
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/static', express.static(path.join(__dirname, 'public')));


app.use(passport.initialize());
app.use(passport.session());


passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const existingUser = await User.findOne({ where: { email } });
        if (!existingUser) {
          return done(null, false, { message: 'User not found' });
        }
        const isValidPassword = await bcrypt.compare(password, existingUser.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid password' });
        }
        return done(null, existingUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const foundUser = await User.findByPk(id);
    if (!foundUser) {
      return done(null, false);
    }
    done(null, foundUser);
  } catch (error) {
    done(error, false);
  }
});

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.errorMessage = req.flash('error');
  next();
});

// Routes

app.get("/", (req, res) => {
  res.render("main", {
    csrfToken: req.csrfToken(),
  });
});

app.get('/signup', (req, res) => {
  res.render('signup');
});


app.post('/create-player', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!firstName || !lastName || !email || !password || !role) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/signup');
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash('error', 'User already exists.');
      return res.redirect('/signup');
    }

    const hashedPwd = await bcrypt.hash(password, saltRounds);

    await User.create({
      firstName,
      lastName,
      email,
      password: hashedPwd,
      role,
    });

    res.redirect('/signin');
  } catch (error) {
    console.error('Error creating user:', error.message);
    req.flash('error', 'Internal server error');
    res.redirect('/signup');
  }
});

app.get('/signin', (req, res) => {
  res.render('login');
});

app.post('/signinsubmit',
  passport.authenticate('local', {
    failureRedirect: '/signin?error=Invalid credentials',
    failureFlash: false 
  }),
  (req, res) => {
    if (req.user.role === 'admin') {
      res.redirect('/admindashboard?message=Login successful! Welcome, Admin.');
    } else if (req.user.role === 'player') {
      res.redirect('/playerdashboard?message=Login successful! Welcome, Player.');
    } else {
      res.redirect('/signin?error=Unauthorized access');
    }
  }
);


// Admin Dashboard Route
app.get('/admindashboard', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send('Unauthorized access');
    }
    const sports = await Sport.findAll();
    const sessions = await Session.findAll({
      include: { model: Sport, as: "sport" }, 
    });
    const joinedSessions = sessions.filter((session) => {
      const team1 = session.team1Players ? session.team1Players.split(',').map(Number) : [];
      const team2 = session.team2Players ? session.team2Players.split(',').map(Number) : [];
      return team1.includes(req.user.id) || team2.includes(req.user.id);
    });
    res.render('admindashboard', {
      user: req.user,
      sports,
      sessions,
      joinedSessions,
      csrfToken: req.csrfToken(),
      successMessage: req.flash('success'),
      errorMessage: req.flash('error'),
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    req.flash('error', 'Could not load dashboard.');
    res.redirect('/');
  }
});


// Create Sport Page Route
app.get('/create-sport', connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Unauthorized access');
  }

  res.render('create_sport', {
    user: req.user,
    csrfToken: req.csrfToken(),
  });
});

// Handle Create Sport Form Submission
app.post('/create-sport', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).send('Unauthorized access');
    }
    console.log(req.body.sportName);
    const name  = req.body.sportName;
    if (!name) {
      req.flash('error', 'Sport name is required.');
      return res.redirect('/create-sport');
    }

    await Sport.create({
      name,
      createdBy: req.user.id,
    });

    req.flash('success', 'Sport created successfully!');
    res.redirect('/admindashboard');
  } catch (error) {
    console.error('Error creating sport:', error);
    req.flash('error', 'Error creating sport.');
    res.redirect('/create-sport');
  }
});

app.get('/playerdashboard', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.user.role !== 'player' && req.user.role !== 'admin') {
      return res.status(403).send('Unauthorized');
    }

    const sports = await Sport.findAll();
    const availableSessions = await Session.findAll({
      include: { model: Sport, as: "sport" }, 
    });
    const joinedSessions = availableSessions.filter((session) => {
      const team1 = session.team1Players ? session.team1Players.split(',').map(Number) : [];
      const team2 = session.team2Players ? session.team2Players.split(',').map(Number) : [];
      return team1.includes(req.user.id) || team2.includes(req.user.id);
    });

    res.render('playerdashboard', {
      user: req.user,
      sports,
      availableSessions,
      joinedSessions,
      csrfToken: req.csrfToken(),
      successMessage: req.flash('success'),
      errorMessage: req.flash('error'),
    });
    } catch (error) {
      console.error('Error loading player dashboard:', error);
      req.flash('error', 'Could not load dashboard.');
      res.redirect('/');
    }
});

// Create Session Page
app.get('/create-session', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
      if (req.user.role !== 'player' && req.user.role !== 'admin') {
          req.flash('error', 'Unauthorized access.');
          return res.redirect('/dashboard');
      }

      const sports = await Sport.findAll(); 
      const user = await req.user.role;
      console.log(user);
      res.render('create_session', {
          csrfToken: req.csrfToken(),
          sports,
          user,
          messages: {
              success: req.flash('success'),
              error: req.flash('error')
          }
      });
    } catch (error) {
        console.error('Error loading session creation page:', error);
        req.flash('error', 'Failed to load the page.');
        res.redirect('/dashboard');
    }
});



// Handle Session Creation
app.post('/create-session', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    if (req.user.role !== 'player' && req.user.role !== 'admin') {
      return res.status(403).send('Unauthorized');
    }  
    console.log(req.body);
    const { sportId, dateTime, venue ,team1Players,team2Players,additionalPlayers} = req.body;
    await Session.create({
      sportId,
      dateTime,
      venue,
      team1Players,
      team2Players,
      additionalPlayers,
      createdBy: req.user.id,
      status: 'active'
    });

    req.flash('success', 'Session created successfully!');
    if(req.user.role === 'player'){
      res.redirect('/playerdashboard');
    }
    else{
      res.redirect('/admindashboard');
    }
  } catch (error) {
    console.error('Error creating session:', error);
    req.flash('error', 'Error creating session.');
    res.redirect('/create-session');
  }
});

// View All Sessions
app.get('/sessions', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const sessions = await Session.findAll({ include:{ model: Sport,as:'sport'} });
  res.render('session', { user: req.user, sessions });
});


app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken(); 
  res.locals.errorMessage = req.flash('error');
  next();
});

// View My Sessions
app.get('/mysessions', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const mySessions = await Session.findAll({ where: { createdBy: req.user.id }, include: {model:Sport,as:'sport'} });
  res.render('mysessions', { user: req.user, mySessions });
});


// Route to handle joining a session
app.post('/join-session/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await Session.findByPk(sessionId);

    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect(req.user.role === 'admin' ? '/admindashboard' : '/playerdashboard');
    }
    const team1 = session.team1Players ? session.team1Players.split(',').map(Number) : [];
    const team2 = session.team2Players ? session.team2Players.split(',').map(Number) : [];
    const allPlayers = [...team1, ...team2];

    if (allPlayers.includes(req.user.id)) {
      req.flash('error', 'You are already in this session.');
      return res.redirect(req.user.role === 'admin' ? '/admindashboard' : '/playerdashboard');
    }
    if (team1.length <= team2.length) {
      team1.push(req.user.id);
      session.team1Players = team1.join(',');
    } else {
      team2.push(req.user.id);
      session.team2Players = team2.join(',');
    }

    await session.save();
    req.flash('success', 'Successfully joined the session!');
    res.redirect(req.user.role === 'admin' ? '/admindashboard' : '/playerdashboard');
  } catch (error) {
    console.error('Error joining session:', error);
    req.flash('error', 'Could not join the session.');
    res.redirect(req.user.role === 'admin' ? '/admindashboard' : '/playerdashboard');
  }
});


// Route to handle canceling a session
app.post('/cancel-session/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const sessionId = req.params.id;
    const  cancelReason  = req.body.reason;
    if (!cancelReason) {
      req.flash('error', 'Cancellation reason is required.');
      return res.redirect('/playerdashboard');
    }

    const session = await Session.findByPk(sessionId);

    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/playerdashboard');
    }
    const team1 = session.team1Players ? session.team1Players.split(',').map(Number) : [];
    const team2 = session.team2Players ? session.team2Players.split(',').map(Number) : [];
    const isPlayerInSession = team1.includes(req.user.id) || team2.includes(req.user.id);

    if (!isPlayerInSession) {
      req.flash('error', 'You are not part of this session.');
      return res.redirect('/playerdashboard');
    }
    session.team1Players = team1.filter((id) => id !== req.user.id).join(',');
    session.team2Players = team2.filter((id) => id !== req.user.id).join(',');
    await session.save();

    req.flash('success', `Session canceled. Reason: ${cancelReason}`);
    res.redirect('/playerdashboard');
  } catch (error) {
    console.error('Error canceling session:', error);
    req.flash('error', 'Could not cancel the session.');
    res.redirect('/playerdashboard');
  }
});

app.post('/delete-session/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await Session.findByPk(sessionId);

    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/admindashboard');
    }
    if (req.user.id !== session.createdBy && req.user.role !== 'admin') {
      req.flash('error', 'Unauthorized action.');
      return res.redirect('/admindashboard');
    }
    await session.destroy();
    req.flash('success', 'Session deleted successfully.');
    
    if (req.user.role === 'player') {
      res.redirect('/playerdashboard');
    } else {
      res.redirect('/admindashboard');
    }

  } catch (error) {
    console.error('Error deleting session:', error);
    req.flash('error', 'Failed to delete session.');
    res.redirect('/admindashboard');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
    }
    res.redirect('/');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err.message);
  res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 4000;

db.sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('Database synchronized successfully.');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to synchronize the database:', error);
  });
