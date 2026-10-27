require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');
const { fetchYoutubeTranscript, extractYoutubeId } = require('../services/transcriptService');

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB!");

    const lessons = await mongoose.connection.collection('lessons').find({
      youtubeId: { $exists: true, $ne: '' }
    }).toArray();

    console.log(`Found ${lessons.length} lessons with YouTube IDs. Starting auto-sync...`);

    let done = 0;
    let fail = 0;

    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      const yId = l.youtubeId || extractYoutubeId(l.youtubeUrl);
      if (!yId) continue;

      try {
        const res = await fetchYoutubeTranscript(yId);
        if (res.ok && res.transcript) {
          await mongoose.connection.collection('lessons').updateOne(
            { _id: l._id },
            {
              $set: {
                transcript: res.transcript,
                transcriptStatus: 'ready',
                transcriptUpdatedAt: new Date()
              }
            }
          );
          done++;
        } else {
          fail++;
        }
      } catch (e) {
        fail++;
      }

      if ((i + 1) % 10 === 0 || i === lessons.length - 1) {
        console.log(`Progress: ${i + 1}/${lessons.length} (Synced: ${done}, No Captions: ${fail})`);
      }

      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`FINISHED BATCH SYNC! Total successfully synced: ${done}, No-captions: ${fail}`);
    process.exit(0);
  } catch (err) {
    console.error("Sync error:", err.message);
    process.exit(1);
  }
}

run();
