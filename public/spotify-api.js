// import { config } from './config.js';
import { storeLyricsAndListeningHistory} from './lyrics-api.js';
import { generateWordCloud, displayStatistics,createSentimentChart,createTimeChart2,createEmotionsChart,renderListeningHistory,createArtistBarChart,createTimeChart} from './ui.js';
import { auth, db } from './firebase-init.js';
import "https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.0.1/wordcloud2.js";
import "https://cdn.jsdelivr.net/gh/holtzy/D3-graph-gallery@master/LIB/d3.layout.cloud.js"
import "https://cdnjs.cloudflare.com/ajax/libs/axios/1.2.1/axios.min.js"
// http://localhost:5002
// https://apnea-test.web.app
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

let authorized = false;
let userId;


firebase.auth().onAuthStateChanged(async (user) => {
  
  if (user) {
    // User is signed in
    userId = user.uid;
    // console.log('User is signed in. User ID:', userId);

// Function to check if the user exists in Firestore and update if needed
  const userRef = db.collection('users').doc(user.uid);

  try {
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // User exists in Firestore, update information if needed
      const userData = userDoc.data();
      if (userData.email !== user.email) {
        await userRef.update({
          email: user.email,
        });
        console.log('User email updated in Firestore.');
      } else {
        console.log('User information in Firestore is up to date.');
      }
    } else {
      // User doesn't exist, create a new document
      await userRef.set({
        uid: user.uid,
        email: user.email,
      });
      console.log('User added to Firestore.');
    }
    
    // Redirect to your app's page
  } catch (error) {
    console.error('Error checking/updating user in Firestore:', error);
    showError('Error checking/updating user in Firestore.');
  }


    // You can use userId here or pass it to another function
    // For example: someFunction(userId);
  } else {
    // User is signed out
    userId = null;
    console.log('User is signed out.');
  }
});
// ------------------------------------------- Spotify API -------------------------------

export async function getAccessToken(clientId, params) {
  try {
    const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    console.log("Token Exchange Result:", result);

    if (result.ok) {
      const { access_token } = await result.json();
      return access_token;
      // console.log(access_token);

    } else {
      throw new Error(`Error getting access token: ${result.statusText}`);
    }
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    throw error;
  }
}

async function fetchProfile(token) {
  try {
    const result = await fetch("https://api.spotify.com/v1/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Spotify API Response:", result);

    if (result.ok) {
      const profile = await result.json();

      return {
        spotifyProfileId: profile.id,
        profile: profile,

      };
      
    } else {
      throw new Error(`Error fetching profile: ${result.statusText}`);
    }
  } catch (error) {
    console.error('Error in fetchProfile:', error);
    throw error;
  }
}
async function fetchHistory(token, spotifyProfileId, userId) {
  try {
    const result = await fetch("https://api.spotify.com/v1/me/player/recently-played", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.ok) {
      const history = await result.json();
      const detailedHistory = await Promise.all(
        history.items.map(async (item) => {
          const trackDetails = await fetchTrackDetails(token, item.track.id);
          return {
            ...item,
            track: {
              ...item.track,
              album: trackDetails.album,
            },
          };
        })
      );

      // Call the unified function to store lyrics and listening history
      await storeLyricsAndListeningHistory(spotifyProfileId, userId, detailedHistory);

      return { items: detailedHistory };
    } else {
      throw new Error(`Error fetching history: ${result.statusText}`);
    }
  } catch (error) {
    console.error('Error in fetchHistory:', error);
    throw error;
  }
}

async function fetchTrackDetails(token, trackId) {
  try {
    const result = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.ok) {
      const trackDetails = await result.json();
      return { album: trackDetails.album };
    } else {
      throw new Error(`Error fetching track details: ${result.statusText}`);
    }
  } catch (error) {
    console.error('Error in fetchTrackDetails:', error);
    throw error;
  }
}


function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZoneName: 'short'
  });

  return dateFormatter.format(date);
}

// --------------------------------------------- Firebase Database --------------------------------  

// 1)--storeUserInfoInFirestore: Stores user information, such as display name and email, in Firestore.
async function storeUserInfoInFirestore(userId, spotifyProfileId, profile,accessToken, verifier) {
  try {
    // Reference to the user's document in Firestore
  
        // User is signed in
        const userDocRef = db.collection('users').doc(userId);    
        // Reference to the document under the "spotifyprofiles" collection with Spotify profile ID
        const spotifyProfileDocRef = userDocRef.collection('spotifyprofiles').doc(spotifyProfileId);
        const profileImageUrl = profile.images[0]?.url || ''; // Provide a default value if 'url' is undefined

        await spotifyProfileDocRef.set({
          display_name: profile.display_name,
          email: profile.email, 
          // access_token: accessToken,
          // verifier: verifier,
          profile_photo_url: profileImageUrl, // Add the profile photo URL

        }, { merge: true });
    console.log('User info stored in Firestore for Spotify profile:', spotifyProfileId);
  } catch (error) {
    console.error('Error storing user info in Firestore:', error);
    throw error;
  }
}
// ... (previous code)

// ... (rest of the code)


// Function to fetch profile and listening history from Firestore
export async function fetchProfileAndHistory(userId) {
  try {
    const userDocRef = db.collection('users').doc(userId);
    const spotifyProfilesCollectionRef = userDocRef.collection('spotifyprofiles');
    const snapshot = await spotifyProfilesCollectionRef.limit(1).get();
    if (snapshot.empty) {
      console.error('No Spotify profiles found for the user.');
      return;
    }

    const spotifyProfileDocRef = snapshot.docs[0].ref;

// Fetch profile
const profileSnapshot = await spotifyProfileDocRef.get();
const profileData = profileSnapshot.data();

if (!profileData) {
  console.error('No profile data found for the user.');
  return;
}


    // Fetch listening history
    const historyCollectionRef = spotifyProfileDocRef.collection('listening_history');
    const historySnapshot = await historyCollectionRef.get();
    const historyData = [];

    historySnapshot.forEach((doc) => {
      historyData.push(doc.data());
    });

    return { profile: profileData, history: { items: historyData } };
  } catch (error) {
    console.error('Error fetching profile and history:', error);
    throw error;
  }
}


// --------------------------------------------- User Interface (UI) --------------------------------

// --setUIForAuthorized: Sets the UI to reflect an authorized state.
function setUIForAuthorized() {
  authorized = true;
  document.getElementById("RefreshButton").innerText = "Refresh again";
  window.location.href = 'index.html';

}
// --setUIForUnauthorized: Sets the UI to reflect an unauthorized state.
function setUIForUnauthorized() {
  authorized = false;
  document.getElementById("RefreshButton").innerText = "Refresh Spotify";
}
// --clearUserInfo: Clears user-related information from the UI.
function clearUserInfo() {
  console.log("Clearing user info...");
  const displayNameElement = document.getElementById("user-image");
  const avatarElement = document.getElementById("user-info");

}
// --clearListeningHistory: Clears the displayed listening history from the UI.
 function clearListeningHistory() {
 
}
 
// --populateUI: Populates the UI with user and listening history information.
function populateUI(profile
   ) {
  
  // Display user info
  if (profile.profile_photo_url) {
    document.querySelector(".user-image").src = profile.profile_photo_url;
  } else {
    // Handle the case where images are not available
    // You might set a default image or skip displaying the image
    console.warn('Profile images not available.');
  }
  document.querySelector(".user-name").innerText = profile.display_name;
 
}

async function updateUI() {
  try {
        const { profile, history } = await fetchProfileAndHistory(userId);
    // Populate UI with existing data first
    populateUI(profile);
    // console.log(history);
    const listeningHistory = history.items || [];
    // Call the function to generate and display the word cloud
generateWordCloud(userId);
// Call the function to display statistics
displayStatistics(listeningHistory);
// Call the function to create doughnut chart for artist sentiment
createSentimentChart(listeningHistory);
createTimeChart2(listeningHistory);
// // Call the function to create bar chart for top emotions count
createEmotionsChart(listeningHistory);
// // Call the function to render the listening history
renderListeningHistory(listeningHistory);
// // Call the function to create bar chart for the count of tracks per artist
createArtistBarChart(listeningHistory);
// // Call the function to create time chart for tracks added over time
createTimeChart(listeningHistory);
   } catch (error) {
    console.error('Error updating UI:', error);
  }
}
 


// --------------------------------------------- Authentication --------------------------------


// --handleRefreshButtonClick: Handles the click event of the authorization button.
function handleRefreshButtonClick() {
  console.log("Button clicked!");

  if (!authorized) {
    if (!code) {
      redirectToAuthCodeFlow();
    } 
  } 
  console.log("Code:", code);
  console.log("Authorized:", authorized);
}

document.getElementById("RefreshButton").addEventListener("click", handleRefreshButtonClick);



// --redirectToAuthCodeFlow: Redirects the user to Spotify for authorization.
export async function redirectToAuthCodeFlow() {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);
const config =  await fetchConfig();
const baseURL = config.baseURL;
const clientId = config.clientId;
const api_key = config.musixmatchApiKey;
const api_key_hf = config.hfApiKey;
 
  localStorage.setItem("verifier", verifier);
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", `${baseURL}/callback`);
  params.append("scope", "user-read-private user-read-email user-read-recently-played");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  // Redirect to the Spotify authorization URL
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// --handleAuthorizationCode: Handles the authorization code returned from Spotify, fetches user data, and-- updates UI.
async function handleAuthorizationCode() {
  const verifier = localStorage.getItem('verifier');
  const authorizationCode = params.get('code');
const config =  await fetchConfig();
const baseURL = config.baseURL;
const clientId = config.clientId;
const api_key = config.musixmatchApiKey;
const api_key_hf = config.hfApiKey;
 
  try {
   
    if (authorizationCode) {

      // Create a new URLSearchParams object
      const tokenParams = new URLSearchParams();
      // Add necessary parameters
      tokenParams.append('client_id', clientId);
      tokenParams.append('grant_type', 'authorization_code');
      tokenParams.append('code', authorizationCode);
      tokenParams.append('redirect_uri', `${baseURL}/callback`);
      tokenParams.append('code_verifier', verifier);

        // Get the access token first
        const accessToken = await getAccessToken(clientId, tokenParams);

        // Fetch the profile using the obtained access token
        const { spotifyProfileId, profile } = await fetchProfile(accessToken);
  
        // Store user information in Firestore
        await storeUserInfoInFirestore(userId, spotifyProfileId, profile, accessToken, verifier);
  
        const history = await fetchHistory(accessToken, spotifyProfileId, userId,);

        setUIForAuthorized();

    }
  } catch (error) {
    console.error('Error handling authorization code:', error);
  }
}


// --handleLogoff: Clears user data, UI, and redirects to the login page.

function handleLogoff() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("expires_at");
  localStorage.removeItem("verifier");
  localStorage.removeItem("UserId"); // Clear user information
  clearUserInfo();
  clearListeningHistory();
  setUIForUnauthorized();

  // Redirect to the login page
  window.location.href = 'login.html';
}
document.getElementById("logoffButton").addEventListener("click", handleLogoff);



// --------------------------------------------- Utility --------------------------------

// --isTokenExpired: Checks if the access token has expired.
function isTokenExpired(expiresAt) {
  const currentTime = new Date().getTime();
  return currentTime > expiresAt;
}
// --generateCodeVerifier: Generates a random code verifier for OAuth 2.0 authorization.
function generateCodeVerifier(length) {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
// --generateCodeChallenge: Generates a code challenge for the authorization flow.
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
// --------------------------------------------- Utility for LocalStorage----------

// --Functions related to managing data in the local storage.


// Function to fetch config
export async function fetchConfig() {
  try {
    const docRef = db.collection('config').doc('your-document-id');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return docSnap.data();
    } else {
      console.error('Config document does not exist');
      return null;
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    return null;
  }
}
document.addEventListener("DOMContentLoaded", function () {
 
  // Check if there is an authorization code in the URL
  const params = new URLSearchParams(window.location.search);
  const authorizationCode = params.get("code");

  if (authorizationCode) {
    // If there is an authorization code, handle it immediately
    handleAuthorizationCode();
  } 
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      // User is signed in
      userId = user.uid;
      // console.log('User is signed in. User ID:', userId);
      updateUI();
const config =  await fetchConfig();
const baseURL = config.baseURL;
const clientId = config.clientId;
const api_key = config.musixmatchApiKey;
const api_key_hf = config.hfApiKey;
 
    } else {
      // User is signed out
      userId = null;
      console.log('User is signed out.');
    }
  });
  
  // In spotify_script.js
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
 
      window.location.href = 'login.html';
    }
  });
});

