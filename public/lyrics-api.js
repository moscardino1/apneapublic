
// import { config } from './config.js';
import { auth, db } from './firebase-init.js';
import jsonp from 'https://cdn.jsdelivr.net/npm/jsonp@0.2.1/+esm';



let lyricsText = {};




export async function storeLyricsAndListeningHistory(spotifyProfileId, userId, detailedHistory) {
  const config =  await fetchConfig();
const api_key = config.musixmatchApiKey;
const api_key_hf = config.hfApiKey;
 
  try {
    const userDocRef = db.collection('users').doc(userId);
    const spotifyProfilesCollectionRef = userDocRef.collection('spotifyprofiles');
    const historyCollectionRef = spotifyProfilesCollectionRef.doc(spotifyProfileId).collection('listening_history');
    const spotifyProfileDocRef = userDocRef.collection('spotifyprofiles').doc(spotifyProfileId);

    for (const item of detailedHistory) {
      const artistName = item.track.artists[0].name;
      const trackName = item.track.name;
      const timestamp = new Date(item.played_at).getTime();
      const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
      if (trackName.includes("/")) {
        console.log(`Skipping track with '/' in the name: ${artistName} - ${trackName}`);
        continue; // Skip to the next iteration of the loop
      }
      const lyricsRef = db.collection('lyrics').doc(artistName).collection('tracks').doc(trackName);
      const lyricsDoc = await lyricsRef.get();

      let lyrics = '';
      let emotionResultLabel = null;
      let emotionResultScore = null;
      let sentimentResultLabel = null;
      let sentimentResultScore = null;

      if (lyricsDoc.exists) {
        const data = lyricsDoc.data();
        lyrics = data.lyrics;
        emotionResultLabel = data.emotionResultLabel;
        emotionResultScore = data.emotionResultScore;
        sentimentResultLabel = data.sentimentResultLabel;
        sentimentResultScore = data.sentimentResultScore;

        console.log('Lyrics and analysis results found in Firestore for:', artistName, trackName);
      } else {
        console.log('Lyrics and analysis results not found, fetching from sources:', artistName, trackName);
        lyrics = await getLyrics(artistName, trackName,api_key);

        if (lyrics) {
          // Perform sentiment and emotion analysis
      // Perform sentiment and emotion analysis
const sentimentResult = await analyzeSentiment(lyrics,api_key_hf).catch(error => {
  console.error('Error in sentiment analysis:', error);
  return { label: null, score: null };
});

const emotionResult = await analyzeEmotion(lyrics,api_key_hf).catch(error => {
  console.error('Error in emotion analysis:', error);
  return { label: null, score: null };
});

// Reassigning variables with the extracted values
const extractedSentiment = {
  label: sentimentResult[0][0].label,
  score: sentimentResult[0][0].score,
};

const extractedEmotion = {
  label: emotionResult[0][0].label,
  score: emotionResult[0][0].score,
};

 emotionResultLabel= extractedEmotion.label;
 emotionResultScore= extractedEmotion.score;
 sentimentResultLabel= extractedSentiment.label;
sentimentResultScore= extractedSentiment.score;

// Store lyrics and analysis results in Firestore
await lyricsRef.set({
  artist: artistName,
  track: trackName,
  lyrics: lyrics,
  emotionResultLabel: extractedEmotion.label,
  emotionResultScore: extractedEmotion.score,
  sentimentResultLabel: extractedSentiment.label,
  sentimentResultScore: extractedSentiment.score,
});

          // // Append lyrics to allLyrics variable
          // const cleanedLyrics = lyrics ? lyrics.replace(/(Lyrics not found|This Lyrics is NOT for Commercial use |(1409623988467))/g, ' ').trim() : ' ';

          // const existingDoc = await spotifyProfileDocRef.collection('lyrics').doc('allLyrics').get();

          // if (existingDoc.exists) {
          //   await spotifyProfileDocRef.collection('lyrics').doc('allLyrics').update({
          //     allLyrics: existingDoc.data().allLyrics + '\n' + cleanedLyrics,
          //   });
          // } else {
          //   await spotifyProfileDocRef.collection('lyrics').doc('allLyrics').set({
          //     allLyrics: cleanedLyrics,
          //   });
          // }
  // Append lyrics to allLyrics variable
 
          console.log('Storing lyrics and analysis results in Firestore for:', artistName, trackName);
        } else {
        await lyricsRef.set({
          artist: artistName,
          track: trackName,
          lyrics: null,
          emotionResultLabel: null,
          emotionResultScore: null,
          sentimentResultLabel: null,
          sentimentResultScore: null,
        });}
      }
      const cleanedLyrics = lyrics ? lyrics.replace(/(Lyrics not found|This Lyrics is NOT for Commercial use |(1409623988467))/g, ' ').trim() : ' ';


        // Append lyrics to allLyrics variable

          const existingDoc = await spotifyProfileDocRef.collection('lyrics').doc('allLyrics').get();

          if (existingDoc.exists) {
            await spotifyProfileDocRef.collection('lyrics').doc('allLyrics').update({
              allLyrics: existingDoc.data().allLyrics + '\n' + cleanedLyrics,
            });
          } else {
            await spotifyProfileDocRef.collection('lyrics').doc('allLyrics').set({
              allLyrics: cleanedLyrics,
            });
          }

      // Store listening history in Firestore
      const docRef = historyCollectionRef.doc(timestamp.toString());
      await docRef.set({
        trackName: item.track.name,
        artistName: item.track.artists[0].name,
        albumName: item.track.album.name,
        timestamp: timestamp,
        albumImage: item.track.album.images[0].url,
        addedAt: serverTimestamp,
        emotionResultLabel: emotionResultLabel,
        emotionResultScore: emotionResultScore,
        sentimentResultLabel: sentimentResultLabel,
        sentimentResultScore: sentimentResultScore,
      }, { merge: true });
    }

    console.log('Lyrics and listening history stored in Firestore.');
  } catch (error) {
    console.error('Error storing lyrics and listening history in Firestore:', error);
    throw error;
  }
}





async function analyzeSentiment(sentence,api_key_hf) {
  const sentimentResponse = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${api_key_hf}`,
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify({
      inputs: sentence,
    }),
  });

  return await sentimentResponse.json();
}

async function analyzeEmotion(sentence,api_key_hf) {
  const emotionResponse = await fetch('https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${api_key_hf}`,
      'Content-Type': 'application/json', 
    },
    body: JSON.stringify({
      inputs: sentence,
    }),
  });

  return await emotionResponse.json();
}



export function getLyrics(artist_name, track_name,api_key) {
  return new Promise((resolve, reject) => {
    const search_endpoint = "https://api.musixmatch.com/ws/1.1/track.search";
    const search_params = new URLSearchParams({
      apikey: api_key,
      q_track: track_name,
      q_artist: artist_name,
      format: 'jsonp',
      callback: 'processSearchData',
    });
    const script = document.createElement('script');
    script.src = `${search_endpoint}?${search_params.toString()}`;

    script.onload = () => {
      document.head.removeChild(script); // Clean up by removing the script element
    };

    window.processSearchData = (search_data) => {
      try {
        if (
          search_data &&
          search_data.message &&
          search_data.message.body &&
          search_data.message.body.track_list &&
          search_data.message.body.track_list.length > 0
        ) {
          const track_id = search_data.message.body.track_list[0].track.track_id;
          const lyrics_endpoint = "https://api.musixmatch.com/ws/1.1/track.lyrics.get";
          const lyrics_params = new URLSearchParams({
            apikey: api_key,
            track_id: track_id,
            format: 'jsonp',
            callback: 'processLyricsData',
          });

          const lyricsScript = document.createElement('script');
          lyricsScript.src = `${lyrics_endpoint}?${lyrics_params.toString()}`;

          lyricsScript.onload = () => {
            document.head.removeChild(lyricsScript); // Clean up by removing the lyrics script element
          };

          window.processLyricsData = (lyrics_data) => {
            try {
              console.log('Musixmatch API response:', lyrics_data); // Log the entire API response

              if (
                lyrics_data &&
                lyrics_data.message &&
                lyrics_data.message.body &&
                lyrics_data.message.body.lyrics &&
                lyrics_data.message.body.lyrics.lyrics_body
              ) {
                const lyrics1 = lyrics_data.message.body.lyrics.lyrics_body;
                const lyrics = lyrics1 ? lyrics1.replace(/(Lyrics not found|This Lyrics is NOT for Commercial use |(1409623988467))/g, ' ' ).trim() : ' ';

                resolve(lyrics); // Resolve with the lyrics data
              } else {
                console.log('Error processing lyrics data: Lyrics not found');
                resolve(''); // Reject when lyrics are not found
              }
            } catch (error) {
              console.error('Error processing lyrics data:', error);
              reject('Error processing lyrics data'); // Reject in case of an error
            }
          };

          document.head.appendChild(lyricsScript); // Append the lyrics script to the document head
        } else {
          console.log('Error in Musixmatch API response: No track found');
          resolve(''); // Reject when no track is found
        }
      } catch (error) {
        console.error('Error in Musixmatch API response:', error);
        reject('Error in Musixmatch API response'); // Reject in case of an error
      }
    };

    document.head.appendChild(script); // Append the script to the document head
  });
} 

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