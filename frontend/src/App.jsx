import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showMainPage, setShowMainPage] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [shows, setShows] = useState([]);
  const [merchItems, setMerchItems] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [dataError, setDataError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [reservedShowIds, setReservedShowIds] = useState([]);

  const handleLogin = () => {
    setShowLogin(true);
    setShowSignUp(false);
    setLoginError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentUser(data.user || null);
        setShowLogin(false);
        setShowSignUp(false);
        setEmail('');
        setPassword('');
        setLoginError('');
        setIsLoggedIn(true);
        setShowMainPage(true);
      } else {
        setLoginError(data.error || 'login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('something went wrong');
    }
  };

  const handleSignUp = () => {
    setShowSignUp(true);
    setShowLogin(false);
    setLoginError('');
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentUser(data.user || null);
        setShowLogin(false);
        setShowSignUp(false);
        setEmail('');
        setPassword('');
        setIsLoggedIn(true);
        setShowMainPage(true);
      } else {
        setLoginError(data.error || 'sign up failed');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setLoginError('something went wrong');
    }
  };

  const handleMaybeLater = () => {
    setShowLogin(false);
    setShowSignUp(false);
    setEmail('');
    setPassword('');
    setLoginError('');
    setShowMainPage(true);
  };

  const handleNavClick = (section, e) => {
    e.preventDefault();
    setActiveSection(section);
    setDataError('');
  };

  // Load data from backend when main page is shown
  useEffect(() => {
    if (!showMainPage) return;

    const loadData = async () => {
      try {
        setDataError('');

        const [showsRes, merchRes, discsRes] = await Promise.all([
          fetch('/api/shows'),
          fetch('/api/merch'),
          fetch('/api/discography'),
        ]);

        const [showsData, merchData, discsData] = await Promise.all([
          showsRes.json(),
          merchRes.json(),
          discsRes.json(),
        ]);

        setShows(showsData || []);
        setMerchItems(merchData || []);
        setAlbums(discsData || []);

        // Load reservations for the logged-in user
        if (isLoggedIn && currentUser?.id) {
          const resRes = await fetch(`/api/reservations?userId=${currentUser.id}`);
          const resData = await resRes.json();
          setReservedShowIds((resData || []).map((r) => r.showId));
        } else {
          setReservedShowIds([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setDataError('could not load data from server');
      }
    };

    loadData();
  }, [showMainPage, isLoggedIn, currentUser]);

  const handleReserveShow = async (showId) => {
    if (!isLoggedIn || !currentUser?.id) {
      setDataError('you need to be logged in to reserve a show');
      return;
    }

    const alreadyReserved = reservedShowIds.includes(showId);
    const method = alreadyReserved ? 'DELETE' : 'POST';

    try {
      const response = await fetch('/api/reservations', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.id, showId }),
      });

      const data = await response.json();

      if (data.success) {
        setReservedShowIds((prev) =>
          alreadyReserved ? prev.filter((id) => id !== showId) : [...prev, showId]
        );
      } else {
        setDataError(data.error || (alreadyReserved ? 'could not unreserve show' : 'could not reserve show'));
      }
    } catch (error) {
      console.error('Reserve show error:', error);
      setDataError(alreadyReserved ? 'could not unreserve show' : 'could not reserve show');
    }
  };

  // Main page with header
  if (showMainPage) {
    return (
      <div className="main-page">
        <header className="header">
          <nav className="nav">
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('shows', e)}>shows</a>
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('discography', e)}>discography</a>
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('merch', e)}>merch</a>
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('about', e)}>about</a>
          </nav>
          {isLoggedIn && (
            <div className="profile-icon"></div>
          )}
        </header>
        <main className="main-content">
          <div className="band-title">THE SPECTATOR</div>
          {dataError && (
            <div className="error-message" style={{ marginBottom: '1.5rem' }}>
              {dataError}
            </div>
          )}
          
          {activeSection === 'shows' && (
            <div className="content-section">
              <h2 className="section-title">Upcoming Shows</h2>
              <div className="shows-list">
                {shows.map((show) => (
                  <div
                    key={show.id}
                    className={`show-item ${
                      reservedShowIds.includes(show.id) ? 'reserved' : ''
                    }`}
                  >
                    <div>
                      <div className="show-date">{show.date}</div>
                      <div className="show-city">
                        {show.city}{show.venue ? ` — ${show.venue}` : ''}
                      </div>
                    </div>
                    {isLoggedIn && (
                      <button
                        type="button"
                        className={`reserve-button ${
                          reservedShowIds.includes(show.id) ? 'reserved' : ''
                        }`}
                        onClick={() => handleReserveShow(show.id)}
                      >
                        {reservedShowIds.includes(show.id)
                          ? 'Reserved'
                          : 'Reserve ticket'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'discography' && (
            <div className="content-section">
              <h2 className="section-title">Discography</h2>
              <div className="album-card">
                {albums.length > 0 ? (
                  <>
                    <div className="album-title">{albums[0].title}</div>
                    <img 
                      src={`/${albums[0].coverImage}`}
                      alt={`${albums[0].title} Album Cover`}
                      className="album-art"
                    />
                  </>
                ) : (
                  <div className="album-art-placeholder">
                    <div style={{ marginBottom: '1rem', fontSize: '2rem' }}>🎵</div>
                    <div>No albums found</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'merch' && (
            <div className="content-section">
              <h2 className="section-title">Merchandise</h2>
              <div className="merch-grid">
                {merchItems.map((item) => (
                  <div key={item.id} className="merch-item">
                    <div className="merch-icon">
                      {item.name === 'T-Shirt' && '👕'}
                      {item.name === 'Vinyl' && '💿'}
                      {item.name === 'Guitar' && '🎸'}
                    </div>
                    <div className="merch-name">{item.name}</div>
                    <div className="merch-price">${item.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="content-section">
              <h2 className="section-title">About The Band</h2>
              <div className="band-info">
                <p>THE SPECTATOR is an innovative musical collective that pushes the boundaries of sound and performance. With their unique blend of genres and captivating live shows, they have established themselves as a force in the contemporary music scene.</p>
                <p>they are always watching</p>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Auth page
  return (
    <div className="app">
      <div className="auth-container">
        <h1>Welcome</h1>
        <div className="button-group">
          <button className="btn btn-primary" onClick={handleLogin}>
            Log In
          </button>
          <button className="btn btn-secondary" onClick={handleSignUp}>
            Sign Up
          </button>
        </div>
        
        <button className="maybe-later" onClick={handleMaybeLater}>
          Maybe Later
        </button>
        
        {showLogin && (
          <div className="form-container">
            <h2>Log In</h2>
            <form onSubmit={handleLoginSubmit}>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoginError('');
                  }}
                  className="input-field"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError('');
                  }}
                  className="input-field"
                  required
                />
                {loginError && (
                  <div className="error-message">{loginError}</div>
                )}
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Log In
                </button>
              </div>
            </form>
          </div>
        )}

        {showSignUp && (
          <div className="form-container">
            <h2>Sign Up</h2>
            <form onSubmit={handleSignUpSubmit}>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  required
                />
                {loginError && (
                  <div className="error-message">{loginError}</div>
                )}
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
