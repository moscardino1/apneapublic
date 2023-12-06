
import { stopWords } from './stopwords.js';


// export async function to render the listening history on the page
export async function renderListeningHistory(listeningHistory) {
  const container = document.getElementById('right-section');
  
  // Sort the listening history by timestamp in descending order
  const sortedHistory = listeningHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Select the last 20 elements of the sorted array
  const last20Tracks = sortedHistory.slice(0, 20);

  // Iterate over the last 20 tracks
  last20Tracks.forEach(track => {
      const card = createCard(track);
      container.appendChild(card);
  });
}

  // export async function to adjust sentiment scores based on the sentiment label
function adjustSentiment(score, label) {
    // Change the sign for negative sentiment labels
    return label === 'NEGATIVE' ? -score : score;
  }
  // export async function to generate a random color (for demonstration purposes)
function getRandomColor() {
    return `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.2)`;
}

  
  function createProgressBar(percentage) {
    const progressBarContainer = document.createElement('div');
    progressBarContainer.classList.add('progress-bar');
  
    const progressBarInner = document.createElement('div');
    progressBarInner.classList.add('progress-bar-inner');
    progressBarInner.style.width = `${Math.abs(percentage)}%`; // Ensure the width is positive
  
    progressBarContainer.appendChild(progressBarInner);
  
    return progressBarContainer;
  }


 
// Function to create a card for each track in the listening history
function createCard(track) {
const card = document.createElement('div');
card.classList.add('card');

const image = document.createElement('img');
image.src = track.albumImage;
card.appendChild(image);

const info = document.createElement('div');
info.classList.add('info');

const trackName = document.createElement('h3');
trackName.textContent = track.trackName;
info.appendChild(trackName);

const artistName = document.createElement('p');
artistName.textContent = track.artistName;
info.appendChild(artistName);

const albumName = document.createElement('p');
albumName.textContent = track.albumName;
info.appendChild(albumName);

const sentimentLabel = document.createElement('p');
sentimentLabel.classList.add('sentiment');
sentimentLabel.textContent = `Sentiment: ${track.sentimentResultLabel || 'N/A'}`;
info.appendChild(sentimentLabel);

const emotionLabel = document.createElement('p');
emotionLabel.classList.add('emotion');
emotionLabel.textContent = `Emotion: ${track.emotionResultLabel || 'N/A'}`;
info.appendChild(emotionLabel);

const timestamp = document.createElement('p');
timestamp.classList.add('timestamp');
timestamp.textContent = `On: ${moment(track.timestamp).format('MMM D, YYYY h:mm:ss A')}`;
info.appendChild(timestamp);

card.appendChild(info);
 
return card;
}


// export async function to calculate and display statistics
export async function displayStatistics(listeningHistory) {
    const container = document.getElementById('left-section');
  
    const statisticsContainer = document.createElement('div');
    statisticsContainer.classList.add('statistics');
    const title = document.createElement('h2');
    title.textContent = `General Statistics`;
    statisticsContainer.appendChild(title);
    // console.log(listeningHistory);
    // Total number of tracks
    const totalTracks = listeningHistory.length;
    const totalTracksElement = document.createElement('p');
    totalTracksElement.textContent = `Total Tracks: ${totalTracks}`;
    statisticsContainer.appendChild(totalTracksElement);
    // Most listened artist
    const artistCounts = {};
    listeningHistory.forEach(track => {
      artistCounts[track.artistName] = (artistCounts[track.artistName] || 0) + 1;
    });
    const mostListenedArtist = Object.keys(artistCounts).reduce((a, b) => artistCounts[a] > artistCounts[b] ? a : b);
    const mostListenedArtistElement = document.createElement('p');
    mostListenedArtistElement.textContent = `Most Listened Artist: ${mostListenedArtist}`;
    statisticsContainer.appendChild(mostListenedArtistElement);
  
     // Overall sentiment and emotion averages
     const totalSentiment = listeningHistory.reduce((sum, track) => sum + adjustSentiment(track.sentimentResultScore, track.sentimentResultLabel), 0);
     const averageSentiment = totalSentiment / totalTracks;
     const totalEmotion = listeningHistory.reduce((sum, track) => sum + (track.emotionResultScore || 0), 0);
     const averageEmotion = totalEmotion / totalTracks;
 
     const averageSentimentElement = document.createElement('p');
     averageSentimentElement.textContent = `Average Sentiment: ${averageSentiment.toFixed(2)}`;
     statisticsContainer.appendChild(averageSentimentElement);
 
     const averageEmotionElement = document.createElement('p');
     averageEmotionElement.textContent = `Average Emotion: ${averageEmotion.toFixed(2)}`;
     statisticsContainer.appendChild(averageEmotionElement);
 
     // Progress bars for sentiment and emotion
     const sentimentProgressBar = createProgressBar(averageSentiment * 100);
     const emotionProgressBar = createProgressBar(averageEmotion * 100);
     statisticsContainer.appendChild(sentimentProgressBar);
     statisticsContainer.appendChild(emotionProgressBar);
 
     container.appendChild(statisticsContainer);
 }
 

export async function createArtistBarChart(listeningHistory) {
    const container = document.getElementById('left-section');

    // Create a map to store the count of tracks per artist and emotion
    const artistEmotionCounts = {};

    // Iterate through the listening history
    listeningHistory.forEach(track => {
        const artistName = track.artistName;
        const emotionLabel = track.emotionResultLabel;

        // Initialize the count if the artist is not in the map
        if (!artistEmotionCounts[artistName]) {
            artistEmotionCounts[artistName] = {};
        }

        // Increment the count for the specific emotion label
        if (artistEmotionCounts[artistName][emotionLabel]) {
            artistEmotionCounts[artistName][emotionLabel]++;
        } else {
            artistEmotionCounts[artistName][emotionLabel] = 1;
        }
    });

    // Extract unique emotion labels
    const emotionLabels = Array.from(new Set(listeningHistory.map(track => track.emotionResultLabel)));

    // Prepare data for each emotion label
    const datasets = emotionLabels.map(emotionLabel => {
        return {
            label: emotionLabel || 'N/A',
            data: Object.keys(artistEmotionCounts).map(artistName => artistEmotionCounts[artistName][emotionLabel] || 0),
            backgroundColor: getRandomColor(), // You can replace this with a color mapping based on emotions
            borderColor: getRandomColor(),
            borderWidth: 1
        };
    });
    const title = document.createElement('h2');
    title.textContent = `Artists Emotions`;
    container.appendChild(title);
    const chartContainer = document.createElement('canvas');
    chartContainer.id = 'artistBarChart';
    container.appendChild(chartContainer);

    const ctx = document.getElementById('artistBarChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(artistEmotionCounts),
            datasets: datasets
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true
                },
                x: {
                    stacked: true
                }
            }
        }
    });
}



// Update the createTimeChart export async function to use moment for date formatting
export async function createTimeChart(listeningHistory) {
  // const container = document.body;
  const container = document.getElementById('left-section');

  const timestamps = listeningHistory.map(track => moment(track.timestamp));
  const dates = timestamps.map(date => date.format('MM/DD/YYYY')); // Use moment for formatting
  const trackCountPerDate = dates.reduce((countMap, date) => {
      countMap[date] = (countMap[date] || 0) + 1;
      return countMap;
  }, {});

  const labels = Object.keys(trackCountPerDate);
  const data = Object.values(trackCountPerDate);
  const title = document.createElement('h2');
  title.textContent = `Tracks Listened Over Time`;
  container.appendChild(title);
  const chartContainer = document.createElement('canvas');
  chartContainer.id = 'timeChart';
  container.appendChild(chartContainer);

  const ctx = document.getElementById('timeChart').getContext('2d');
  new Chart(ctx, {
      type: 'line',
      data: {
          labels: labels,
          datasets: [{
              label: 'Tracks Added Over Time',
              data: data,
              fill: false,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
          }]
      },
      options: {
          scales: {
              x: {
                  type: 'time',
                  time: {
                      unit: 'day',
                      parser: 'MM/DD/YYYY', // Use moment for parsing
                      tooltipFormat: 'll', // Use moment for formatting in tooltips
                  }
              },
              y: {
                  beginAtZero: true
              }
          }
      }
  });
}
export async function createSentimentChart(listeningHistory) {
  // const container = document.body;
  const container = document.getElementById('left-section');

  const sentimentData = listeningHistory.reduce((sentimentMap, track) => {
      sentimentMap[track.sentimentResultLabel] = (sentimentMap[track.sentimentResultLabel] || 0) + 1;
      return sentimentMap;
  }, {});

  const labels = Object.keys(sentimentData);
  const data = Object.values(sentimentData);
  const title = document.createElement('h2');
  title.textContent = `Sentiment`;
  container.appendChild(title);
  const chartContainer = document.createElement('canvas');
  chartContainer.id = 'sentimentChart';
  container.appendChild(chartContainer);

  const ctx = document.getElementById('sentimentChart').getContext('2d');
  new Chart(ctx, {
      type: 'doughnut',
      data: {
          labels: labels,
          datasets: [{
              data: data,
              backgroundColor: ['rgb(255, 99, 132)', 'rgb(75, 192, 192)', 'rgb(255, 205, 86)'],
          }]
      },
      options: {
          responsive: true,
          plugins: {
              legend: {
                  position: 'top',
              },
          },
      }
  });
}



export async function createEmotionsChart(listeningHistory) {
    const container = document.getElementById('left-section');
  
    const emotionsData = listeningHistory.reduce((emotionMap, track) => {
      if (track.emotionResultLabel) {
        if (!emotionMap[track.emotionResultLabel]) {
          emotionMap[track.emotionResultLabel] = {};
        }
        emotionMap[track.emotionResultLabel][track.sentimentResultLabel] = (emotionMap[track.emotionResultLabel][track.sentimentResultLabel] || 0) + 1;
      }
      return emotionMap;
    }, {});
  
    const emotionLabels = Array.from(new Set(listeningHistory.map(track => track.emotionResultLabel)));
    const sentimentLabels = Array.from(new Set(listeningHistory.map(track => track.sentimentResultLabel)));
  
    const datasets = sentimentLabels.map(sentimentLabel => {
      const data = emotionLabels.map(emotionLabel => emotionsData[emotionLabel]?.[sentimentLabel] || 0);
      const backgroundColor = getRandomColor(); // You can replace this with a color mapping based on sentiments
      const borderColor = getRandomColor();
      return {
        label: sentimentLabel || 'N/A',
        data: data,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        borderWidth: 1,
        stack: 'emotionStack', // Assign a common stack name for sentiments within each emotion
      };
    });
    const title = document.createElement('h2');
    title.textContent = `Emotions Chart`;
    container.appendChild(title);
    const chartContainer = document.createElement('canvas');
    chartContainer.id = 'emotionsChart';
    container.appendChild(chartContainer);
  
    const ctx = document.getElementById('emotionsChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: emotionLabels,
        datasets: datasets,
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            stacked: true,
          },
          x: {
            stacked: true,
          },
        },
      },
    });
  }
  



export async function createTimeChart2(listeningHistory) {
    const container = document.getElementById('left-section');
  
    // Extract timestamps and sentiment scores from the listening history
    const dataPoints = listeningHistory.map(track => ({
      timestamp: moment(track.timestamp),
      sentiment: adjustSentiment(track.sentimentResultScore, track.sentimentResultLabel),
    }));
  
    // Group dataPoints by date and calculate average sentiment for each date
    const groupedData = dataPoints.reduce((grouped, dataPoint) => {
      const date = dataPoint.timestamp.format('MM/DD/YYYY');
      if (!grouped[date]) {
        grouped[date] = { totalSentiment: 0, count: 0 };
      }
      grouped[date].totalSentiment += dataPoint.sentiment;
      grouped[date].count += 1;
      return grouped;
    }, {});
  
    const labels = Object.keys(groupedData);
    const data = labels.map(date => groupedData[date].totalSentiment / groupedData[date].count);
    const title = document.createElement('h2');
    title.textContent = `Sentiment Over Time`;
    container.appendChild(title);
    const chartContainer = document.createElement('canvas');
    chartContainer.id = 'sentimentOverTimeChart';
    container.appendChild(chartContainer);
  
    const ctx = document.getElementById('sentimentOverTimeChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Sentiment Over Time',
          data: data,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              parser: 'MM/DD/YYYY',
              tooltipFormat: 'll',
            }
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  export async function generateWordCloud(userId) {
    const container = document.getElementById('left-section');
    const spotifyProfilesCollection = firebase.firestore().collection('users').doc(userId)
        .collection('spotifyprofiles');

    // Get the first document in the collection
    const querySnapshot = await spotifyProfilesCollection.limit(1).get();
    const firstDoc = querySnapshot.docs[0];

    // Reference to the 'allLyrics' document
    const lyricsDocRef = firstDoc.ref.collection('lyrics').doc('allLyrics');

    // Retrieve the 'allLyrics' data
    const doc = await lyricsDocRef.get();
    // console.log('not existing');
    // if (!doc.exists) {
    //   await lyricsDocRef.set({
    //     allLyrics: "",
    //   });
    // }

    const lyrics = doc.data().allLyrics || '';

    // Check if the container exists
    if (container) {
        const words = lyrics
            .toLowerCase()
            .replace(/[^\w\s']/g, '')
            .split(/\s+/);

        const wordFrequency = {};
        words.forEach((word) => {
            if (!stopWords.includes(word)) {
                if (wordFrequency[word]) {
                    wordFrequency[word]++;
                } else {
                    wordFrequency[word] = 1;
                }
            }
        });

        // Set a minimum frequency threshold (adjust as needed)
        const minFrequency = 10;
        const formattedArray = Object.entries(wordFrequency)
            .filter(([word, count]) => count >= minFrequency)
            .map(([word, count]) => [word, count]);

            const title = document.createElement('h2');
            title.textContent = `Wordcloud`;
            container.appendChild(title);
  const chartContainer = document.createElement('canvas');
  chartContainer.id = 'wordcloud-container';
  container.appendChild(chartContainer);
  chartContainer.style.display = 'block'; // Ensure it's a block-level element
  chartContainer.style.margin = '0 auto'; // Set marg
        // Append the container to the left-section
        // Use the same options as before
        const options = {
            list: formattedArray,
            rotateRatio: 0.5,
            rotationSteps: 2,
            backgroundColor: 'white',
            width: container.clientWidth * 0.9, // Adjusted for responsiveness
            height: container.clientHeight * 0.9, // Adjusted for responsiveness
            // weightFactor: 5,
            fontFamily: 'Arial',
            // gridSize: 10,
            // minSize: 6,
            shape: 'square',
            ellipticity: 0.6,
            shuffle: true,
            spiral: 'rectangular',
        };

        WordCloud(document.getElementById('wordcloud-container'), options);
    } else {
        console.error('Wordcloud container not found.');
    }
}
