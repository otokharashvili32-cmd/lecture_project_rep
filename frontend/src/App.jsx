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
  const [songs, setSongs] = useState([]);
  const [dataError, setDataError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [reservedShowIds, setReservedShowIds] = useState([]);
  const [likedSongIds, setLikedSongIds] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [songRatings, setSongRatings] = useState({});
  const [songAverages, setSongAverages] = useState({});
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [showSearchQuery, setShowSearchQuery] = useState('');
  const [showSortBy, setShowSortBy] = useState('date');
  const [purchasedShowIds, setPurchasedShowIds] = useState([]);
  const [merchSearchQuery, setMerchSearchQuery] = useState('');
  const [merchSortBy, setMerchSortBy] = useState('default');
  const [wishlistMerchIds, setWishlistMerchIds] = useState([]);
  const [purchasedMerchIds, setPurchasedMerchIds] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [promoCodeMessage, setPromoCodeMessage] = useState('');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedShowForPurchase, setSelectedShowForPurchase] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [showMerchModal, setShowMerchModal] = useState(false);
  const [selectedMerchForPurchase, setSelectedMerchForPurchase] = useState(null);
  const [merchQuantity, setMerchQuantity] = useState(1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isAddingUsername, setIsAddingUsername] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [theme, setTheme] = useState('dark');

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
        // Load theme preference from user, fallback to localStorage, then default to 'dark'
        const userTheme = data.user?.theme_preference || localStorage.getItem('theme') || 'dark';
        setTheme(userTheme);
        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', userTheme);
        // Store in localStorage as backup
        localStorage.setItem('theme', userTheme);
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
        // Load theme preference from user (default to 'dark' for new users)
        const userTheme = data.user?.theme_preference || 'dark';
        setTheme(userTheme);
        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', userTheme);
        // Store in localStorage as backup
        localStorage.setItem('theme', userTheme);
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
    // Apply default dark theme for non-logged-in users
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  };

  const handleThemeToggle = async (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // If user is logged in, save to database
    if (isLoggedIn && currentUser?.id) {
      try {
        const response = await fetch(`/api/users/${currentUser.id}/theme`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        });

        const data = await response.json();
        if (data.success) {
          // Update currentUser with new theme
          setCurrentUser({ ...currentUser, theme_preference: newTheme });
        }
      } catch (error) {
        console.error('Error updating theme:', error);
      }
    }
  };

  const handleCloseSettingsModal = () => {
    setShowSettingsModal(false);
  };

  const handleSignOut = () => {
    // Clear user state
    setCurrentUser(null);
    setIsLoggedIn(false);
    
    // Close profile menu
    setShowProfileMenu(false);
    
    // Keep user on main page (not logged in state)
    // The main page will automatically show content without user-specific features
  };

  const handleDeleteAccount = async () => {
    if (!isLoggedIn || !currentUser?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Clear user state and log out
        setCurrentUser(null);
        setIsLoggedIn(false);
        setShowDeleteConfirm(false);
        setShowProfileMenu(false);
        
        // Clear any user-specific data
        setReservedShowIds([]);
        setLikedSongIds([]);
        setPurchasedShowIds([]);
        setWishlistMerchIds([]);
        setPurchasedMerchIds([]);
      } else {
        setDataError(data.error || 'could not delete account');
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDataError(`could not delete account: ${error.message}`);
      setShowDeleteConfirm(false);
    }
  };

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowUsernameInput(false);
    setUsernameInput('');
  };

  const handleAddUsername = () => {
    setIsAddingUsername(true);
    setShowUsernameInput(true);
    setUsernameInput('');
  };

  const handleChangeUsername = () => {
    setIsAddingUsername(false);
    setShowUsernameInput(true);
    setUsernameInput(currentUser?.username || '');
  };

  const handleSaveUsername = async () => {
    if (!isLoggedIn || !currentUser?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${currentUser.id}/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameInput }),
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        setDataError('Server returned an error. Please check backend server is running.');
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Update currentUser with new username
        setCurrentUser({ ...currentUser, username: data.username });
        setShowUsernameInput(false);
        setUsernameInput('');
        setDataError(''); // Clear any previous errors
      } else {
        console.error('Backend error:', data.error);
        setDataError(data.error || 'could not save username');
      }
    } catch (error) {
      console.error('Error saving username:', error);
      setDataError(`could not save username: ${error.message}`);
    }
  };

  const handleCancelUsername = () => {
    setShowUsernameInput(false);
    setUsernameInput('');
  };

  const handleNavClick = (section, e) => {
    e.preventDefault();
    setActiveSection(section);
    setDataError('');
  };

  // Increment visitor counter when main page loads
  useEffect(() => {
    if (!showMainPage) return;

    const incrementVisitorCount = async () => {
      try {
        // First, ensure the table exists by calling the create endpoint
        try {
          await fetch('/api/create-visitor-counter-table', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (createError) {
          console.error('Error creating visitor counter table:', createError);
        }

        // Use sessionStorage to prevent multiple increments on refresh
        const hasIncremented = sessionStorage.getItem('visitorIncremented');
        if (hasIncremented) {
          // Just fetch the current count
          const countRes = await fetch('/api/visitor/count');
          const countData = await countRes.json();
          if (countData.success) {
            setVisitorCount(countData.count || 0);
          }
          return;
        }

        // Increment the counter
        const response = await fetch('/api/visitor/increment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (data.success) {
          setVisitorCount(data.count || 0);
          sessionStorage.setItem('visitorIncremented', 'true');
        } else {
          console.error('Failed to increment visitor count:', data.error);
          // Try to fetch current count as fallback
          const countRes = await fetch('/api/visitor/count');
          const countData = await countRes.json();
          if (countData.success) {
            setVisitorCount(countData.count || 0);
          }
        }
      } catch (error) {
        console.error('Error incrementing visitor count:', error);
        // Try to fetch current count as fallback
        try {
          const countRes = await fetch('/api/visitor/count');
          const countData = await countRes.json();
          if (countData.success) {
            setVisitorCount(countData.count || 0);
          }
        } catch (fetchError) {
          console.error('Error fetching visitor count:', fetchError);
        }
      }
    };

    incrementVisitorCount();
  }, [showMainPage]);

  // Load data from backend when main page is shown
  useEffect(() => {
    if (!showMainPage) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
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

        // Load songs for the first album (AMAO)
        if (discsData && discsData.length > 0) {
          const songsRes = await fetch(`/api/songs?albumId=${discsData[0].id}`);
          const songsData = await songsRes.json();
          setSongs(songsData || []);

          // Load average ratings for all songs
          if (songsData && songsData.length > 0) {
            const averagePromises = songsData.map(song =>
              fetch(`/api/songs/${song.id}/rating-average`).then(res => res.json()).then(data => ({ songId: song.id, ...data }))
            );
            const averages = await Promise.all(averagePromises);
            const averagesMap = {};
            averages.forEach(avg => {
              averagesMap[avg.songId] = { average: avg.average, count: avg.count };
            });
            setSongAverages(averagesMap);
          }
        }

        // Load reservations for the logged-in user
        if (isLoggedIn && currentUser?.id) {
          const resRes = await fetch(`/api/reservations?userId=${currentUser.id}`);
          const resData = await resRes.json();
          setReservedShowIds((resData || []).map((r) => r.showId));

          // Load liked songs for the logged-in user
          const likedSongsRes = await fetch(`/api/users/${currentUser.id}/liked-songs`);
          const likedSongsData = await likedSongsRes.json();
          setLikedSongIds((likedSongsData || []).map((s) => s.songId));

          // Load purchased shows for the logged-in user
          const purchasedShowsRes = await fetch(`/api/users/${currentUser.id}/purchased-shows`);
          const purchasedShowsData = await purchasedShowsRes.json();
          setPurchasedShowIds((purchasedShowsData || []).map((p) => p.showId));

          // Load wishlist items for the logged-in user
          const wishlistRes = await fetch(`/api/users/${currentUser.id}/wishlist`);
          const wishlistData = await wishlistRes.json();
          setWishlistMerchIds((wishlistData || []).map((w) => w.merchId));

          // Load purchased merch items for the logged-in user
          const purchasedMerchRes = await fetch(`/api/users/${currentUser.id}/purchased-merch`);
          const purchasedMerchData = await purchasedMerchRes.json();
          setPurchasedMerchIds((purchasedMerchData || []).map((p) => p.merchId));
        } else {
          setReservedShowIds([]);
          setLikedSongIds([]);
          setPurchasedShowIds([]);
          setWishlistMerchIds([]);
          setPurchasedMerchIds([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setDataError('could not load data from server');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [showMainPage, isLoggedIn, currentUser]);

  // Load theme from localStorage on mount (for non-logged-in users)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-icon-container')) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProfileMenu]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Helper function to convert number to Roman numeral
  const toRomanNumeral = (num) => {
    const romanNumerals = [
      '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
      'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
    ];
    return romanNumerals[num] || num.toString();
  };

  const handleLikeSong = async (songId) => {
    if (!isLoggedIn || !currentUser?.id) {
      setDataError('you need to be logged in to like a song');
      return;
    }

    const alreadyLiked = likedSongIds.includes(songId);
    const method = alreadyLiked ? 'DELETE' : 'POST';

    try {
      const response = await fetch(`/api/songs/${songId}/like`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const data = await response.json();

      if (data.success) {
        setLikedSongIds((prev) =>
          alreadyLiked ? prev.filter((id) => id !== songId) : [...prev, songId]
        );
      } else {
        setDataError(data.error || (alreadyLiked ? 'could not unlike song' : 'could not like song'));
      }
    } catch (error) {
      console.error('Like song error:', error);
      setDataError(alreadyLiked ? 'could not unlike song' : 'could not like song');
    }
  };

  const handleSongClick = async (songId) => {
    setSelectedSong(songId);
    setShowRatingModal(true);
    setUserRating(0);
    setUserComment('');

    // Load ratings and average for this song
    try {
      const [ratingsRes, averageRes] = await Promise.all([
        fetch(`/api/songs/${songId}/ratings`),
        fetch(`/api/songs/${songId}/rating-average`)
      ]);

      const [ratingsData, averageData] = await Promise.all([
        ratingsRes.json(),
        averageRes.json()
      ]);

      setSongRatings(prev => ({ ...prev, [songId]: ratingsData }));
      setSongAverages(prev => ({ ...prev, [songId]: averageData }));

      // If user is logged in, check if they have a rating
      if (isLoggedIn && currentUser?.id) {
        const userRatingData = ratingsData.find(r => r.userId === currentUser.id);
        if (userRatingData) {
          setUserRating(userRatingData.rating);
          setUserComment(userRatingData.comment || '');
        }
      }
    } catch (error) {
      console.error('Error loading song ratings:', error);
      setDataError('could not load ratings');
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!isLoggedIn || !currentUser?.id || !selectedSong) {
      setDataError('you need to be logged in to rate a song');
      return;
    }

    if (userRating < 1 || userRating > 5) {
      setDataError('please select a rating between 1 and 5 stars');
      return;
    }

    try {
      const response = await fetch(`/api/songs/${selectedSong}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          rating: userRating,
          comment: userComment.trim() || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload ratings and average
        const [ratingsRes, averageRes] = await Promise.all([
          fetch(`/api/songs/${selectedSong}/ratings`),
          fetch(`/api/songs/${selectedSong}/rating-average`)
        ]);

        const [ratingsData, averageData] = await Promise.all([
          ratingsRes.json(),
          averageRes.json()
        ]);

        setSongRatings(prev => ({ ...prev, [selectedSong]: ratingsData }));
        setSongAverages(prev => ({ ...prev, [selectedSong]: averageData }));

        // Update user's rating/comment
        const userRatingData = ratingsData.find(r => r.userId === currentUser.id);
        if (userRatingData) {
          setUserRating(userRatingData.rating);
          setUserComment(userRatingData.comment || '');
        }
      } else {
        setDataError(data.error || 'could not submit rating');
      }
    } catch (error) {
      console.error('Submit rating error:', error);
      setDataError('could not submit rating');
    }
  };

  const handlePurchaseShow = (showId) => {
    if (!isLoggedIn || !currentUser?.id) {
      setDataError('you need to be logged in to purchase a ticket');
      return;
    }

    const show = shows.find(s => s.id === showId);
    if (!show) {
      setDataError('show not found');
      return;
    }

    if (show.availableSeats <= 0) {
      setDataError('this show is sold out');
      return;
    }

    if (purchasedShowIds.includes(showId)) {
      setDataError('you have already purchased a ticket for this show');
      return;
    }

    // Open modal to select ticket quantity
    setSelectedShowForPurchase(show);
    setTicketQuantity(1);
    setShowTicketModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedShowForPurchase || !currentUser?.id) {
      return;
    }

    const showId = selectedShowForPurchase.id;
    const quantity = ticketQuantity;

    if (quantity < 1 || quantity > 4) {
      setDataError('please select between 1 and 4 tickets');
      return;
    }

    if (selectedShowForPurchase.availableSeats < quantity) {
      setDataError(`only ${selectedShowForPurchase.availableSeats} seats available`);
      return;
    }

    try {
      const response = await fetch(`/api/shows/${showId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.id, quantity }),
      });

      const data = await response.json();

      if (data.success) {
        setPurchasedShowIds((prev) => [...prev, showId]);
        // Update the show's available seats in the local state
        setShows((prevShows) =>
          prevShows.map((s) =>
            s.id === showId
              ? { ...s, availableSeats: Math.max(0, (s.availableSeats || 0) - quantity) }
              : s
          )
        );
        setShowTicketModal(false);
        setSelectedShowForPurchase(null);
        setTicketQuantity(1);
      } else {
        setDataError(data.error || 'could not purchase ticket');
      }
    } catch (error) {
      console.error('Purchase show error:', error);
      setDataError('could not purchase ticket');
    }
  };

  const handleCloseTicketModal = () => {
    setShowTicketModal(false);
    setSelectedShowForPurchase(null);
    setTicketQuantity(1);
  };

  const handlePurchaseMerch = (merchId) => {
    if (!isLoggedIn || !currentUser?.id) {
      setDataError('you need to be logged in to purchase an item');
      return;
    }

    const item = merchItems.find(m => m.id === merchId);
    if (!item) {
      setDataError('item not found');
      return;
    }

    if (item.availableQuantity <= 0) {
      setDataError('this item is sold out');
      return;
    }

    if (purchasedMerchIds.includes(merchId)) {
      setDataError('you have already purchased this item');
      return;
    }

    // Open modal to select quantity
    setSelectedMerchForPurchase(item);
    setMerchQuantity(1);
    setShowMerchModal(true);
  };

  const handleConfirmMerchPurchase = async () => {
    if (!selectedMerchForPurchase || !currentUser?.id) {
      return;
    }

    const merchId = selectedMerchForPurchase.id;
    const quantity = merchQuantity;

    if (quantity < 1 || quantity > 10) {
      setDataError('please select between 1 and 10 items');
      return;
    }

    if (selectedMerchForPurchase.availableQuantity < quantity) {
      setDataError(`only ${selectedMerchForPurchase.availableQuantity} items available`);
      return;
    }

    try {
      const response = await fetch(`/api/merch/${merchId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.id, quantity }),
      });

      const data = await response.json();

      if (data.success) {
        setPurchasedMerchIds((prev) => [...prev, merchId]);
        // Update the item's available quantity in the local state
        setMerchItems((prevItems) =>
          prevItems.map((m) =>
            m.id === merchId
              ? { ...m, availableQuantity: Math.max(0, (m.availableQuantity || 0) - quantity) }
              : m
          )
        );
        setShowMerchModal(false);
        setSelectedMerchForPurchase(null);
        setMerchQuantity(1);
      } else {
        setDataError(data.error || 'could not purchase item');
      }
    } catch (error) {
      console.error('Purchase merch error:', error);
      setDataError('could not purchase item');
    }
  };

  const handleCloseMerchModal = () => {
    setShowMerchModal(false);
    setSelectedMerchForPurchase(null);
    setMerchQuantity(1);
  };

  const handlePromoCodeSubmit = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    
    if (code === 'SPECTATOR10') {
      setDiscountApplied(true);
      setPromoCodeMessage('successful');
      setPromoCode('');
    } else {
      setPromoCodeMessage('invalid promo code');
      setDiscountApplied(false);
    }
  };

  const handleToggleWishlist = async (merchId) => {
    if (!isLoggedIn || !currentUser?.id) {
      setDataError('you need to be logged in to add items to wishlist');
      return;
    }

    const isInWishlist = wishlistMerchIds.includes(merchId);
    const method = isInWishlist ? 'DELETE' : 'POST';

    try {
      const response = await fetch(`/api/merch/${merchId}/wishlist`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const data = await response.json();

      if (data.success) {
        setWishlistMerchIds((prev) =>
          isInWishlist ? prev.filter((id) => id !== merchId) : [...prev, merchId]
        );
      } else {
        setDataError(data.error || (isInWishlist ? 'could not remove from wishlist' : 'could not add to wishlist'));
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      setDataError(isInWishlist ? 'could not remove from wishlist' : 'could not add to wishlist');
    }
  };

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
        {/* Loading Screen */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <div className="loading-text">THE SPECTATOR</div>
            </div>
          </div>
        )}
        <header className="header">
          <nav className="nav">
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('shows', e)}>shows</a>
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('discography', e)}>discography</a>
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('merch', e)}>merch</a>
            <a href="#" className="nav-link" onClick={(e) => handleNavClick('about', e)}>about</a>
          </nav>
          <div className="header-icons">
            {isLoggedIn && (
              <div className="profile-icon-container">
                {currentUser?.username && (
                  <span className="profile-username">{currentUser.username}</span>
                )}
                <div className="profile-icon" onClick={handleProfileClick}></div>
                {showProfileMenu && (
                  <div className="profile-menu">
                    {!showUsernameInput ? (
                      <>
                        {currentUser?.username ? (
                          <button
                            className="profile-menu-item"
                            onClick={handleChangeUsername}
                          >
                            Change username
                          </button>
                        ) : (
                          <button
                            className="profile-menu-item"
                            onClick={handleAddUsername}
                          >
                            Add username
                          </button>
                        )}
                        <button
                          className="profile-menu-item"
                          onClick={handleSignOut}
                        >
                          Sign Out
                        </button>
                        <button
                          className="profile-menu-item profile-menu-item-danger"
                          onClick={() => {
                            setShowDeleteConfirm(true);
                            setShowUsernameInput(false);
                          }}
                        >
                          Delete Account
                        </button>
                      </>
                    ) : (
                      <div className="username-input-container">
                        <input
                          type="text"
                          className="username-input"
                          placeholder="Enter username"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          autoFocus
                        />
                        <div className="username-buttons">
                          <button
                            className="username-btn username-btn-save"
                            onClick={handleSaveUsername}
                          >
                            Save
                          </button>
                          <button
                            className="username-btn username-btn-cancel"
                            onClick={handleCancelUsername}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="settings-icon" onClick={() => {
              setShowSettingsModal(true);
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
          </div>
        </header>
        <main className="main-content">
          <div className="band-title">THE SPECTATOR</div>
          <div className="visitor-counter">
            {visitorCount} {visitorCount === 1 ? 'person has' : 'people have'} visited this page
          </div>
          {dataError && (
            <div className="error-message" style={{ marginBottom: '1.5rem' }}>
              {dataError}
            </div>
          )}
          
          {activeSection === 'shows' && (
            <div className="content-section">
              <h2 className="section-title">Upcoming Shows</h2>
              <div className="shows-controls">
                <div className="search-bar-container">
                  <input
                    type="text"
                    placeholder="Search shows by city or venue..."
                    value={showSearchQuery}
                    onChange={(e) => setShowSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                <div className="sort-container">
                  <label htmlFor="show-sort" className="sort-label">Sort by:</label>
                  <select
                    id="show-sort"
                    value={showSortBy}
                    onChange={(e) => setShowSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="date">Date</option>
                    <option value="price-low">Price (Low → High)</option>
                  </select>
                </div>
              </div>
              <div className="shows-list">
                {shows
                  .filter((show) => {
                    if (!showSearchQuery.trim()) return true;
                    const query = showSearchQuery.toLowerCase().trim();
                    const city = (show.city || '').toLowerCase();
                    const venue = (show.venue || '').toLowerCase();
                    return city.includes(query) || venue.includes(query);
                  })
                  .sort((a, b) => {
                    if (showSortBy === 'price-low') {
                      const priceA = a.price || 0;
                      const priceB = b.price || 0;
                      return priceA - priceB;
                    } else {
                      // Sort by date (default)
                      return new Date(a.date) - new Date(b.date);
                    }
                  })
                  .map((show) => (
                  <div
                    key={show.id}
                    className={`show-item ${
                      reservedShowIds.includes(show.id) ? 'reserved' : ''
                    } ${purchasedShowIds.includes(show.id) ? 'purchased' : ''}`}
                  >
      <div>
                      <div className="show-date">
                        {show.date ? new Date(show.date).toISOString().split('T')[0] : show.date}
                      </div>
                      <div className="show-city">
                        {show.city}{show.venue ? ` — ${show.venue}` : ''}
                      </div>
                      {show.price && (
                        <div className="show-price">${parseFloat(show.price).toFixed(2)}</div>
                      )}
                      <div className="show-availability">
                        {show.availableSeats !== undefined && show.availableSeats !== null ? (
                          show.availableSeats > 0 ? (
                            <span className="seats-available">{show.availableSeats} seats left</span>
                          ) : (
                            <span className="sold-out">Sold out</span>
                          )
                        ) : null}
                      </div>
                    </div>
                    {isLoggedIn && (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {show.availableSeats > 0 && !purchasedShowIds.includes(show.id) && (
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
                        <button
                          type="button"
                          className={`get-button ${
                            purchasedShowIds.includes(show.id) ? 'going' : ''
                          }`}
                          onClick={() => {
                            if (!purchasedShowIds.includes(show.id)) {
                              handlePurchaseShow(show.id);
                            }
                          }}
                          disabled={show.availableSeats <= 0 && !purchasedShowIds.includes(show.id)}
                        >
                          {purchasedShowIds.includes(show.id)
                            ? 'Going'
                            : show.availableSeats <= 0
                            ? 'Sold out'
                            : 'Get'}
                        </button>
                      </div>
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
                    {songs.length > 0 && (
                      <div className="songs-list">
                        {songs.map((song) => {
                          const isLiked = likedSongIds.includes(song.id);
                          const averageRating = songAverages[song.id]?.average || 0;
                          const ratingCount = songAverages[song.id]?.count || 0;
                          return (
                            <div 
                              key={song.id} 
                              className={`song-item ${isLiked ? 'liked' : ''}`}
                            >
                              <div 
                                className="song-content"
                                onClick={() => handleSongClick(song.id)}
                                style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center' }}
                              >
                                <span className="song-number">{toRomanNumeral(song.trackNumber)})</span>
                                <span className="song-title">{song.title}</span>
                                <span className="song-duration">({song.duration})</span>
                                {ratingCount > 0 && (
                                  <span className="song-rating-display">
                                    ⭐ {averageRating.toFixed(1)} ({ratingCount})
                                  </span>
                                )}
                              </div>
                              {isLoggedIn && (
                                <span 
                                  className={`song-like-icon ${isLiked ? 'liked' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLikeSong(song.id);
                                  }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                  </svg>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
              <div className="merch-controls">
                <div className="search-bar-container">
                  <input
                    type="text"
                    placeholder="Search merch by name..."
                    value={merchSearchQuery}
                    onChange={(e) => setMerchSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                <div className="sort-container">
                  <label htmlFor="merch-sort" className="sort-label">Sort by:</label>
                  <select
                    id="merch-sort"
                    value={merchSortBy}
                    onChange={(e) => setMerchSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="default">Default</option>
                    <option value="price-low">Price (Low → High)</option>
                  </select>
                </div>
              </div>
              <div className="promo-code-container">
                <form onSubmit={handlePromoCodeSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Promo Code"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      setPromoCodeMessage('');
                    }}
                    className="promo-code-input"
                  />
                  <button type="submit" className="promo-code-button">
                    Apply
                  </button>
                </form>
                {promoCodeMessage && (
                  <div className={`promo-code-message ${discountApplied ? 'success' : 'error'}`}>
                    {promoCodeMessage}
                  </div>
                )}
              </div>
              <div className="merch-grid">
                {merchItems
                  .filter((item) => {
                    if (!merchSearchQuery.trim()) return true;
                    const query = merchSearchQuery.toLowerCase().trim();
                    const name = (item.name || '').toLowerCase();
                    return name.includes(query);
                  })
                  .sort((a, b) => {
                    if (merchSortBy === 'price-low') {
                      const priceA = discountApplied ? (parseFloat(a.price) || 0) * 0.9 : (parseFloat(a.price) || 0);
                      const priceB = discountApplied ? (parseFloat(b.price) || 0) * 0.9 : (parseFloat(b.price) || 0);
                      return priceA - priceB;
                    }
                    return 0; // Default order
                  })
                  .map((item) => {
                    // Determine icon based on type or name
                    let icon = '👕'; // default
                    if (item.type === 'shirt' || (!item.type && item.name.toLowerCase().includes('shirt'))) {
                      icon = '👕';
                    } else if (item.type === 'vinyl' || (!item.type && (item.name.toLowerCase().includes('vinyl') || item.name.toLowerCase().includes('amao')))) {
                      icon = '💿';
                    } else if (item.type === 'guitar' || (!item.type && (item.name.toLowerCase().includes('guitar') || item.name.toLowerCase().includes('fender') || item.name.toLowerCase().includes('gibson')))) {
                      icon = '🎸';
                    }
                    
                    const isInWishlist = wishlistMerchIds.includes(item.id);
                    const isPurchased = purchasedMerchIds.includes(item.id);
                    
                    return (
                      <div key={item.id} className={`merch-item ${isPurchased ? 'purchased' : ''}`}>
                        {isLoggedIn && (
                          <span
                            className={`wishlist-star ${isInWishlist ? 'filled' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWishlist(item.id);
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill={isInWishlist ? "#3F829D" : "none"} stroke="#3F829D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                          </span>
                        )}
                        <div className="merch-icon">{icon}</div>
                        <div className="merch-name">{item.name}</div>
                        <div className="merch-price">
                          {discountApplied ? (
                            <>
                              <span style={{ textDecoration: 'line-through', color: 'rgba(176, 176, 176, 0.5)' }}>
                                ${parseFloat(item.price).toFixed(2)}
                              </span>
                              <span style={{ color: '#3F829D', textShadow: '0 0 15px rgba(63, 130, 157, 0.5)' }}>
                                ${(parseFloat(item.price) * 0.9).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span>${parseFloat(item.price).toFixed(2)}</span>
                          )}
                        </div>
                        <div className="merch-availability">
                          {item.availableQuantity !== undefined && item.availableQuantity !== null ? (
                            item.availableQuantity > 0 ? (
                              <span className="items-available">{item.availableQuantity} left</span>
                            ) : (
                              <span className="sold-out">Sold out</span>
                            )
                          ) : null}
                        </div>
                        {isLoggedIn && (
                          <button
                            type="button"
                            className={`merch-get-button ${
                              isPurchased ? 'arriving-soon' : ''
                            }`}
                            onClick={() => {
                              if (!isPurchased) {
                                handlePurchaseMerch(item.id);
                              }
                            }}
                            disabled={item.availableQuantity <= 0 && !isPurchased}
                          >
                            {isPurchased
                              ? 'Arriving soon'
                              : item.availableQuantity <= 0
                              ? 'Sold out'
                              : 'Get'}
                          </button>
                        )}
                      </div>
                    );
                  })}
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
              <div className="social-media-buttons">
                <a 
                  href="https://youtu.be/dQw4w9WgXcQ?si=aTecWSyUQJ0WyPXS" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="social-button youtube-button"
                >
                  YouTube
                </a>
                <a 
                  href="https://www.instagram.com/officialrickastley?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="social-button instagram-button"
                >
                  Instagram
        </a>
      </div>
            </div>
          )}
        </main>

        {/* Rating Modal */}
        {showRatingModal && selectedSong && (
          <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowRatingModal(false)}>×</button>
              <h2 className="modal-title">
                {songs.find(s => s.id === selectedSong)?.title || 'Song'}
              </h2>
              
              {songAverages[selectedSong] && songAverages[selectedSong].count > 0 && (
                <div className="average-rating-display">
                  <div className="average-rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= Math.round(songAverages[selectedSong].average) ? 'star filled' : 'star'}>
                        ⭐
                      </span>
                    ))}
                  </div>
                  <div className="average-rating-text">
                    {songAverages[selectedSong].average.toFixed(1)} out of 5 ({songAverages[selectedSong].count} {songAverages[selectedSong].count === 1 ? 'rating' : 'ratings'})
                  </div>
                </div>
              )}

              {isLoggedIn && currentUser?.id && (
                <form onSubmit={handleSubmitRating} className="rating-form">
                  <div className="rating-input-group">
                    <label>Your Rating:</label>
                    <div className="star-rating-selector">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`star-selector ${star <= userRating ? 'selected' : ''}`}
                          onClick={() => setUserRating(star)}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="comment-input-group">
                    <label>Your Comment (optional):</label>
                    <textarea
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      placeholder="Share your thoughts about this song..."
                      className="comment-textarea"
                      rows="4"
                    />
                  </div>
                  <button type="submit" className="submit-rating-btn">
                    {userRating > 0 ? 'Update Rating' : 'Submit Rating'}
        </button>
                </form>
              )}

              <div className="comments-section">
                <h3>Comments ({songRatings[selectedSong]?.length || 0})</h3>
                {songRatings[selectedSong] && songRatings[selectedSong].length > 0 ? (
                  <div className="comments-list">
                    {songRatings[selectedSong].map((rating) => (
                      <div key={rating.id} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-author">{rating.displayName || rating.email || 'Anonymous'}</span>
                          <span className="comment-rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={star <= rating.rating ? 'star filled' : 'star'}>
                                ⭐
                              </span>
                            ))}
                          </span>
                          <span className="comment-date">
                            {new Date(rating.ratedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {rating.comment && (
                          <div className="comment-text">{rating.comment}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-comments">No comments yet. Be the first to rate!</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Merch Quantity Modal */}
        {showMerchModal && selectedMerchForPurchase && (
          <div className="modal-overlay" onClick={handleCloseMerchModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={handleCloseMerchModal}>×</button>
              <h3>Select Number of Items</h3>
              <p style={{ color: '#b0b0b0', marginBottom: '1.5rem' }}>
                {selectedMerchForPurchase.name}
              </p>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', color: '#e0e0e0', fontSize: '1.1rem' }}>
                  How many items? (1-10)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem', justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMerchQuantity(num)}
                      style={{
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        borderRadius: '10px',
                        border: merchQuantity === num ? '2px solid #3F829D' : '1px solid rgba(63, 130, 157, 0.3)',
                        background: merchQuantity === num ? 'rgba(63, 130, 157, 0.2)' : 'rgba(0, 0, 0, 0.5)',
                        color: '#e0e0e0',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        minWidth: '50px'
                      }}
                    >
                      {num}
                    </button>
                  ))}
      </div>
                {selectedMerchForPurchase.availableQuantity < merchQuantity && (
                  <p style={{ color: 'rgba(255, 0, 0, 0.7)', marginTop: '1rem', textAlign: 'center' }}>
                    Only {selectedMerchForPurchase.availableQuantity} items available
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleCloseMerchModal}
                  style={{
                    padding: '0.8rem 2rem',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(63, 130, 157, 0.3)',
                    borderRadius: '10px',
                    color: '#e0e0e0',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMerchPurchase}
                  disabled={selectedMerchForPurchase.availableQuantity < merchQuantity}
                  style={{
                    padding: '0.8rem 2rem',
                    background: selectedMerchForPurchase.availableQuantity >= merchQuantity 
                      ? 'rgba(63, 130, 157, 0.3)' 
                      : 'rgba(0, 0, 0, 0.3)',
                    border: selectedMerchForPurchase.availableQuantity >= merchQuantity
                      ? '1px solid #3F829D'
                      : '1px solid rgba(255, 0, 0, 0.3)',
                    borderRadius: '10px',
                    color: selectedMerchForPurchase.availableQuantity >= merchQuantity ? '#e0e0e0' : 'rgba(255, 0, 0, 0.5)',
                    cursor: selectedMerchForPurchase.availableQuantity >= merchQuantity ? 'pointer' : 'not-allowed',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  Confirm Purchase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scroll to Top Button */}
        {showScrollToTop && (
          <button
            className="scroll-to-top-button"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6"></path>
            </svg>
          </button>
        )}

        {/* Ticket Quantity Modal */}
        {showTicketModal && selectedShowForPurchase && (
          <div className="modal-overlay" onClick={handleCloseTicketModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={handleCloseTicketModal}>×</button>
              <h3>Select Number of Tickets</h3>
              <p style={{ color: '#b0b0b0', marginBottom: '1.5rem' }}>
                {selectedShowForPurchase.city} — {selectedShowForPurchase.venue || 'Venue'}
              </p>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', color: '#e0e0e0', fontSize: '1.1rem' }}>
                  How many tickets? (1-4)
                </label>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTicketQuantity(num)}
                      style={{
                        padding: '1rem 1.5rem',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        borderRadius: '10px',
                        border: ticketQuantity === num ? '2px solid #3F829D' : '1px solid rgba(63, 130, 157, 0.3)',
                        background: ticketQuantity === num ? 'rgba(63, 130, 157, 0.2)' : 'rgba(0, 0, 0, 0.5)',
                        color: '#e0e0e0',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        minWidth: '60px'
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                {selectedShowForPurchase.availableSeats < ticketQuantity && (
                  <p style={{ color: 'rgba(255, 0, 0, 0.7)', marginTop: '1rem', textAlign: 'center' }}>
                    Only {selectedShowForPurchase.availableSeats} seats available
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleCloseTicketModal}
                  style={{
                    padding: '0.8rem 2rem',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(63, 130, 157, 0.3)',
                    borderRadius: '10px',
                    color: '#e0e0e0',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={selectedShowForPurchase.availableSeats < ticketQuantity}
                  style={{
                    padding: '0.8rem 2rem',
                    background: selectedShowForPurchase.availableSeats >= ticketQuantity 
                      ? 'rgba(63, 130, 157, 0.3)' 
                      : 'rgba(0, 0, 0, 0.3)',
                    border: selectedShowForPurchase.availableSeats >= ticketQuantity
                      ? '1px solid #3F829D'
                      : '1px solid rgba(255, 0, 0, 0.3)',
                    borderRadius: '10px',
                    color: selectedShowForPurchase.availableSeats >= ticketQuantity ? '#e0e0e0' : 'rgba(255, 0, 0, 0.5)',
                    cursor: selectedShowForPurchase.availableSeats >= ticketQuantity ? 'pointer' : 'not-allowed',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  Confirm Purchase
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="modal-overlay" onClick={handleCloseSettingsModal}>
            <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={handleCloseSettingsModal}>×</button>
              <h2 style={{ marginBottom: '2rem', color: '#e0e0e0' }}>Settings</h2>
              
              {isLoggedIn && (
                <div className="settings-section">
                  <div className="settings-item">
                    <label style={{ color: '#b0b0b0', fontSize: '1rem', marginBottom: '0.5rem', display: 'block' }}>
                      Theme
                    </label>
                    <div className="theme-toggle">
                      <button
                        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => handleThemeToggle('dark')}
                      >
                        Dark Mode
                      </button>
                      <button
                        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => handleThemeToggle('light')}
                      >
                        Light Mode
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isLoggedIn && (
                <div style={{ color: '#b0b0b0', textAlign: 'center', padding: '2rem' }}>
                  Please log in to access settings
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
              <h2 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Delete Account</h2>
              <p style={{ color: '#b0b0b0', marginBottom: '2rem', textAlign: 'center' }}>
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                  style={{ flex: 1 }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
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
                <div className="password-input-wrapper">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError('');
                    }}
                    className="input-field"
                    required
                  />
                  <span 
                    className="password-toggle-icon"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    {showLoginPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </span>
                </div>
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
